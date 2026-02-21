import Link from "next/link";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "여행 참여",
  description: "여행 참여는 초대 링크를 통해서만 가능합니다.",
};

/**
 * 초대 링크 없이 /join 직접 접속 시 안내.
 * 참여 플로우는 /join/[code]에서만 제공.
 */
export default function JoinIndexPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane className="size-4" aria-hidden />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            여행 비용 정산
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mx-auto w-full max-w-md space-y-6 text-center">
          <p className="text-muted-foreground">
            이 페이지는 초대 링크를 통해서만 이용할 수 있어요.
            <br />
            여행 생성자가 공유한 링크로 접속한 뒤, 여행 비밀번호를 입력해 주세요.
          </p>
          <Button asChild variant="outline" size="lg">
            <Link href="/">처음으로</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
