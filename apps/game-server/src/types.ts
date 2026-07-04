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
  | 'RECONNECT_GAME'
  | 'ADMIN_CLOSE_TABLE'
  | 'ADMIN_LOCK_TABLE'
  | 'ADMIN_UNLOCK_TABLE'
  | 'ADMIN_FORCE_REMOVE'
  | 'ADMIN_SEND_WARNING'
  | 'ADMIN_BROADCAST'
  | 'ADMIN_PAUSE_GAME'
  | 'ADMIN_RESUME_GAME'
  | 'ADMIN_TERMINATE_GAME'
  | 'ADMIN_FORCE_RESIGN'
  | 'ADMIN_FORCE_DRAW'
  | 'ADMIN_KICK_SPECTATOR';

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
  'ADMIN_CLOSE_TABLE',
  'ADMIN_LOCK_TABLE',
  'ADMIN_UNLOCK_TABLE',
  'ADMIN_FORCE_REMOVE',
  'ADMIN_SEND_WARNING',
  'ADMIN_BROADCAST',
  'ADMIN_PAUSE_GAME',
  'ADMIN_RESUME_GAME',
  'ADMIN_TERMINATE_GAME',
  'ADMIN_FORCE_RESIGN',
  'ADMIN_FORCE_DRAW',
  'ADMIN_KICK_SPECTATOR',
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
  | 'OPPONENT_RECONNECTED'
  | 'ADMIN_WARNING'
  | 'ADMIN_BROADCAST'
  | 'ADMIN_TABLE_LOCKED'
  | 'ADMIN_TABLE_UNLOCKED'
  | 'ADMIN_TABLE_CLOSED'
  | 'ADMIN_GAME_PAUSED'
  | 'ADMIN_GAME_RESUMED'
  | 'ADMIN_GAME_TERMINATED'
  | 'NOTIFICATION'
  | 'TOURNAMENT_REGISTRATION_UPDATE'
  | 'TOURNAMENT_MATCH_CREATED'
  | 'TOURNAMENT_MATCH_RESULT'
  | 'TOURNAMENT_FINISHED'
  | 'FRIEND_ONLINE'
  | 'FRIEND_OFFLINE'
  | 'FRIEND_REQUEST'
  | 'INVITATION_RECEIVED'
  | 'INVITATION_ACCEPTED'
  | 'INVITATION_REJECTED'
  | 'XP_GAINED'
  | 'LEVEL_UP'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'MISSION_COMPLETED'
  | 'BATTLE_PASS_LEVEL_UP'
  | 'REWARD_UNLOCKED'
  | 'REWARD_CLAIMED'
  | 'SEASON_STARTED'
  | 'SEASON_ENDING_SOON';

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
  locked: boolean;
  spectatorIds: string[];
  createdAt: number;
}

export type TableStatus = TableState['status'];
