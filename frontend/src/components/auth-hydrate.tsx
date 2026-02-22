"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";

/**
 * 서버에서 이미 인증된 라우트에서만 사용. 마운트 시 checkAuth()로 스토어에 user 채움(헤더 등 표시용).
 * 로딩 UI 없음 — SSR에서 이미 리다이렉트 처리됨.
 */
export function AuthHydrate() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  return null;
}
