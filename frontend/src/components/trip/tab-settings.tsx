"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { TripEditDialog, type TripForm } from "./trip-edit-dialog";
import { COUNTRY_LABELS } from "@/lib/countries";

/**
 * 설정 탭. SPEC §7: 여행 설정(이름, 설명, 기간, 국가, 통화), 공개 여부·여행 비밀번호, 멤버 관리(owner만).
 * 여행 설정·공개 여부는 "수정" 버튼으로 편집 시트에서 변경. 저장은 목업(로컬 상태만 반영).
 */

/** 목업: 현재 사용자가 owner인지 */
const MOCK_IS_OWNER = true;

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

  const openEdit = () => setEditOpen(true);

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
            <p className="text-sm text-foreground">{COUNTRY_LABELS[trip.countryCode] ?? trip.countryCode}</p>
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

<TripEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        value={trip}
        onSave={setTrip}
      />
    </div>
  );
}
