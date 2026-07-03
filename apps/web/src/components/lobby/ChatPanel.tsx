'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat, type ChatMessageData } from '@/hooks/useChat';

interface ChatPanelProps {
  roomId?: string;
  tableId?: string;
  username?: string;
  maxHeight?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ChatMessage({ msg }: { msg: ChatMessageData }) {
  return (
    <div
      className={`mb-2 text-xs leading-relaxed ${
        msg.isSystemMessage ? 'italic text-stone-500' : ''
      }`}
    >
      {msg.isSystemMessage ? (
        <span className="text-stone-500">{msg.text}</span>
      ) : (
        <>
          <span className={`font-semibold ${msg.userId ? 'text-amber-400' : 'text-stone-400'}`}>
            {msg.username}
          </span>
          <span className="ml-1.5 text-stone-300">{msg.text}</span>
        </>
      )}
      <span className="ml-2 text-stone-500">{formatTime(msg.timestamp)}</span>
    </div>
  );
}

export default function ChatPanel({ roomId, tableId, username, maxHeight }: ChatPanelProps) {
  const { messages, sendMessage, unreadCount, isConnected, markAsRead } = useChat(
    roomId,
    tableId,
    username,
  );
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-stone-800 bg-stone-900/50">
      <div className="flex items-center justify-between border-b border-stone-800 px-4 py-3">
        <p className="text-sm font-semibold text-stone-200">Chat</p>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAsRead}
              className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white"
            >
              {unreadCount} new
            </button>
          )}
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4"
        style={{ maxHeight: maxHeight ?? '300px' }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        onClick={markAsRead}
      >
        {messages.length === 0 ? (
          <p className="text-center text-xs text-stone-600">No messages yet</p>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} msg={msg} />)
        )}
      </div>

      <div className="border-t border-stone-800 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
            rows={1}
            maxLength={300}
            disabled={!isConnected}
            className="min-w-0 flex-1 resize-none rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || !input.trim()}
            className="shrink-0 self-end rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500"
          >
            Send
          </button>
        </div>
        <p className="mt-1 text-[10px] text-stone-600">
          Enter to send &middot; Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
