/**
 * Google OAuth 2.0 (OpenID Connect). 인증 URL 생성 및 code → 사용자 정보 교환.
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const SCOPES = ['openid', 'email', 'profile'].join(' ');

export function getGoogleAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleUserInfo = { sub: string; email: string };

/**
 * authorization code를 Google에 교환해 access_token을 받고, userinfo에서 이메일·sub 반환.
 */
export async function exchangeCodeForUser(code: string, redirectUri: string): Promise<GoogleUserInfo | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) return null;
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) return null;

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userRes.ok) return null;
  const userData = (await userRes.json()) as { sub?: string; email?: string };
  if (!userData.sub || !userData.email) return null;

  return { sub: userData.sub, email: userData.email };
}
