import { Suspense } from "react";
import { Plane } from "lucide-react";
import { LoginForm } from "./login-form";
import { LoginBackButton } from "./login-back-button";

/**
 * 로그인 페이지. Google 소셜 로그인만 제공.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane className="size-4" aria-hidden />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">여행 비용 정산</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-md flex flex-col gap-8">
          <div className="-mt-1">
            <LoginBackButton />
          </div>
          <section className="space-y-1 text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">로그인</h1>
            <p className="text-sm text-muted-foreground">로그인해 여행을 만들고 참여할 수 있어요.</p>
          </section>
          <Suspense
            fallback={
              <div className="flex flex-col gap-4">
                <div className="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 font-medium text-muted-foreground">
                  로딩 중…
                </div>
              </div>
            }
          >
            <LoginForm />
          </Suspense>
          <p className="text-center text-sm text-muted-foreground">
            초대 링크를 받으셨다면 해당 링크로 바로 접속하시면 됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
