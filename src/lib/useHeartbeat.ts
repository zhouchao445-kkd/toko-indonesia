/**
 * useHeartbeat Hook (P5-C)
 * 30s heartbeat to check backend availability
 * Triggers onDisconnect callback after 3 consecutive failures
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { adminApi } from './adminApi';

interface UseHeartbeatOptions {
  intervalMs?: number;         // Default: 30000
  failureThreshold?: number;   // Default: 3
  enabled?: boolean;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

interface UseHeartbeatReturn {
  isOnline: boolean;
  lastHeartbeat: string | null;
  failureCount: number;
  serverTime: string | null;
}

export function useHeartbeat(options: UseHeartbeatOptions = {}): UseHeartbeatReturn {
  const {
    intervalMs = 30000,
    failureThreshold = 3,
    enabled = true,
    onDisconnect,
    onReconnect,
  } = options;

  const [isOnline, setIsOnline] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);
  const [failureCount, setFailureCount] = useState(0);
  const [serverTime, setServerTime] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const wasDisconnectedRef = useRef(false);

  const check = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const data = await adminApi.get<{ server_time: string; status: string }>('/heartbeat');

      if (!mountedRef.current) return;

      setServerTime(data.server_time);
      setLastHeartbeat(new Date().toISOString());
      setFailureCount(0);
      setIsOnline(true);

      if (wasDisconnectedRef.current) {
        wasDisconnectedRef.current = false;
        onReconnect?.();
      }
    } catch {
      if (!mountedRef.current) return;

      setFailureCount(prev => {
        const next = prev + 1;
        if (next >= failureThreshold) {
          setIsOnline(false);
          if (!wasDisconnectedRef.current) {
            wasDisconnectedRef.current = true;
            onDisconnect?.();
          }
        }
        return next;
      });
    }
  }, [failureThreshold, onDisconnect, onReconnect]);

  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;

    // Initial check
    check();

    intervalRef.current = setInterval(check, intervalMs);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, check, intervalMs]);

  return {
    isOnline,
    lastHeartbeat,
    failureCount,
    serverTime,
  };
}
