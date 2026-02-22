"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

type AuthGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

/**
 * 인증 필요 라우트: GET /me(credentials)로 확인 후, 미인증이면 redirectTo로 리다이렉트.
 * 쿠키 기반 인증(전략 B).
 */
export function AuthGuard({ children, redirectTo = "/login" }: AuthGuardProps) {
  const router = useRouter();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const user = useAuthStore((s) => s.user);
  const checking = useAuthStore((s) => s.checking);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkAuth().then((ok) => {
      if (!cancelled) {
        setDone(true);
        if (!ok) router.replace(redirectTo);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [checkAuth, redirectTo, router]);

  if (!done || checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">로그인 확인 중…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-muted-foreground">리다이렉트 중…</p>
      </div>
    );
  }

  return <>{children}</>;
}
