"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { apiFetch } from "@/lib/api";
import { COUNTRY_OPTIONS } from "@/lib/countries";

export default function NewTripPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!countryCode.trim()) {
      setError("국가를 선택하세요.");
      return;
    }
    if (isPublic && !password.trim()) {
      setError("공개 여행은 비밀번호를 설정해야 합니다.");
      return;
    }
    setLoading(true);
    const res = await apiFetch<{ trip?: { id: string } }>("/trips", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        countryCode: countryCode.trim(),
        description: description.trim() || undefined,
        isPublic,
        password: password.trim() || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const msg = (res.data as { error?: string; details?: unknown })?.error ?? "생성에 실패했습니다.";
      setError(msg);
      return;
    }
    const id = res.data?.trip?.id;
    if (id) {
      router.push(`/trips/${id}`);
      router.refresh();
    } else {
      setError("응답에서 여행 ID를 찾을 수 없습니다.");
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" aria-label="여행 목록으로">
            <Link href="/trips">
              <ArrowLeft className="size-4" />
              뒤로
            </Link>
          </Button>
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane className="size-4" aria-hidden />
          </div>
          <span className="text-base font-semibold">새 여행</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">여행 만들기</CardTitle>
              <CardDescription>이름, 기간, 국가를 입력하세요. 공개하면 초대 링크와 비밀번호로 다른 사람을 초대할 수 있어요.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel asChild>
                      <Label htmlFor="trip-name">여행 이름</Label>
                    </FieldLabel>
                    <Input
                      id="trip-name"
                      placeholder="예: 도쿄 여행"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel asChild>
                      <Label htmlFor="trip-start">시작일</Label>
                    </FieldLabel>
                    <Input
                      id="trip-start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel asChild>
                      <Label htmlFor="trip-end">종료일</Label>
                    </FieldLabel>
                    <Input
                      id="trip-end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel asChild>
                      <Label htmlFor="trip-country">국가</Label>
                    </FieldLabel>
                    <Select
                      value={countryCode || undefined}
                      onValueChange={(v) => setCountryCode(v)}
                    >
                      <SelectTrigger id="trip-country" className="w-full">
                        <SelectValue placeholder="국가 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel asChild>
                      <Label htmlFor="trip-desc">설명 (선택)</Label>
                    </FieldLabel>
                    <Input
                      id="trip-desc"
                      placeholder="간단한 설명"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <div className="flex items-center gap-2">
                      <input
                        id="trip-public"
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="rounded border-input"
                      />
                      <Label htmlFor="trip-public">공개 (초대 링크 + 비밀번호로 참여 가능)</Label>
                    </div>
                  </Field>
                  {isPublic && (
                    <Field>
                      <FieldLabel asChild>
                        <Label htmlFor="trip-password">여행 비밀번호</Label>
                      </FieldLabel>
                      <Input
                        id="trip-password"
                        type="password"
                        placeholder="참여 시 입력할 비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </Field>
                  )}
                </FieldGroup>
                {error && (
                  <p className="text-sm text-destructive" role="alert">{error}</p>
                )}
                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading ? "만드는 중…" : "만들기"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
