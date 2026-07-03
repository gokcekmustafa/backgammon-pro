'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getAccessToken } from '@/lib/auth';

export interface ChatMessageData {
  id: string;
  userId: string | null;
  username: string;
  text: string;
  timestamp: number;
  roomId: string | null;
  tableId: string | null;
  isSystemMessage: boolean;
}

export interface UseChatReturn {
  messages: ChatMessageData[];
  sendMessage: (text: string) => void;
  unreadCount: number;
  isConnected: boolean;
  markAsRead: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';

export function useChat(roomId?: string, tableId?: string, username?: string): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

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
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'CHAT_MESSAGE') {
          const msg = message.payload as ChatMessageData;
          setMessages((prev) => [...prev, msg]);
          setUnreadCount((prev) => prev + 1);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(() => connect(), 3000);
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
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const displayName = username ?? 'Guest';
      wsRef.current.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          payload: {
            roomId: roomId ?? null,
            tableId: tableId ?? null,
            text,
            username: displayName,
          },
        }),
      );
    },
    [roomId, tableId, username],
  );

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { messages, sendMessage, unreadCount, isConnected, markAsRead };
}
