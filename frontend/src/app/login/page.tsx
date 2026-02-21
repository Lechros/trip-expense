import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 로그인 페이지 (플레이스홀더)
 * UI 승인 후 소셜 로그인(Google 등) 연동 예정
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <p className="text-center text-muted-foreground">로그인 화면 (설계 대기)</p>
      <Button asChild variant="outline">
        <Link href="/">처음으로</Link>
      </Button>
    </div>
  );
}
