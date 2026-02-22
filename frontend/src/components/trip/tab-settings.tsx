"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { TripEditDialog, type TripForm } from "./trip-edit-dialog";
import { COUNTRY_LABELS } from "@/lib/countries";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

/**
 * 설정 탭. SPEC §7: 여행 설정(이름, 설명, 기간, 국가, 통화), 공개 여부·여행 비밀번호, 멤버 관리(owner만).
 * GET /trips/:id, GET /trips/:tripId/members 로 데이터 로드, PATCH /trips/:id 로 저장 (owner만).
 */

type ApiTrip = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  countryCode: string;
  baseCurrency: string;
  additionalCurrency: string | null;
  isPublic: boolean;
  createdAt: string;
};

type ApiMember = {
  id: string;
  displayName: string;
  role: string;
  userId: string | null;
  guestId: string | null;
};

function apiTripToForm(t: ApiTrip): TripForm {
  const startDate = t.startDate.slice(0, 10);
  const endDate = t.endDate.slice(0, 10);
  return {
    name: t.name,
    description: t.description ?? "",
    startDate,
    endDate,
    countryCode: t.countryCode,
    baseCurrency: t.baseCurrency,
    additionalCurrency: t.additionalCurrency ?? "",
    isPublic: t.isPublic,
    hasPassword: t.isPublic, // 공개 시 비밀번호 있다고 가정(API는 반환 안 함)
  };
}

type TabSettingsProps = { tripId: string };

export function TabSettings({ tripId }: TabSettingsProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const guest = useAuthStore((s) => s.guest);

  const [editOpen, setEditOpen] = useState(false);

  const tripQuery = useQuery({
    queryKey: ["trips", tripId],
    queryFn: async () => {
      const res = await apiFetch<{ trip: ApiTrip }>(`/trips/${tripId}`);
      if (!res.ok) throw new Error(res.error ?? "Failed to load trip");
      return res.data;
    },
  });

  const membersQuery = useQuery({
    queryKey: ["trips", tripId, "members"],
    queryFn: async () => {
      const res = await apiFetch<{ members: ApiMember[] }>(`/trips/${tripId}/members`);
      if (!res.ok) throw new Error(res.error ?? "Failed to load members");
      return res.data;
    },
  });

  const trip: TripForm | null = tripQuery.data?.trip
    ? apiTripToForm(tripQuery.data.trip)
    : null;
  const members = membersQuery.data?.members ?? [];
  const currentMember = useMemo(
    () =>
      user
        ? members.find((m) => m.userId === user.id)
        : guest
          ? members.find((m) => m.id === guest.memberId)
          : null,
    [user, guest, members]
  );
  const isOwner = currentMember?.role === "owner";

  const openEdit = () => setEditOpen(true);

  const handleSave = async (value: TripForm): Promise<void> => {
    const res = await apiFetch<{ trip: ApiTrip }>(`/trips/${tripId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: value.name,
        description: value.description || null,
        startDate: value.startDate,
        endDate: value.endDate,
        countryCode: value.countryCode,
        baseCurrency: "KRW",
        additionalCurrency: value.additionalCurrency || null,
        isPublic: value.isPublic,
        ...(value.isPublic && value.password ? { password: value.password } : undefined),
      }),
    });
    if (!res.ok) throw new Error(res.error ?? "저장에 실패했습니다");
    queryClient.invalidateQueries({ queryKey: ["trips", tripId] });
    setEditOpen(false);
  };

  if (tripQuery.isLoading || !trip) {
    return (
      <div className="flex flex-col gap-6 px-4 pb-8">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      {/* 1. 여행 설정 (이름, 설명, 기간, 국가, 통화) */}
      <section aria-label="여행 설정">
        <div className="flex items-center justify-between gap-2 pb-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            여행 설정
            {!isOwner && (
              <span className="ml-1.5 text-xs font-normal">(수정 권한: 여행 생성자만)</span>
            )}
          </h2>
          {isOwner && (
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
          {!isOwner && (
            <span className="ml-1.5 text-xs font-normal">(여행 생성자만)</span>
          )}
        </h2>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border" role="list">
            {members.map((m) => (
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
          {isOwner && (
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
        onSave={handleSave}
      />
    </div>
  );
}
