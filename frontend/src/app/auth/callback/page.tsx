"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth";

/** 로그인 후 이동할 URL로 허용할 path인지 검사. 같은 오리진의 path만 허용. */
function isSafeRedirect(path: string | null): path is string {
  if (!path || typeof path !== "string") return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//") || path.includes(":")) return false;
  return true;
}

/**
 * OAuth 콜백 (Google 로그인 후 백엔드가 쿠키 설정 후 이 URL로 리다이렉트).
 * GET /me로 사용자 확인 후, state(redirect)가 있으면 해당 path로, 없으면 /trips로 이동.
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

    const redirect = searchParams.get("state");

    checkAuth().then((ok) => {
      if (ok) {
        setStatus("ok");
        const target = isSafeRedirect(redirect) ? redirect : "/trips";
        router.replace(target);
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
