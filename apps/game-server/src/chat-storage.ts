import type { ChatMessage } from './chat-manager';

export interface ChatStorage {
  store(message: ChatMessage): void;
  getHistory(roomId?: string | null, tableId?: string | null): ChatMessage[];
  reset(): void;
}

const MAX_HISTORY = 100;

export class InMemoryChatStorage implements ChatStorage {
  private roomHistory = new Map<string, ChatMessage[]>();
  private tableHistory = new Map<string, ChatMessage[]>();

  store(message: ChatMessage): void {
    if (message.tableId) {
      this.addToHistory(this.tableHistory, message.tableId, message);
    }
    if (message.roomId) {
      this.addToHistory(this.roomHistory, message.roomId, message);
    }
  }

  getHistory(roomId?: string | null, tableId?: string | null): ChatMessage[] {
    if (tableId) return this.tableHistory.get(tableId) ?? [];
    if (roomId) return this.roomHistory.get(roomId) ?? [];
    return [];
  }

  reset(): void {
    this.roomHistory.clear();
    this.tableHistory.clear();
  }

  private addToHistory(
    history: Map<string, ChatMessage[]>,
    key: string,
    message: ChatMessage,
  ): void {
    const messages = history.get(key) ?? [];
    messages.push(message);
    if (messages.length > MAX_HISTORY) {
      messages.splice(0, messages.length - MAX_HISTORY);
    }
    history.set(key, messages);
  }
}
