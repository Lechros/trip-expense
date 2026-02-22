"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";

/**
 * OAuth 콜백 (Google 로그인 후 백엔드가 쿠키 설정 후 이 URL로 리다이렉트).
 * GET /me로 사용자 확인 후 /trips로 이동.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setErrorMessage(error === "exchange_failed" ? "로그인 처리에 실패했습니다." : error);
      setStatus("error");
      return;
    }

    checkAuth().then((ok) => {
      if (ok) {
        setStatus("ok");
        router.replace("/trips");
        router.refresh();
      } else {
        setErrorMessage("로그인 세션을 확인할 수 없습니다.");
        setStatus("error");
      }
    });
  }, [searchParams, checkAuth, router]);

  if (status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-destructive" role="alert">
          {errorMessage}
        </p>
        <Button asChild>
          <Link href="/login">로그인으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <p className="text-muted-foreground">로그인 처리 중…</p>
    </div>
  );
}
