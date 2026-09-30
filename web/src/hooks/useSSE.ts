"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export type SSEStatus = "idle" | "connecting" | "streaming" | "reconnecting" | "done" | "failed";

export interface SSEEvent {
  type: string;
  data: unknown;
  ts: number;
}

interface SSEOptions {
  onEvent?: (type: string, data: unknown) => void;
  onDone?: () => void;
  autoConnect?: boolean;
}

const NAMED_EVENTS = ["progress", "error", "done", "stage", "counter"];
const MAX_RETRIES = 5;

export function useSSE(url: string | null, options: SSEOptions = {}) {
  const [status, setStatus] = useState<SSEStatus>("idle");
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!url) return;
    esRef.current?.close();

    setStatus("connecting");
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setStatus("streaming");
      retryCount.current = 0;
    };

    const handleData = (type: string, raw: string) => {
      try {
        const data: unknown = JSON.parse(raw);
        setEvents((prev) => [...prev, { type, data, ts: Date.now() }]);
        optionsRef.current.onEvent?.(type, data);
        if (type === "done" || (data && typeof data === "object" && (data as Record<string, unknown>).type === "done")) {
          setStatus("done");
          optionsRef.current.onDone?.();
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onmessage = (e: MessageEvent<string>) => handleData("message", e.data);

    NAMED_EVENTS.forEach((evt) => {
      es.addEventListener(evt, (e: Event) => {
        handleData(evt, (e as MessageEvent<string>).data);
      });
    });

    es.onerror = () => {
      es.close();
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        setStatus("reconnecting");
        const delay = Math.min(1000 * 2 ** retryCount.current, 15000);
        retryRef.current = setTimeout(connect, delay);
      } else {
        setStatus("failed");
      }
    };
  }, [url]);

  useEffect(() => {
    if (options.autoConnect !== false && url) {
      connect();
    }
    return () => {
      esRef.current?.close();
      if (retryRef.current) clearTimeout(retryRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const reset = useCallback(() => {
    esRef.current?.close();
    if (retryRef.current) clearTimeout(retryRef.current);
    setEvents([]);
    setStatus("idle");
    retryCount.current = 0;
  }, []);

  return { status, events, connect, reset };
}
