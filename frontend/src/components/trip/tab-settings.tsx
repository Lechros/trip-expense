"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, X } from "lucide-react";

/** 국가 목록 (ISO 3166-1 alpha-2). 연동 시 필요 목록으로 교체 */
const COUNTRY_OPTIONS = [
  { value: "KR", label: "대한민국" },
  { value: "JP", label: "일본" },
  { value: "US", label: "미국" },
  { value: "CN", label: "중국" },
  { value: "TH", label: "태국" },
  { value: "VN", label: "베트남" },
  { value: "SG", label: "싱가포르" },
  { value: "TW", label: "대만" },
  { value: "HK", label: "홍콩" },
  { value: "GB", label: "영국" },
  { value: "FR", label: "프랑스" },
  { value: "DE", label: "독일" },
  { value: "IT", label: "이탈리아" },
  { value: "ES", label: "스페인" },
  { value: "AU", label: "호주" },
];

/** 추가 통화 '선택 안 함'용 값 (Select는 빈 문자열 value 불가) */
const ADDITIONAL_CURRENCY_NONE = "__none__";

/** 통화 목록. 연동 시 트립 허용 통화 등으로 제한 가능 */
const CURRENCY_OPTIONS = [
  { value: "KRW", label: "KRW (원)" },
  { value: "JPY", label: "JPY (엔)" },
  { value: "USD", label: "USD (달러)" },
  { value: "EUR", label: "EUR (유로)" },
  { value: "CNY", label: "CNY (위안)" },
  { value: "THB", label: "THB (바트)" },
  { value: "GBP", label: "GBP (파운드)" },
  { value: "AUD", label: "AUD (호주 달러)" },
];

/**
 * 설정 탭. SPEC §7: 여행 설정(이름, 설명, 기간, 국가, 통화), 공개 여부·여행 비밀번호, 멤버 관리(owner만).
 * 여행 설정·공개 여부는 "수정" 버튼으로 편집 시트에서 변경. 저장은 목업(로컬 상태만 반영).
 */

/** 목업: 현재 사용자가 owner인지 */
const MOCK_IS_OWNER = true;

type TripForm = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  countryCode: string;
  baseCurrency: string;
  additionalCurrency: string;
  isPublic: boolean;
  hasPassword: boolean;
};

const INITIAL_TRIP: TripForm = {
  name: "제주도 여행",
  description: "2025년 2월 제주 3박 4일",
  startDate: "2025-02-18",
  endDate: "2025-02-21",
  countryCode: "KR",
  baseCurrency: "KRW",
  additionalCurrency: "JPY",
  isPublic: false,
  hasPassword: false,
};

type MockMember = {
  id: string;
  displayName: string;
  role: "owner" | "member";
};

const MOCK_MEMBERS: MockMember[] = [
  { id: "1", displayName: "김철수", role: "owner" },
  { id: "2", displayName: "이영희", role: "member" },
  { id: "3", displayName: "박민수", role: "member" },
];

