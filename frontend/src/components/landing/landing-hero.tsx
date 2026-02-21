"use client";

import Link from "next/link";
import { Plane, LogIn, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function LandingHero() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* 상단 브랜드 영역 */}
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Plane className="size-5" aria-hidden />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            여행 비용 정산
          </span>
        </div>
      </header>

      {/* 메인 콘텐츠: 모바일 우선, 여백과 타이포 위계 */}
      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-lg flex flex-col gap-10">
          {/* 히어로 텍스트 */}
          <section className="space-y-3 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              여행 지출을 기록하고
              <br />
              <span className="text-primary">얼마를 정산</span>해야 하는지
              <br />
              한눈에 확인하세요
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              함께 간 여행 비용을 공정하게 나누고, 최소 횟수로 송금까지 정리할 수 있어요.
            </p>
          </section>

          {/* 액션: 단일 카드 내 로그인 / 여행 참여 안내 */}
          <section>
            <Card className="flex flex-col transition-shadow hover:shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">시작하기</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <LogIn className="size-4 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">로그인</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    로그인해 여행을 만들고 초대할 수 있어요.
                  </p>
                  <Button asChild className="w-full" size="lg">
                    <Link href="/login">로그인하기</Link>
                  </Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="size-4 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">여행 참여하기</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    초대 링크를 받았다면 해당 링크로 접속한 뒤, 여행 비밀번호를 입력하면 참여할 수 있어요.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 하단 안내 */}
          <p className="text-center text-xs text-muted-foreground">
            비회원으로도 참여할 수 있으며, 다른 기기에서 같은 게스트로 들어오려면
            <br className="hidden sm:block" />
            해당 여행에서 설정한 비밀번호로 인증하면 됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
