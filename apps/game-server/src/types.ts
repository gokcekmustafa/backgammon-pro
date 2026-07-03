export type ClientMessageType =
  | 'JOIN_ROOM'
  | 'LEAVE_ROOM'
  | 'CREATE_TABLE'
  | 'JOIN_TABLE'
  | 'LEAVE_TABLE'
  | 'CHAT_MESSAGE'
  | 'PING'
  | 'AUTHENTICATE'
  | 'ROLL_DICE'
  | 'MAKE_MOVE'
  | 'RESIGN_GAME'
  | 'RECONNECT_GAME';

export const CLIENT_MESSAGE_TYPES: readonly ClientMessageType[] = [
  'JOIN_ROOM',
  'LEAVE_ROOM',
  'CREATE_TABLE',
  'JOIN_TABLE',
  'LEAVE_TABLE',
  'CHAT_MESSAGE',
  'PING',
  'AUTHENTICATE',
  'ROLL_DICE',
  'MAKE_MOVE',
  'RESIGN_GAME',
  'RECONNECT_GAME',
];

export type ServerMessageType =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ROOM_JOINED'
  | 'ROOM_LEFT'
  | 'TABLE_CREATED'
  | 'TABLE_JOINED'
  | 'TABLE_LEFT'
  | 'CHAT_MESSAGE'
  | 'PONG'
  | 'ERROR'
  | 'ROOM_UPDATE'
  | 'TABLE_UPDATE'
  | 'AUTHENTICATED'
  | 'GAME_STATE_SYNC'
  | 'GAME_DICE_ROLLED'
  | 'GAME_MOVE_MADE'
  | 'GAME_MOVE_REJECTED'
  | 'GAME_RESIGNED'
  | 'GAME_OVER'
  | 'OPPONENT_DISCONNECTED'
  | 'OPPONENT_RECONNECTED';

export interface ClientMessage {
  type: ClientMessageType;
  payload?: Record<string, unknown>;
}

export interface ServerMessage {
  type: ServerMessageType;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export function createServerMessage(
  type: ServerMessageType,
  payload?: Record<string, unknown>,
): ServerMessage {
  return { type, payload, timestamp: Date.now() };
}

export interface Connection {
  id: string;
  send: (message: ServerMessage) => void;
  close: () => void;
}

export interface Room {
  id: string;
  name: string;
  connectionIds: string[];
  createdAt: number;
}

export interface TableState {
  id: string;
  roomId: string;
  name: string;
  connectionIds: string[];
  status: 'waiting' | 'playing';
  createdAt: number;
}

export type TableStatus = TableState['status'];
