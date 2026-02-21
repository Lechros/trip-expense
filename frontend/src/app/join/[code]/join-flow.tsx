"use client";

import { useState } from "react";
import { ArrowLeft, Plane, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type Step = "trip-password" | "method" | "guest" | "guest-new";

type JoinFlowProps = {
  /** 링크에 포함된 여행 id (URL에서 전달) */
  tripId: string;
  /** 연동 후: 로그인 시 true, 회원 표시명 전달 */
  isLoggedIn?: boolean;
  displayName?: string;
};

/**
 * 초대 링크(여행 id 포함)로 접속한 참여 플로우.
 * SPEC §2.2.1: 링크+여행 비밀번호 입력 → 참여 방식 선택(회원/비회원) → 비회원 시 게스트 목록/새 게스트 추가.
 */
export function JoinFlow({ tripId, isLoggedIn = false, displayName }: JoinFlowProps) {
  const [step, setStep] = useState<Step>("trip-password");

  const goBack = () => {
    if (step === "guest-new") setStep("guest");
    else if (step === "guest") setStep("method");
  };

  const backLabel =
    step === "guest-new" ? "비회원 목록" : step === "guest" ? "참여 방식 선택" : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane className="size-4" aria-hidden />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            여행 참여하기
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-md flex flex-col gap-8">
          {backLabel && (
            <div className="-mt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                aria-label={`${backLabel}으로 돌아가기`}
                onClick={goBack}
              >
                <ArrowLeft className="size-4" />
                {backLabel}
              </Button>
            </div>
          )}
          {/* Step 1: 여행 비밀번호 입력 (링크=여행 id는 URL로 전달됨) */}
          {step === "trip-password" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  여행 비밀번호 입력
                </h1>
                <p className="text-sm text-muted-foreground">
                  이 여행에 접속하려면 링크와 함께 전달된 여행 비밀번호를 입력하세요.
                </p>
              </section>
              <Card>
                <CardContent className="pt-6">
                  <FieldGroup>
                    <Field>
                      <FieldLabel asChild>
                        <Label htmlFor="trip-password">여행 비밀번호</Label>
                      </FieldLabel>
                      <Input
                        id="trip-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="여행 생성자가 공유한 비밀번호"
                        aria-describedby="trip-password-desc"
                      />
                      <p id="trip-password-desc" className="text-muted-foreground text-xs">
                        링크를 공유받을 때 함께 전달된 비밀번호입니다
                      </p>
                    </Field>
                    <Button size="lg" className="w-full" onClick={() => setStep("method")}>
                      다음
                    </Button>
                  </FieldGroup>
                </CardContent>
              </Card>
            </>
          )}

          {/* Step 2: 참여 방식 선택 — 회원(로그인 여부에 따라) / 비회원 */}
          {step === "method" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  참여 방식 선택
                </h1>
                <p className="text-sm text-muted-foreground">
                  로그인하시거나, 비회원으로 참여할 수 있어요.
                </p>
              </section>
              <div className="grid gap-4">
                <Card size="sm" className="flex flex-col transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LogIn className="size-4 text-primary" />
                      회원으로 참여
                    </CardTitle>
                    <CardDescription>
                      {isLoggedIn
                        ? "이미 로그인된 계정으로 이 여행에 참여합니다."
                        : "로그인하면 이 여행에 회원으로 참여합니다."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    {isLoggedIn && displayName ? (
                      <Button size="lg" className="w-full" disabled aria-describedby="join-member-note">
                        {displayName}(으)로 참여하기
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full gap-3 border-border bg-background font-medium hover:bg-muted/50"
                          disabled
                          aria-describedby="join-google-note"
                        >
                          <GoogleIcon className="size-5 shrink-0" />
                          로그인하여 참여
                        </Button>
                        <p id="join-google-note" className="mt-2 text-center text-xs text-muted-foreground">
                          (연동 준비 중)
                        </p>
                      </>
                    )}
                    {isLoggedIn && (
                      <p id="join-member-note" className="mt-2 text-center text-xs text-muted-foreground">
                        (연동 준비 중)
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card size="sm" className="flex flex-col transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserPlus className="size-4 text-primary" />
                      비회원으로 진행
                    </CardTitle>
                    <CardDescription>
                      가입 없이 이 여행에만 참여합니다. 다른 기기에서는 같은 이름·비밀번호로 들어올 수 있어요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button variant="default" size="lg" className="w-full" onClick={() => setStep("guest")}>
                      비회원으로 참여하기
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {step === "guest" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  비회원으로 참여
                </h1>
                <p className="text-sm text-muted-foreground">
                  이미 등록된 이름이 있으면 선택하고, 없으면 새로 추가하세요.
                </p>
              </section>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">이 여행의 게스트</CardTitle>
                  <CardDescription>
                    다른 기기에서 같은 사람으로 들어오려면 목록에서 선택 후 비밀번호를 입력하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
                    등록된 게스트가 없습니다.
                    <br />
                    <span className="text-xs">(연동 후 목록 표시)</span>
                  </div>
                  <Separator />
                  <Button size="lg" className="w-full" onClick={() => setStep("guest-new")}>
                    새 비회원으로 추가
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {step === "guest-new" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  새 비회원 추가
                </h1>
                <p className="text-sm text-muted-foreground">
                  이 여행에서 보일 이름과 비밀번호를 설정하세요. 다른 기기에서 같은 비밀번호로 들어올 수 있어요.
                </p>
              </section>
              <Card>
                <CardContent className="pt-6">
                  <FieldGroup>
                    <Field>
                      <FieldLabel asChild>
                        <Label htmlFor="guest-name">이름</Label>
                      </FieldLabel>
                      <Input
                        id="guest-name"
                        type="text"
                        autoComplete="name"
                        placeholder="이 여행에서 보일 이름"
                        aria-describedby="guest-name-desc"
                      />
                      <p id="guest-name-desc" className="text-muted-foreground text-xs">
                        다른 멤버에게 표시됩니다
                      </p>
                    </Field>
                    <Field>
                      <FieldLabel asChild>
                        <Label htmlFor="guest-password">비밀번호</Label>
                      </FieldLabel>
                      <Input
                        id="guest-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="6자 이상"
                        aria-describedby="guest-password-desc"
                      />
                      <p id="guest-password-desc" className="text-muted-foreground text-xs">
                        다른 기기에서 같은 사람으로 로그인할 때 사용합니다
                      </p>
                    </Field>
                    <Field>
                      <FieldLabel asChild>
                        <Label htmlFor="guest-password-confirm">비밀번호 확인</Label>
                      </FieldLabel>
                      <Input
                        id="guest-password-confirm"
                        type="password"
                        autoComplete="new-password"
                        placeholder="비밀번호 다시 입력"
                      />
                    </Field>
                    <Button size="lg" className="w-full" disabled aria-describedby="guest-submit-note">
                      참여하기
                    </Button>
                    <p id="guest-submit-note" className="text-center text-xs text-muted-foreground">
                      (연동 준비 중)
                    </p>
                  </FieldGroup>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
