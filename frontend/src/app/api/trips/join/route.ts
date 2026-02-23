import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "") ?? "";

/**
 * POST /api/trips/join — 백엔드로 프록시하고 Set-Cookie(guest_session 등)를 그대로 클라이언트에 전달.
 * rewrite만 쓰면 프록시가 Set-Cookie를 전달하지 않을 수 있어, 게스트 참여 후 쿠키가 저장되지 않는 문제를 방지.
 */
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const body = await request.text();
  const contentType = request.headers.get("content-type") ?? "application/json";

  const res = await fetch(`${BACKEND_URL}/trips/join`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      Cookie: cookieHeader,
    },
    body: body || undefined,
  });

  const responseBody = await res.text();
  const nextRes = new NextResponse(responseBody, {
    status: res.status,
    statusText: res.statusText,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });

  const setCookies = res.headers.getSetCookie?.() ?? (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []);
  for (const c of setCookies) {
    nextRes.headers.append("Set-Cookie", c);
  }

  return nextRes;
}
