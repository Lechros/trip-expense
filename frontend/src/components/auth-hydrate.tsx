"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import type { MeResponse } from "@/stores/auth";

/**
 * 서버에서 이미 /me를 호출한 라우트에서 사용.
 * initialMe가 있으면 스토어를 즉시 채워 첫 페인트에 인증 상태 반영(SSR).
 * 그 후 checkAuth()로 최신 상태 동기화.
 */
export function AuthHydrate({ initialMe }: { initialMe?: MeResponse | null }) {
  const setInitialAuth = useAuthStore((s) => s.setInitialAuth);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    if (initialMe != null) setInitialAuth(initialMe);
  }, [initialMe, setInitialAuth]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return null;
}
