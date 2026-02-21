import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * 로그인 페이지
 * SPEC §2.1: 소셜(Google 등) 가입·로그인. UI만 구현, 백엔드 연동은 승인 후 진행.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* 헤더: navbar에 뒤로가기 없음 */}
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane className="size-4" aria-hidden />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            여행 비용 정산
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-md flex flex-col gap-8">
          <div className="-mt-1">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" aria-label="처음으로">
              <Link href="/">
                <ArrowLeft className="size-4" />
                뒤로
              </Link>
            </Button>
          </div>
          <section className="space-y-1 text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              로그인
            </h1>
            <p className="text-sm text-muted-foreground">
              소셜 계정으로 로그인하여 여행을 만들고 참여할 수 있어요.
            </p>
          </section>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="sr-only">소셜 로그인</CardTitle>
              <CardDescription className="sr-only">
                Google 계정으로 로그인할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-3 border-border bg-background font-medium hover:bg-muted/50"
                disabled
                aria-describedby="login-coming-soon"
              >
                <GoogleIcon className="size-5 shrink-0" />
                Google로 로그인
              </Button>
              <p id="login-coming-soon" className="text-center text-xs text-muted-foreground">
                (연동 준비 중 — 승인 후 적용)
              </p>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            초대 링크를 받으셨다면 해당 링크로 바로 접속하시면 됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
