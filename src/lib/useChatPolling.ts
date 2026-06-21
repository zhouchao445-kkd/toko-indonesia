/**
 * useChatPolling Hook (P5-C)
 * 5s polling for new messages with exponential backoff on failure
 * No WebSocket dependency - pure fetch-based polling
 */
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { adminApi } from './adminApi';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  type: string;
  created_at: string;
}

interface UseChatPollingOptions {
  intervalMs?: number;      // Default: 5000
  backoffMs?: number;       // Default: 10000
  failureThreshold?: number; // Default: 3
  enabled?: boolean;
}

interface UseChatPollingReturn {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  failureCount: number;
  lastPollTime: string | null;
  refresh: () => void;
}

export function useChatPolling(
  conversationId: string | null,
  options: UseChatPollingOptions = {}
): UseChatPollingReturn {
  const {
    intervalMs = 5000,
    backoffMs = 10000,
    failureThreshold = 3,
    enabled = true,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [failureCount, setFailureCount] = useState(0);
  const [lastPollTime, setLastPollTime] = useState<string | null>(null);

  const lastTimestampRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!conversationId || !mountedRef.current) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (lastTimestampRef.current) {
        params.set('since', lastTimestampRef.current);
      }
      params.set('limit', '50');

      const data = await adminApi.get<{ messages: Message[]; hasMore: boolean }>(
        `/conversations/${conversationId}/messages?${params.toString()}`
      );

      if (!mountedRef.current) return;

      if (data.messages && data.messages.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
          if (newMsgs.length === 0) return prev;
          return [...prev, ...newMsgs];
        });

        // Update last timestamp
        const lastMsg = data.messages[data.messages.length - 1];
        lastTimestampRef.current = lastMsg.created_at;
      }

      setLastPollTime(new Date().toISOString());
      setFailureCount(0);
      setIsConnected(true);
    } catch {
      if (!mountedRef.current) return;
      setFailureCount(prev => prev + 1);
      if (failureCount + 1 >= failureThreshold) {
        setIsConnected(false);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [conversationId, failureCount, failureThreshold]);

  // Setup polling interval
  useEffect(() => {
    if (!enabled || !conversationId) return;

    mountedRef.current = true;

    // Initial poll
    poll();

    // Determine interval based on connection status
    const currentInterval = failureCount >= failureThreshold ? backoffMs : intervalMs;

    intervalRef.current = setInterval(poll, currentInterval);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, conversationId, poll, intervalMs, backoffMs, failureCount, failureThreshold]);

  // Reset when conversation changes
  useEffect(() => {
    if (conversationId) {
      setMessages([]);
      lastTimestampRef.current = null;
      setFailureCount(0);
      setIsConnected(true);
    }
  }, [conversationId]);

  const refresh = useCallback(() => {
    lastTimestampRef.current = null;
    setMessages([]);
    poll();
  }, [poll]);

  return {
    messages,
    isLoading,
    isConnected,
    failureCount,
    lastPollTime,
    refresh,
  };
}
