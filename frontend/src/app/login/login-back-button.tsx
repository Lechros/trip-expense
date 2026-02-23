"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 로그인 페이지 "뒤로" 버튼. 실제 history back 동작 (join 플로우 등에서 돌아올 때 상태 유지).
 * 히스토리가 없으면(새 탭 등) 메인(/)으로 이동.
 */
export function LoginBackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground hover:text-foreground"
      aria-label="뒤로"
      onClick={handleBack}
    >
      <ArrowLeft className="size-4" aria-hidden />
      뒤로
    </Button>
  );
}
