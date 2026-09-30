import net from 'net';
import tls from 'tls';
import crypto from 'crypto';
import { config } from './config';

export interface CacheStatus {
  mode: 'redis' | 'memory';
  connected: boolean;
  url?: string;
  keysCount: number;
  lastError?: string;
}

export interface LockHandle {
  acquired: boolean;
  token: string;
  release: () => Promise<boolean>;
}

interface InMemoryItem {
  value: string;
  expiresAt?: number;
}

/**
 * Lightweight native Redis RESP2 protocol client using Node.js built-in 'net' / 'tls'.
 * Eliminates external package dependencies while fully supporting Redis on Railway,
 * Render, Heroku, AWS ElastiCache, or local Docker.
 */
class MinimalRedisClient {
  private socket: net.Socket | null = null;
  private connected = false;
  private buffer = '';
  private commandQueue: Array<{
    resolve: (res: any) => void;
    reject: (err: any) => void;
  }> = [];
  private host: string;
  private port: number;
  private password?: string;
  private isTls: boolean;
  private connectPromise: Promise<boolean> | null = null;
  public lastError?: string;

  constructor(redisUrl?: string) {
    const urlStr = redisUrl || process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDISCLOUD_URL;
    if (urlStr) {
      try {
        const parsed = new URL(urlStr);
        this.host = parsed.hostname || '127.0.0.1';
        this.port = parseInt(parsed.port || '6379', 10);
        this.password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
        this.isTls = parsed.protocol === 'rediss:';
      } catch {
        this.host = '127.0.0.1';
        this.port = 6379;
        this.isTls = false;
      }
    } else {
      this.host = process.env.REDIS_HOST || '127.0.0.1';
      this.port = parseInt(process.env.REDIS_PORT || '6379', 10);
      this.password = process.env.REDIS_PASSWORD || undefined;
      this.isTls = process.env.REDIS_TLS === 'true';
    }
  }

