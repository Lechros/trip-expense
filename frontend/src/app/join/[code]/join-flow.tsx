"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

/** 플로우 단계. URL ?step= 에 반영(보안 문제 없음: tripId만 있으면 됨, 단계명은 UI용). */
export type Step =
  | "choice"             // 비로그인 첫 화면: 로그인하여 참가 | 비회원으로 참가
  | "member"             // 로그인 첫 화면: 여행 참가할지 확인 (비밀번호 + 참가)
  | "guest-trip-password" // 비회원 경로: 여행 비밀번호 입력
  | "guest-list"        // 비회원: 목록 선택 또는 새로 생성
  | "guest-password"    // 기존 게스트 비밀번호 입력
  | "guest-new";        // 새 게스트 생성

const JOIN_FLOW_STORAGE_KEY = "join-flow";

type JoinFlowStored = {
  tripId: string;
  step: Step;
  tripPassword: string;
  joinInfo: JoinInfo | null;
  selectedGuestId: string | null;
};

function getStorageKey(tripId: string) {
  return `${JOIN_FLOW_STORAGE_KEY}:${tripId}`;
}

function loadJoinFlowState(tripId: string): Partial<JoinFlowStored> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(getStorageKey(tripId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JoinFlowStored;
    return parsed.tripId === tripId ? parsed : null;
  } catch {
    return null;
  }
}

