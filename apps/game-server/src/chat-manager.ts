import type { ConnectionManager } from './connection-manager';
import type { RoomManager } from './room-manager';
import type { TableManager } from './table-manager';
import type { ServerMessage } from './types';
import { createServerMessage } from './types';
import { ConfigService } from './config';
import type { ChatStorage } from './chat-storage';
import { InMemoryChatStorage } from './chat-storage';

export interface ChatMessage {
  id: string;
  userId: string | null;
  username: string;
  text: string;
  timestamp: number;
  roomId: string | null;
  tableId: string | null;
  isSystemMessage: boolean;
}

const MAX_MESSAGE_LENGTH = 300;

let nextMsgId = 1;

function generateMessageId(): string {
  return `msg_${nextMsgId++}_${Date.now()}`;
}

export class ChatManager {
  private storage: ChatStorage;
  private configService: ConfigService;

  constructor(
    private connections: ConnectionManager,
    private rooms: RoomManager,
    private tables: TableManager,
    configService?: ConfigService,
    storage?: ChatStorage,
  ) {
    this.configService = configService ?? new ConfigService();
    this.storage = storage ?? new InMemoryChatStorage();
  }

  validateMessage(text: string, roomId: string | null, tableId: string | null): string | null {
    if (!roomId && !tableId) return 'Message requires roomId or tableId';
    if (!text || typeof text !== 'string') return 'Message text is required';
    if (text.trim().length === 0) return 'Message cannot be empty';
    if (text.length > MAX_MESSAGE_LENGTH) {
      return `Message exceeds ${MAX_MESSAGE_LENGTH} characters`;
    }
    return null;
  }

  handleChatMessage(connectionId: string, payload: Record<string, unknown>): ChatMessage | null {
    const roomId = (payload?.roomId as string) ?? null;
    const tableId = (payload?.tableId as string) ?? null;
    const text = payload?.text as string | undefined;
    const rawUsername = (payload?.username as string) ?? '';
    const username = rawUsername.replace(/[<>]/g, '').slice(0, 50) || 'Unknown';

    const error = this.validateMessage(text ?? '', roomId, tableId);
    if (error) {
      this.sendError(connectionId, error);
      return null;
    }

    if (!text) return null;

    if (!this.isUserInScope(connectionId, roomId, tableId)) return null;

    const userId = this.connections.getUserId(connectionId) ?? null;
    const sanitizedText = this.sanitizeProfanity(text.trim());

    const message: ChatMessage = {
      id: generateMessageId(),
      userId,
      username,
      text: sanitizedText,
      timestamp: Date.now(),
      roomId,
      tableId,
      isSystemMessage: false,
    };

    this.storage.store(message);

    const serverMsg = createServerMessage(
      'CHAT_MESSAGE',
      message as unknown as Record<string, unknown>,
    );
    this.broadcastMessage(message, serverMsg);

    return message;
  }

  addSystemMessage(text: string, roomId: string | null, tableId: string | null): ChatMessage {
    const message: ChatMessage = {
      id: generateMessageId(),
      userId: null,
      username: 'System',
      text,
      timestamp: Date.now(),
      roomId,
      tableId,
      isSystemMessage: true,
    };

    this.storage.store(message);

    const serverMsg = createServerMessage(
      'CHAT_MESSAGE',
      message as unknown as Record<string, unknown>,
    );
    this.broadcastMessage(message, serverMsg);

    return message;
  }

  getHistory(roomId?: string | null, tableId?: string | null): ChatMessage[] {
    return this.storage.getHistory(roomId, tableId);
  }

  reset(): void {
    this.storage.reset();
  }

  private sendError(connectionId: string, error: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.send(createServerMessage('ERROR', { message: error }));
    }
  }

  private isUserInScope(
    connectionId: string,
    roomId: string | null,
    tableId: string | null,
  ): boolean {
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (!room || !room.connectionIds.includes(connectionId)) {
        this.sendError(connectionId, 'You are not in this room');
        return false;
      }
    }
    if (tableId) {
      const table = this.tables.get(tableId);
      if (!table || !table.connectionIds.includes(connectionId)) {
        this.sendError(connectionId, 'You are not at this table');
        return false;
      }
    }
    return true;
  }

  private sanitizeProfanity(text: string): string {
    const words = this.configService.getProfanityList();
    let sanitized = text;
    for (const word of words) {
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      sanitized = sanitized.replace(regex, (match) => '*'.repeat(match.length));
    }
    return sanitized;
  }

  private broadcastMessage(message: ChatMessage, serverMsg: ServerMessage): void {
    if (message.tableId) {
      const table = this.tables.get(message.tableId);
      if (table) {
        this.connections.broadcastTo(table.connectionIds, serverMsg);
      }
    }
    if (message.roomId && !message.tableId) {
      const room = this.rooms.get(message.roomId);
      if (room) {
        this.connections.broadcastTo(room.connectionIds, serverMsg);
      }
    }
  }
}
