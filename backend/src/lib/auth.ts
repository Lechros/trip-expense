import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { User } from '../../generated/prisma/client.js';

const SALT_ROUNDS = 10;
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET ?? 'dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET ?? 'dev-refresh-secret';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export type AccessPayload = { sub: string; type: 'access'; email: string };
export type RefreshPayload = { sub: string; type: 'refresh' };

export function signAccessToken(user: Pick<User, 'id' | 'email'>): string {
  return jwt.sign(
    { sub: user.id, type: 'access', email: user.email } satisfies AccessPayload,
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

export function signRefreshToken(user: Pick<User, 'id'>): string {
  return jwt.sign(
    { sub: user.id, type: 'refresh' } satisfies RefreshPayload,
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as AccessPayload;
    return payload.type === 'access' ? payload : null;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshPayload | null {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as RefreshPayload;
    return payload.type === 'refresh' ? payload : null;
  } catch {
    return null;
  }
}

const GUEST_SESSION_SECRET = process.env.GUEST_SESSION_SECRET ?? process.env.JWT_SECRET ?? 'dev-guest-session';
const GUEST_SESSION_EXPIRES_IN = '7d';

export type GuestSessionPayload = { tripId: string; guestId: string; memberId: string; exp?: number };

export function signGuestSessionToken(payload: GuestSessionPayload): string {
  return jwt.sign(
    { ...payload, type: 'guest_session' },
    GUEST_SESSION_SECRET,
    { expiresIn: GUEST_SESSION_EXPIRES_IN }
  );
}

export function verifyGuestSessionToken(token: string): GuestSessionPayload | null {
  try {
    const payload = jwt.verify(token, GUEST_SESSION_SECRET) as GuestSessionPayload & { type?: string };
    return payload?.tripId && payload?.guestId && payload?.memberId ? payload : null;
  } catch {
    return null;
  }
}