function saveJoinFlowState(tripId: string, state: JoinFlowStored) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(getStorageKey(tripId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearJoinFlowState(tripId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(getStorageKey(tripId));
  } catch {
    // ignore
  }
}

const STEP_QUERY = "step";
const VALID_STEPS: Step[] = ["choice", "member", "guest-trip-password", "guest-list", "guest-password", "guest-new"];

function stepFromQuery(searchParams: ReturnType<typeof useSearchParams>): Step | null {
  const s = searchParams.get(STEP_QUERY);
  return s && VALID_STEPS.includes(s as Step) ? (s as Step) : null;
}

type JoinFlowProps = {
  tripId: string;
};

/** 이전 단계명을 새 Step으로 매핑(세션 복원 호환). */
function normalizeStoredStep(s: string): Step {
  if (VALID_STEPS.includes(s as Step)) return s as Step;
  if (s === "trip-password" || s === "method") return "choice";
  if (s === "guest") return "guest-list";
  return "choice";
}

/**
 * 참여 플로우 (명세).
 * 1. 여행 페이지 접속
 * 2-1. 로그인 시: 여행에 참가할지 확인 (비밀번호 + 참가)
 * 2-2. 비로그인 시: 로그인하여 참가 | 비회원으로 참가
 * 2-2-1. 로그인 → 로그인 후 2-1로
 * 2-2-2. 비회원 참가 → 여행 비밀번호 → 목록 선택 또는 새로 생성
 * 단계는 URL ?step= 에 반영(뒤로가기·공유 시 동작).
 */
export function JoinFlow({ tripId }: JoinFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;
  const displayName = user?.email ?? undefined;

  const [step, setStepState] = useState<Step>("choice");
  const [tripPassword, setTripPassword] = useState("");
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [guestPassword, setGuestPassword] = useState("");
  const [guestNewName, setGuestNewName] = useState("");
  const [guestNewPassword, setGuestNewPassword] = useState("");
  const [guestNewConfirm, setGuestNewConfirm] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const membershipCheckDone = useRef(false);

  const setStep = useCallback(
    (next: Step) => {
      setStepState(next);
      const url = new URL(window.location.href);
      url.searchParams.set(STEP_QUERY, next);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router]
  );

  // 복원: URL ?step= 우선, 없으면 sessionStorage, 없으면 로그인 여부에 따라 choice | member. 복원 후 URL에 step 반영.
  useEffect(() => {
    const fromUrl = stepFromQuery(searchParams);
    const stored = loadJoinFlowState(tripId);
    const storedStep = stored?.step ? normalizeStoredStep(stored.step) : null;
    let initial: Step;
    if (fromUrl) initial = fromUrl;
    else if (!storedStep || storedStep === "choice") initial = isLoggedIn ? "member" : "choice";
    else initial = storedStep;
    setStepState(initial);
    if (stored?.tripPassword != null) setTripPassword(stored.tripPassword);
    if (stored?.joinInfo != null) setJoinInfo(stored.joinInfo);
    if (stored?.selectedGuestId != null) setSelectedGuestId(stored.selectedGuestId);
    setHydrated(true);
    if (!fromUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set(STEP_QUERY, initial);
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [tripId, isLoggedIn, searchParams, router]);

  // 로그인된 사용자가 이미 해당 트립 멤버면 /trips/:tripId로 이동
  useEffect(() => {
    if (!isLoggedIn || !tripId || membershipCheckDone.current) return;
    membershipCheckDone.current = true;
    apiFetch<{ trip?: unknown }>(`/trips/${tripId}`, { auth: true, retryWithRefresh: false }).then(
      (res) => {
        if (res.ok && res.data?.trip) {
          router.replace(`/trips/${tripId}`);
          router.refresh();
        }
      }
    );
  }, [isLoggedIn, tripId, router]);

  // sessionStorage 저장
  useEffect(() => {
    if (!hydrated) return;
    saveJoinFlowState(tripId, {
      tripId,
      step,
      tripPassword,
      joinInfo,
      selectedGuestId,
    });
  }, [hydrated, tripId, step, tripPassword, joinInfo, selectedGuestId]);

  const goBack = () => {
    setError(null);
    if (step === "guest-new") setStep("guest-list");
    else if (step === "guest-password") {
      setStep("guest-list");
      setSelectedGuestId(null);
      setGuestPassword("");
    } else if (step === "guest-list") setStep("choice");
    else if (step === "guest-trip-password") setStep("choice");
  };

  const backLabel =
    step === "guest-new"
      ? "비회원 목록"
      : step === "guest-password"
        ? "게스트 선택"
        : step === "guest-list" || step === "guest-trip-password"
          ? "참여 방식 선택"
          : null;

  /** 비회원 경로: 여행 비밀번호 검증 후 게스트 목록 단계로 */
  const handleGuestTripPasswordNext = async () => {
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
    setStep("guest-list");
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
    clearJoinFlowState(tripId);
    router.push(`/trips/${tripId}`);
    router.refresh();
  };

  /** 게스트 조인은 반드시 같은 오리진(/api)으로 요청해 Set-Cookie(guest_session)가 프론트 도메인에 저장되도록 함 */
  const guestJoinUrl = "/api/trips/join";

  const handleJoinAsGuestExisting = async () => {
    if (!selectedGuestId || !guestPassword) {
      setError("비밀번호를 입력하세요.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await fetch(guestJoinUrl, {
      method: "POST",
      credentials: "include",
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
    clearJoinFlowState(tripId);
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
    const res = await fetch(guestJoinUrl, {
      method: "POST",
      credentials: "include",
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
    clearJoinFlowState(tripId);
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

          {step === "choice" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">여행에 참여하기</h1>
                <p className="text-sm text-muted-foreground">
                  로그인하여 참가하거나, 비회원으로 참가할 수 있어요.
                </p>
              </section>
              <div className="grid gap-4">
                <Card size="sm" className="flex flex-col transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LogIn className="size-4 text-primary" />
                      로그인하여 참가
                    </CardTitle>
                    <CardDescription>
                      로그인하면 이 여행에 회원으로 참가합니다. 이미 참가한 여행이면 바로 들어갈 수 있어요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button asChild variant="default" size="lg" className="w-full">
                      <Link href={`/login?redirect=${encodeURIComponent(`/join/${tripId}`)}`}>
                        로그인
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                <Card size="sm" className="flex flex-col transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UserPlus className="size-4 text-primary" />
                      비회원으로 참가
                    </CardTitle>
                    <CardDescription>
                      가입 없이 이 여행에만 참가합니다. 여행 비밀번호 입력 후 이름을 선택하거나 새로 만드세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button variant="outline" size="lg" className="w-full" onClick={() => setStep("guest-trip-password")}>
                      비회원으로 참가하기
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {step === "member" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">여행에 참가할까요?</h1>
                <p className="text-sm text-muted-foreground">
                  여행 비밀번호를 입력하면 이 계정으로 참가합니다.
                </p>
              </section>
              <Card>
                <CardContent className="pt-6">
                  <FieldGroup>
                    <Field>
                      <FieldLabel asChild>
                        <Label htmlFor="member-trip-password">여행 비밀번호</Label>
                      </FieldLabel>
                      <Input
                        id="member-trip-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="여행 생성자가 공유한 비밀번호"
                        value={tripPassword}
                        onChange={(e) => setTripPassword(e.target.value)}
                        aria-describedby="member-trip-password-desc"
                      />
                      <p id="member-trip-password-desc" className="text-muted-foreground text-xs">
                        링크를 공유받을 때 함께 전달된 비밀번호입니다
                      </p>
                    </Field>
                    {error && (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    )}
                    <Button size="lg" className="w-full" onClick={handleJoinAsMember} disabled={loading}>
                      {loading ? "참가 중…" : `${displayName ?? "회원"}(으)로 참가하기`}
                    </Button>
                  </FieldGroup>
                </CardContent>
              </Card>
            </>
          )}

          {step === "guest-trip-password" && (
            <>
              <section className="space-y-1 text-center">
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">여행 비밀번호 입력</h1>
                <p className="text-sm text-muted-foreground">
                  비회원으로 참가하려면 링크와 함께 전달된 여행 비밀번호를 입력하세요.
                </p>
              </section>
              <Card>
                <CardContent className="pt-6">
                  <FieldGroup>
                    <Field>
                      <FieldLabel asChild>
                        <Label htmlFor="guest-trip-password">여행 비밀번호</Label>
                      </FieldLabel>
                      <Input
                        id="guest-trip-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="여행 생성자가 공유한 비밀번호"
                        value={tripPassword}
                        onChange={(e) => setTripPassword(e.target.value)}
                        aria-describedby="guest-trip-password-desc"
                      />
                      <p id="guest-trip-password-desc" className="text-muted-foreground text-xs">
                        링크를 공유받을 때 함께 전달된 비밀번호입니다
                      </p>
                    </Field>
                    {error && (
                      <p className="text-sm text-destructive" role="alert">
                        {error}
                      </p>
                    )}
                    <Button size="lg" className="w-full" onClick={handleGuestTripPasswordNext} disabled={loading}>
                      {loading ? "확인 중…" : "다음"}
                    </Button>
                  </FieldGroup>
                </CardContent>
              </Card>
            </>
          )}

          {step === "guest-list" && (
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
