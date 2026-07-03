import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';

const ACCESS_SECRET =
  process.env.JWT_SECRET ?? (isProduction ? undefined : 'backgammon-dev-secret');
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ??
  process.env.JWT_SECRET ??
  (isProduction ? undefined : 'backgammon-dev-secret');

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production');
}

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export interface AccessTokenPayload {
  sub: string;
  type: 'user' | 'guest';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}
