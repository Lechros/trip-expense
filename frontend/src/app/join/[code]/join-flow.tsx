"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plane, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";

type JoinInfoTrip = {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  countryCode: string;
  baseCurrency: string;
  additionalCurrency?: string | null;
};

type JoinInfoGuest = { id: string; displayName: string; colorHex?: string | null };

type JoinInfo = {
  trip: JoinInfoTrip;
  guests: JoinInfoGuest[];
};

type Step = "trip-password" | "method" | "guest" | "guest-password" | "guest-new";

type JoinFlowProps = {
  tripId: string;
};

/**
 * 초대 링크(여행 id 포함)로 접속한 참여 플로우.
 * 여행 비밀번호 검증(join-info) → 참여 방식(회원/비회원) → 회원 join 또는 게스트 목록/새 게스트.
 */
export function JoinFlow({ tripId }: JoinFlowProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;
  const displayName = user?.email ?? undefined;

  const [step, setStep] = useState<Step>("trip-password");
  const [tripPassword, setTripPassword] = useState("");
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [guestPassword, setGuestPassword] = useState("");
  const [guestNewName, setGuestNewName] = useState("");
  const [guestNewPassword, setGuestNewPassword] = useState("");
  const [guestNewConfirm, setGuestNewConfirm] = useState("");

  const goBack = () => {
    setError(null);
    if (step === "guest-new") setStep("guest");
    else if (step === "guest-password") {
      setStep("guest");
      setSelectedGuestId(null);
      setGuestPassword("");
    } else if (step === "guest") setStep("method");
  };

  const backLabel =
    step === "guest-new"
      ? "비회원 목록"
      : step === "guest-password"
        ? "게스트 선택"
        : step === "guest"
          ? "참여 방식 선택"
          : null;

  const handleTripPasswordNext = async () => {
    if (!tripPassword.trim()) {
      setError("여행 비밀번호를 입력하세요.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await apiFetch<JoinInfo>(
      `/trips/join-info?tripId=${encodeURIComponent(tripId)}&password=${encodeURIComponent(tripPassword)}`,
      { auth: false, retryWithRefresh: false }
    );
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "비밀번호가 올바르지 않거나 여행을 찾을 수 없습니다.");
      return;
    }
    setJoinInfo(res.data);
    setStep("method");
  };

  const handleJoinAsMember = async () => {
    setError(null);
    setLoading(true);
    const res = await apiFetch<{ tripId?: string }>("/trips/join", {
      method: "POST",
      body: JSON.stringify({ tripId, password: tripPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "참여에 실패했습니다.");
      return;
    }
    router.push(`/trips/${tripId}`);
    router.refresh();
  };

  const handleJoinAsGuestExisting = async () => {
    if (!selectedGuestId || !guestPassword) {
      setError("비밀번호를 입력하세요.");
      return;
    }
    setError(null);
    setLoading(true);
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "");
    const res = await fetch(`${base.replace(/\/$/, "")}/trips/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId,
        password: tripPassword,
        guestId: selectedGuestId,
        guestPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((data as { error?: string })?.error ?? "참여에 실패했습니다.");
      return;
    }
    router.push(`/trips/${tripId}`);
    router.refresh();
  };

  const handleJoinAsGuestNew = async () => {
    if (!guestNewName.trim()) {
      setError("이름을 입력하세요.");
      return;
    }
    if (guestNewPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (guestNewPassword !== guestNewConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setError(null);
    setLoading(true);
    const base = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "");
    const res = await fetch(`${base.replace(/\/$/, "")}/trips/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId,
        tripPassword,
        displayName: guestNewName.trim(),
        password: guestNewPassword,
        passwordConfirm: guestNewConfirm,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError((data as { error?: string })?.error ?? "참여에 실패했습니다.");
      return;
    }
    router.push(`/trips/${tripId}`);
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane className="size-4" aria-hidden />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">여행 참여하기</span>
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

          {step === "trip-password" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">여행 비밀번호 입력</h1>
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
                        value={tripPassword}
                        onChange={(e) => setTripPassword(e.target.value)}
                        aria-describedby="trip-password-desc"
                      />
                      <p id="trip-password-desc" className="text-muted-foreground text-xs">
                        링크를 공유받을 때 함께 전달된 비밀번호입니다
                      </p>
                    </Field>
                    {error && (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    )}
                    <Button size="lg" className="w-full" onClick={handleTripPasswordNext} disabled={loading}>
                      {loading ? "확인 중…" : "다음"}
                    </Button>
                  </FieldGroup>
                </CardContent>
              </Card>
            </>
          )}

          {step === "method" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">참여 방식 선택</h1>
                <p className="text-sm text-muted-foreground">로그인하시거나, 비회원으로 참여할 수 있어요.</p>
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
                      <Button
                        size="lg"
                        className="w-full"
                        onClick={handleJoinAsMember}
                        disabled={loading}
                      >
                        {loading ? "참여 중…" : `${displayName}(으)로 참여하기`}
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="lg" className="w-full">
                        <a href="/login">로그인하여 참여</a>
                      </Button>
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
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">비회원으로 참여</h1>
                <p className="text-sm text-muted-foreground">이미 등록된 이름이 있으면 선택하고, 없으면 새로 추가하세요.</p>
              </section>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">이 여행의 게스트</CardTitle>
                  <CardDescription>
                    다른 기기에서 같은 사람으로 들어오려면 목록에서 선택 후 비밀번호를 입력하세요.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {joinInfo && joinInfo.guests.length > 0 ? (
                    <ul className="space-y-2">
                      {joinInfo.guests.map((g) => (
                        <li key={g.id}>
                          <Button
                            type="button"
                            variant="outline"
                            size="lg"
                            className="w-full justify-start"
                            onClick={() => {
                              setSelectedGuestId(g.id);
                              setStep("guest-password");
                            }}
                          >
                            {g.displayName}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
                      등록된 게스트가 없습니다.
                    </div>
                  )}
                  <Separator />
                  <Button size="lg" className="w-full" onClick={() => setStep("guest-new")}>
                    새 비회원으로 추가
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {step === "guest-password" && selectedGuestId && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">게스트 비밀번호</h1>
                <p className="text-sm text-muted-foreground">선택한 게스트의 비밀번호를 입력하세요.</p>
              </section>
              <Card>
                <CardContent className="pt-6">
                  <FieldGroup>
                    <Field>
                      <FieldLabel asChild>
                        <Label htmlFor="guest-password-input">비밀번호</Label>
                      </FieldLabel>
                      <Input
                        id="guest-password-input"
                        type="password"
                        autoComplete="current-password"
                        placeholder="이 기기에서 설정한 비밀번호"
                        value={guestPassword}
                        onChange={(e) => setGuestPassword(e.target.value)}
                      />
                    </Field>
                    {error && (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    )}
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleJoinAsGuestExisting}
                      disabled={loading}
                    >
                      {loading ? "참여 중…" : "참여하기"}
                    </Button>
                  </FieldGroup>
                </CardContent>
              </Card>
            </>
          )}

          {step === "guest-new" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">새 비회원 추가</h1>
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
                        value={guestNewName}
                        onChange={(e) => setGuestNewName(e.target.value)}
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
                        placeholder="8자 이상"
                        value={guestNewPassword}
                        onChange={(e) => setGuestNewPassword(e.target.value)}
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
                        value={guestNewConfirm}
                        onChange={(e) => setGuestNewConfirm(e.target.value)}
                      />
                    </Field>
                    {error && (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    )}
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleJoinAsGuestNew}
                      disabled={loading}
                    >
                      {loading ? "참여 중…" : "참여하기"}
                    </Button>
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
