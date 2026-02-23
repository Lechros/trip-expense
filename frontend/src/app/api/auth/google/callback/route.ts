import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "") ?? "";

/**
 * GET /api/auth/google/callback — Google OAuth 콜백을 백엔드로 프록시.
 * rewrite가 빌드 시점에만 적용되므로, 런타임에 BACKEND_URL로 프록시해 404를 방지하고 Set-Cookie를 클라이언트에 전달.
 */
export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "BACKEND_URL is not configured" },
      { status: 503 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const url = new URL("/auth/google/callback", BACKEND_URL);
  searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Cookie: request.headers.get("cookie") ?? "",
    },
    redirect: "manual",
  });

  const nextRes = new NextResponse(null, {
    status: res.status,
    statusText: res.statusText,
  });

  const location = res.headers.get("location");
  if (location) nextRes.headers.set("Location", location);

  // Domain 제거해 쿠키가 프론트 도메인에 설정되도록 함. 그래야 /api/me 등 같은 오리진 요청에 쿠키가 포함됨.
  const setCookies = res.headers.getSetCookie?.() ?? (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []);
  for (const c of setCookies) {
    const withoutDomain = c.replace(/;\s*Domain=[^;]+/gi, "");
    nextRes.headers.append("Set-Cookie", withoutDomain);
  }

  return nextRes;
}