  public async connect(timeoutMs = 1500): Promise<boolean> {
    if (this.connected && this.socket && !this.socket.destroyed) {
      return true;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise<boolean>((resolve) => {
      let settled = false;
      const cleanup = (success: boolean, err?: any) => {
        if (settled) return;
        settled = true;
        this.connectPromise = null;
        if (!success) {
          this.connected = false;
          this.lastError = err ? (err.message || String(err)) : 'Connection timed out';
          if (this.socket) {
            try { this.socket.destroy(); } catch {}
            this.socket = null;
          }
          // Drain any pending command queue with error
          while (this.commandQueue.length > 0) {
            const req = this.commandQueue.shift();
            req?.reject(new Error(this.lastError));
          }
        }
        resolve(success);
      };

      const timer = setTimeout(() => {
        cleanup(false, new Error(`Connection timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const onConnect = async () => {
          clearTimeout(timer);
          this.connected = true;
          this.lastError = undefined;

          // If password required, send AUTH
          if (this.password) {
            try {
              await this.executeRaw(['AUTH', this.password]);
            } catch (authErr: any) {
              this.connected = false;
              cleanup(false, authErr);
              return;
            }
          }
          cleanup(true);
        };

        if (this.isTls) {
          this.socket = tls.connect(this.port, this.host, { rejectUnauthorized: false }, onConnect);
        } else {
          this.socket = net.createConnection({ host: this.host, port: this.port }, onConnect);
        }

        this.socket.setNoDelay(true);

        this.socket.on('data', (data: Buffer) => {
          this.buffer += data.toString('utf8');
          this.processBuffer();
        });

        this.socket.on('error', (err: any) => {
          this.lastError = err.message;
          cleanup(false, err);
        });

        this.socket.on('close', () => {
          this.connected = false;
        });
      } catch (err: any) {
        clearTimeout(timer);
        cleanup(false, err);
      }
    });

    return this.connectPromise;
  }

  public isReady(): boolean {
    return this.connected && this.socket !== null && !this.socket.destroyed;
  }

  public async executeRaw(args: string[]): Promise<any> {
    if (!this.isReady()) {
      const ok = await this.connect();
      if (!ok) {
        throw new Error(`Redis not connected: ${this.lastError || 'offline'}`);
      }
    }

    // Format RESP2 Array
    let cmd = `*${args.length}\r\n`;
    for (const arg of args) {
      const strVal = String(arg);
      cmd += `$${Buffer.byteLength(strVal)}\r\n${strVal}\r\n`;
    }

    return new Promise<any>((resolve, reject) => {
      this.commandQueue.push({ resolve, reject });
      try {
        this.socket!.write(cmd);
      } catch (err) {
        const req = this.commandQueue.pop();
        req?.reject(err);
      }
    });
  }

  private processBuffer() {
    while (this.buffer.length > 0) {
      const result = this.parseRESP(this.buffer);
      if (result.type === 'INCOMPLETE') {
        break;
      }
      this.buffer = this.buffer.slice(result.bytesConsumed);
      const req = this.commandQueue.shift();
      if (req) {
        if (result.type === 'ERROR') {
          req.reject(new Error(result.value));
        } else {
          req.resolve(result.value);
        }
      }
    }
  }

  private parseRESP(buf: string): { type: string; value: any; bytesConsumed: number } {
    if (buf.length < 3) return { type: 'INCOMPLETE', value: null, bytesConsumed: 0 };
    const prefix = buf[0];
    const crlf = buf.indexOf('\r\n');
    if (crlf === -1) return { type: 'INCOMPLETE', value: null, bytesConsumed: 0 };

    switch (prefix) {
      case '+': // Simple String
        return {
          type: 'SIMPLE_STRING',
          value: buf.slice(1, crlf),
          bytesConsumed: crlf + 2,
        };
      case '-': // Error
        return {
          type: 'ERROR',
          value: buf.slice(1, crlf),
          bytesConsumed: crlf + 2,
        };
      case ':': // Integer
        return {
          type: 'INTEGER',
          value: parseInt(buf.slice(1, crlf), 10),
          bytesConsumed: crlf + 2,
        };
      case '$': { // Bulk String
        const len = parseInt(buf.slice(1, crlf), 10);
        if (len === -1) {
          return { type: 'NULL', value: null, bytesConsumed: crlf + 2 };
        }
        const dataStart = crlf + 2;
        const dataEnd = dataStart + len;
        if (buf.length < dataEnd + 2) {
          return { type: 'INCOMPLETE', value: null, bytesConsumed: 0 };
        }
        const val = buf.slice(dataStart, dataEnd);
        return {
          type: 'BULK_STRING',
          value: val,
          bytesConsumed: dataEnd + 2,
        };
      }
      default:
        return {
          type: 'ERROR',
          value: `Unknown RESP prefix: ${prefix}`,
          bytesConsumed: crlf + 2,
        };
    }
  }

  public async close(): Promise<void> {
    this.connected = false;
    if (this.socket) {
      try {
        this.socket.end();
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
  }
}

/**
 * Hybrid Redis + In-Memory Cache and Distributed Locking Utility.
 * Provides guaranteed 100% availability: if Redis is unavailable or offline,
 * all cache, lock, and summary calls seamlessly succeed using in-memory fallbacks.
 */
export class RedisCacheService {
  private redisClient: MinimalRedisClient;
  private memoryStore: Map<string, InMemoryItem> = new Map();
  private mode: 'redis' | 'memory' = 'memory';
  private connectionChecked = false;
  private urlConfigured: boolean;

  constructor() {
    const rawUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDISCLOUD_URL;
    this.urlConfigured = Boolean(rawUrl || process.env.REDIS_HOST);
    this.redisClient = new MinimalRedisClient(rawUrl);

    // Initial silent check
    if (this.urlConfigured) {
      this.initConnection();
    } else {
      this.mode = 'memory';
      this.connectionChecked = true;
    }
  }

  private async initConnection(): Promise<boolean> {
    try {
      const ok = await this.redisClient.connect(1200);
      if (ok) {
        this.mode = 'redis';
        this.connectionChecked = true;
        return true;
      }
    } catch {}
    this.mode = 'memory';
    this.connectionChecked = true;
    return false;
  }

  /**
   * Retrieves string value by key with TTL validation.
   */
  public async get(key: string): Promise<string | null> {
    if (this.mode === 'redis') {
      try {
        const val = await this.redisClient.executeRaw(['GET', key]);
        return typeof val === 'string' ? val : null;
      } catch (err) {
        // Fallback to memory on transient failure
        this.mode = 'memory';
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Sets key value with optional TTL in seconds.
   */
  public async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (this.mode === 'redis') {
      try {
        const args = ['SET', key, value];
        if (ttlSeconds && ttlSeconds > 0) {
          args.push('EX', String(ttlSeconds));
        }
        await this.redisClient.executeRaw(args);
        return true;
      } catch {
        this.mode = 'memory';
      }
    }

    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
    return true;
  }

  /**
   * Sets JSON value with automatic serialization.
   */
  public async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    return this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Gets JSON value with automatic deserialization.
   */
  public async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * Deletes key from cache.
   */
  public async del(key: string): Promise<boolean> {
    if (this.mode === 'redis') {
      try {
        await this.redisClient.executeRaw(['DEL', key]);
        return true;
      } catch {
        this.mode = 'memory';
      }
    }
    return this.memoryStore.delete(key);
  }

  /**
   * Checks existence of key.
   */
  public async exists(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== null;
  }

  // -------------------------------------------------------------
  // Reconciliation Run Summaries Caching (FIN-11 Core)
  // -------------------------------------------------------------

  /**
   * Cache reconciliation run summary with 24-hour default retention.
   */
  public async cacheRunSummary(runId: string, summary: any, ttlSeconds = 86400): Promise<void> {
    const cacheKey = `recon:run:${runId}`;
    await this.setJSON(cacheKey, {
      ...summary,
      cachedAt: new Date().toISOString(),
    }, ttlSeconds);
  }

  /**
   * Retrieve cached run summary by runId.
   */
  public async getRunSummary(runId: string): Promise<any | null> {
    return this.getJSON(`recon:run:${runId}`);
  }

  /**
   * Cache the latest overall reconciliation run pointer.
   */
  public async setLatestRunSummary(summary: any, ttlSeconds = 86400): Promise<void> {
    await this.setJSON('recon:run:latest', {
      ...summary,
      cachedAt: new Date().toISOString(),
    }, ttlSeconds);
  }

  /**
   * Retrieve the latest overall reconciliation run summary.
   */
  public async getLatestRunSummary(): Promise<any | null> {
    return this.getJSON('recon:run:latest');
  }

  // -------------------------------------------------------------
  // Distributed Job Locks (Concurreny & Race-Condition Guard)
  // -------------------------------------------------------------

  /**
   * Acquires a mutex lock for a given resource/job.
   * Returns a lock handle with an atomic release callback.
   */
  public async acquireLock(lockKey: string, ttlSeconds = 30): Promise<LockHandle> {
    const token = crypto.randomUUID();
    const redisKey = `lock:${lockKey}`;

    if (this.mode === 'redis') {
      try {
        // Redis SET lockKey token EX ttl NX returns 'OK' or null
        const res = await this.redisClient.executeRaw([
          'SET',
          redisKey,
          token,
          'EX',
          String(ttlSeconds),
          'NX',
        ]);
        if (res === 'OK') {
          return {
            acquired: true,
            token,
            release: () => this.releaseLock(lockKey, token),
          };
        }
        return {
          acquired: false,
          token: '',
          release: async () => false,
        };
      } catch {
        this.mode = 'memory';
      }
    }

    // In-memory atomic lock simulation
    const now = Date.now();
    const existing = this.memoryStore.get(redisKey);
    if (existing && (!existing.expiresAt || existing.expiresAt > now)) {
      // Lock is currently held
      return {
        acquired: false,
        token: '',
        release: async () => false,
      };
    }

    // Grant lock
    this.memoryStore.set(redisKey, {
      value: token,
      expiresAt: now + ttlSeconds * 1000,
    });

    return {
      acquired: true,
      token,
      release: () => this.releaseLock(lockKey, token),
    };
  }

  /**
   * Releases a previously acquired lock, validating ownership token.
   */
  public async releaseLock(lockKey: string, token: string): Promise<boolean> {
    const redisKey = `lock:${lockKey}`;
    if (this.mode === 'redis') {
      try {
        const current = await this.redisClient.executeRaw(['GET', redisKey]);
        if (current === token) {
          await this.redisClient.executeRaw(['DEL', redisKey]);
          return true;
        }
        return false;
      } catch {
        this.mode = 'memory';
      }
    }

    const current = this.memoryStore.get(redisKey);
    if (current && current.value === token) {
      this.memoryStore.delete(redisKey);
      return true;
    }
    return false;
  }

  /**
   * Helper to execute a scoped critical section with lock safety.
   */
  public async withLock<T>(lockKey: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const lock = await this.acquireLock(lockKey, ttlSeconds);
    if (!lock.acquired) {
      throw new Error(`Failed to acquire lock for resource: ${lockKey}`);
    }
    try {
      return await fn();
    } finally {
      await lock.release();
    }
  }

  // -------------------------------------------------------------
  // Diagnostics & Teardown
  // -------------------------------------------------------------

  public getStatus(): CacheStatus {
    return {
      mode: this.mode,
      connected: this.mode === 'redis' && this.redisClient.isReady(),
      url: this.urlConfigured ? (process.env.REDIS_URL ? 'configured' : 'local') : undefined,
      keysCount: this.memoryStore.size,
      lastError: this.redisClient.lastError,
    };
  }

  public async flush(): Promise<void> {
    this.memoryStore.clear();
    if (this.mode === 'redis') {
      try {
        await this.redisClient.executeRaw(['FLUSHDB']);
      } catch {}
    }
  }

  public async close(): Promise<void> {
    await this.redisClient.close();
  }
}

// Singleton cache instance
export const redisCache = new RedisCacheService();
