/**
 * API 클라이언트: credentials: include (쿠키 전송). 401 시 refresh 후 재시도 또는 로그인 페이지로.
 * 동시 401 시 refresh는 한 번만 수행하고 나머지는 그 결과를 기다린 뒤 재시도 (중복 refresh로 logout 방지).
 */

const getBaseUrl = (): string => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (typeof window !== "undefined") return fromEnv ?? "/api";
  return process.env.BACKEND_URL?.replace(/\/$/, "") ?? "";
};

/** 클라이언트에서만 사용. 동시 401 시 하나의 refresh만 실행하고 나머지는 대기 후 재시도 */
let refreshPromise: Promise<boolean> | null = null;

export type ApiResponse<T = unknown> =
  | { ok: true; data: T; status: number }
  | { ok: false; status: number; error?: string; data?: unknown };

export type ApiFetchOptions = RequestInit & {
  /** 인증 필요 시 true. credentials: include 로 쿠키 전송. 401 시 redirect 안 함은 auth: false */
  auth?: boolean;
  /** 401 시 refresh 재시도 여부. 기본 true */
  retryWithRefresh?: boolean;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<ApiResponse<T>> {
  const { auth = true, retryWithRefresh = true, headers = {}, ...init } = options;
  const baseUrl = getBaseUrl();
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const doFetch = (): Promise<Response> =>
    fetch(url, {
      ...init,
      credentials: auth ? "include" : "omit",
      headers: { "Content-Type": "application/json", ...(headers as Record<string, string>) },
    });

  const readBody = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? (JSON.parse(text) as T) : (null as T);
    } catch {
      return null as T;
    }
  };

  if (typeof window === "undefined") {
    const res = await doFetch();
    const data = await readBody(res);
    if (res.ok) return { ok: true, data: data ?? ({} as T), status: res.status };
    return { ok: false, status: res.status, error: (data as { error?: string })?.error, data };
  }

  let res = await doFetch();

  if (res.status === 401 && auth && retryWithRefresh) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          });
          return refreshRes.ok;
        } finally {
          refreshPromise = null;
        }
      })();
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      res = await doFetch();
    }
  }

  const data = await readBody(res);

  if (res.ok) {
    return { ok: true, data: data ?? ({} as T), status: res.status };
  }

  if (res.status === 401 && auth) {
    const { useAuthStore } = await import("@/stores/auth");
    useAuthStore.getState().logout();
    window.location.href = "/login";
  }

  return {
    ok: false,
    status: res.status,
    error: (data as { error?: string })?.error,
    data,
  };
}
