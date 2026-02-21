import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 여행 참여 페이지 (플레이스홀더)
 * UI 승인 후 초대 코드 입력 → 참여 방식 선택(소셜/비회원) 플로우 구현 예정
 */
export default function JoinPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <p className="text-center text-muted-foreground">여행 참여 화면 (설계 대기)</p>
      <Button asChild variant="outline">
        <Link href="/">처음으로</Link>
      </Button>
    </div>
  );
}
