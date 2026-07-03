'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getAccessToken } from '@/lib/auth';

type MessageHandler = (payload: Record<string, unknown>) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 25000;

export interface UseWebSocketReturn {
  wsRef: React.MutableRefObject<WebSocket | null>;
  sendMessage: (type: string, payload?: Record<string, unknown>) => void;
  isConnected: boolean;
}

export function useWebSocket(
  roomId: string | null,
  handlers: Record<string, MessageHandler>,
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const pingTimer = useRef<ReturnType<typeof setInterval>>();

  const sendMessage = useCallback((type: string, payload?: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);

      const token = getAccessToken();
      if (token) {
        ws.send(JSON.stringify({ type: 'AUTHENTICATE', payload: { token } }));
      }

      if (roomId) {
        ws.send(JSON.stringify({ type: 'JOIN_ROOM', payload: { roomId } }));
      }

      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handler = handlersRef.current[message.type];
        if (handler) {
          handler(message.payload ?? {});
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      if (pingTimer.current) {
        clearInterval(pingTimer.current);
        pingTimer.current = undefined;
      }
      reconnectTimer.current = setTimeout(() => connect(), RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [roomId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (pingTimer.current) {
        clearInterval(pingTimer.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { wsRef, sendMessage, isConnected };
}
