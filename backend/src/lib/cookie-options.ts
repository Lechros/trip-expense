/**
 * httpOnly 쿠키 옵션 (전략 B). Auth.js/NextAuth 등과 동일한 보안 속성.
 */
export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
export const GUEST_SESSION_COOKIE = 'guest_session';

const isProduction = process.env.NODE_ENV === 'production';

const baseOptions = {
  path: '/' as const,
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
};

export function accessTokenCookieOptions(maxAgeSeconds: number = 15 * 60) {
  return { ...baseOptions, maxAge: maxAgeSeconds };
}

export function refreshTokenCookieOptions(maxAgeSeconds: number = 7 * 24 * 3600) {
  return { ...baseOptions, maxAge: maxAgeSeconds };
}

const GUEST_SESSION_MAX_AGE = 7 * 24 * 3600; // 7일
export function guestSessionCookieOptions(maxAgeSeconds: number = GUEST_SESSION_MAX_AGE) {
  return { ...baseOptions, maxAge: maxAgeSeconds };
}

export function clearCookieOptions() {
  return { path: '/' as const, maxAge: 0 };
}