export function TabSettings() {
  const [trip, setTrip] = useState<TripForm>(INITIAL_TRIP);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<TripForm>(INITIAL_TRIP);

  const openEdit = () => {
    setEditForm({ ...trip });
    setEditOpen(true);
  };

  const closeEdit = () => setEditOpen(false);

  const saveEdit = () => {
    setTrip({ ...editForm });
    setEditOpen(false);
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      {/* 1. 여행 설정 (이름, 설명, 기간, 국가, 통화) */}
      <section aria-label="여행 설정">
        <div className="flex items-center justify-between gap-2 pb-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            여행 설정
            {!MOCK_IS_OWNER && (
              <span className="ml-1.5 text-xs font-normal">(수정 권한: 여행 생성자만)</span>
            )}
          </h2>
          {MOCK_IS_OWNER && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openEdit}
            >
              <Pencil />
              수정
            </Button>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
            <span className="text-sm text-muted-foreground">이름</span>
            <p className="text-sm text-foreground">{trip.name}</p>
          </div>
          {trip.description && (
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
              <span className="text-sm text-muted-foreground">설명</span>
              <p className="text-sm text-foreground">{trip.description}</p>
            </div>
          )}
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
            <span className="text-sm text-muted-foreground">기간</span>
            <p className="text-sm text-foreground tabular-nums">
              {trip.startDate} ~ {trip.endDate}
            </p>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
            <span className="text-sm text-muted-foreground">국가</span>
            <p className="text-sm text-foreground">{trip.countryCode}</p>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
            <span className="text-sm text-muted-foreground">통화</span>
            <p className="text-sm text-foreground">
              {trip.baseCurrency}
              {trip.additionalCurrency && `, ${trip.additionalCurrency}`}
            </p>
          </div>
        </div>
      </section>

      {/* 2. 공개 여부 · 여행 비밀번호 (수정은 편집 시트에서) */}
      <section aria-label="공개 여부">
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          공개 여부
        </h2>
        <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-3">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
            <span className="text-sm text-muted-foreground">공개</span>
            <p className="text-sm text-foreground">
              {trip.isPublic ? "공개 (링크를 가진 사용자만 접근)" : "비공개"}
            </p>
          </div>
          {trip.isPublic && (
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline pt-1 border-t border-border">
              <span className="text-sm text-muted-foreground">여행 비밀번호</span>
              <p className="text-sm text-foreground">
                {trip.hasPassword ? "설정됨" : "미설정 (공개 시 필수)"}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3. 멤버 관리 (owner만) */}
      <section aria-label="멤버 관리">
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          멤버 관리
          {!MOCK_IS_OWNER && (
            <span className="ml-1.5 text-xs font-normal">(여행 생성자만)</span>
          )}
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border" role="list">
            {MOCK_MEMBERS.map((m) => (
              <li
                key={m.id}
                className="px-4 py-3 flex items-center justify-between gap-2"
              >
                <span className="text-sm text-foreground">{m.displayName}</span>
                <span className="text-xs text-muted-foreground">
                  {m.role === "owner" ? "생성자" : "멤버"}
                </span>
              </li>
            ))}
          </ul>
          {MOCK_IS_OWNER && (
            <div className="px-4 py-3 border-t border-border">
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                멤버 내보내기
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 여행 설정 편집 시트 (풀스크린 Dialog) */}
      <Dialog open={editOpen} onOpenChange={(o) => !o && closeEdit()}>
        <DialogContent
          showCloseButton={false}
          className="dialog-slide-from-bottom inset-0 left-0 top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col overflow-hidden bg-background data-[state=open]:animate-none data-[state=closed]:animate-none"
        >
          <DialogTitle className="sr-only">여행 설정 수정</DialogTitle>
          <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-3 sm:px-6">
            <div className="w-9" aria-hidden />
            <h2 className="text-foreground text-center text-base font-semibold">
              여행 설정 수정
            </h2>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 rounded-full"
                aria-label="닫기"
                onClick={closeEdit}
              >
                <X className="size-5" />
              </Button>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-28 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trip-name" className="text-sm text-muted-foreground">이름</Label>
                <Input
                  id="trip-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="min-h-12 bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-description" className="text-sm text-muted-foreground">설명</Label>
                <Input
                  id="trip-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="min-h-12 bg-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trip-startDate" className="text-sm text-muted-foreground">시작일</Label>
                  <Input
                    id="trip-startDate"
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="min-h-12 bg-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-endDate" className="text-sm text-muted-foreground">종료일</Label>
                  <Input
                    id="trip-endDate"
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="min-h-12 bg-transparent"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-countryCode" className="text-sm text-muted-foreground">국가</Label>
                <Select
                  value={editForm.countryCode}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, countryCode: v }))}
                >
                  <SelectTrigger id="trip-countryCode" className="min-h-12 bg-transparent w-full">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trip-baseCurrency" className="text-sm text-muted-foreground">기본 통화</Label>
                  <Select
                    value={editForm.baseCurrency}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, baseCurrency: v }))}
                  >
                    <SelectTrigger id="trip-baseCurrency" className="min-h-12 bg-transparent w-full">
                      <SelectValue placeholder="통화 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trip-additionalCurrency" className="text-sm text-muted-foreground">추가 통화</Label>
                  <Select
                    value={editForm.additionalCurrency || ADDITIONAL_CURRENCY_NONE}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, additionalCurrency: v === ADDITIONAL_CURRENCY_NONE ? "" : v }))
                    }
                  >
                    <SelectTrigger id="trip-additionalCurrency" className="min-h-12 bg-transparent w-full">
                      <SelectValue placeholder="선택 안 함" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ADDITIONAL_CURRENCY_NONE}>선택 안 함</SelectItem>
                      {CURRENCY_OPTIONS.filter((c) => c.value !== editForm.baseCurrency).map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="trip-isPublic" className="text-sm text-muted-foreground">공개 (링크 보유자만 접근)</Label>
                  <input
                    id="trip-isPublic"
                    type="checkbox"
                    checked={editForm.isPublic}
                    onChange={(e) => setEditForm((p) => ({ ...p, isPublic: e.target.checked }))}
                    className="size-4 rounded border-border"
                  />
                </div>
                {editForm.isPublic && (
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="trip-hasPassword" className="text-sm text-muted-foreground">여행 비밀번호 설정</Label>
                    <input
                      id="trip-hasPassword"
                      type="checkbox"
                      checked={editForm.hasPassword}
                      onChange={(e) => setEditForm((p) => ({ ...p, hasPassword: e.target.checked }))}
                      className="size-4 rounded border-border"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-10 w-full">
            <div className="h-8 w-full bg-linear-to-t from-background to-transparent pointer-events-none" aria-hidden />
            <div className="flex w-full gap-2 px-6 pt-1 pb-4 bg-background">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-12 flex-1 touch-manipulation"
                onClick={closeEdit}
              >
                취소
              </Button>
              <Button
                type="button"
                size="lg"
                className="min-h-12 flex-1 touch-manipulation"
                onClick={saveEdit}
              >
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
