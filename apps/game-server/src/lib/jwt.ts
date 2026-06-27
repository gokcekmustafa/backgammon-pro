import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET ?? 'backgammon-dev-secret';
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
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, SECRET) as RefreshTokenPayload;
}
