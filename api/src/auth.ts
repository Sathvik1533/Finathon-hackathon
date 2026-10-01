import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';

export interface AuthUser {
  userId: string;
  username: string;
  role: 'admin' | 'reviewer' | 'auditor';
  merchantId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: '24h' });
}

const revokedTokens = new Set<string>();

export function revokeToken(token: string): void {
  if (token) {
    revokedTokens.add(token);
  }
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  if (isTokenRevoked(token)) {
    res.status(401).json({ error: 'Session has been invalidated. Please log in again.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

interface ConfiguredAccount {
  usernames: string[];
  password: () => string;
  role: 'admin' | 'reviewer' | 'auditor';
  userId: string;
}

export function loginUser(username: string, password: string): { success: boolean; token?: string; user?: AuthUser; message?: string } {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, message: 'Username and password are required.' };
  }

  // Configured user accounts repository
  const operatorPassword = process.env.OPERATOR_PASSWORD || config.adminPassword || 'admin123';
  const customOperators = process.env.AUTHORIZED_OPERATORS
    ? process.env.AUTHORIZED_OPERATORS.split(',').map(s => s.trim().toLowerCase())
    : [];

  const configuredAccounts: ConfiguredAccount[] = [
    {
      usernames: ['admin', 'admin@acme.com', 'admin@ledgersense.io'],
      password: () => config.adminPassword,
      role: 'admin',
      userId: 'u_admin_001',
    },
    {
      usernames: ['reviewer', 'reviewer@acme.com'],
      password: () => process.env.REVIEWER_PASSWORD || 'reviewer123',
      role: 'reviewer',
      userId: 'u_rev_002',
    },
    {
      usernames: ['auditor', 'auditor@acme.com'],
      password: () => process.env.AUDITOR_PASSWORD || 'auditor123',
      role: 'auditor',
      userId: 'u_aud_003',
    },
    {
      usernames: [
        'nandithat3@gmail.com',
        '24r21a05hr@mlrit.ac.in',
        ...customOperators,
      ],
      password: () => operatorPassword,
      role: 'admin',
      userId: `u_op_${cleanUser.replace(/[^a-z0-9]/g, '_')}`,
    },
  ];

  // In non-production test/demo mode, allow explicit test account
  if (process.env.NODE_ENV !== 'production' || process.env.DEMO_MODE === 'true') {
    configuredAccounts.push({
      usernames: ['demo', 'demo@acme.com'],
      password: () => 'demo123',
      role: 'admin',
      userId: 'u_demo_test',
    });
  }

  const matchedAccount = configuredAccounts.find(account =>
    account.usernames.includes(cleanUser)
  );

  if (!matchedAccount) {
    return { success: false, message: 'Invalid username or password.' };
  }

  if (cleanPass !== matchedAccount.password()) {
    return { success: false, message: 'Invalid username or password.' };
  }

  const user: AuthUser = {
    userId: matchedAccount.userId,
    username: cleanUser,
    role: matchedAccount.role,
    merchantId: config.demoMerchantId,
  };

  const token = generateToken(user);
  return { success: true, token, user };
}
