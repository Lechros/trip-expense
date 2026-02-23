"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plane, Receipt, RefreshCw, Calculator, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabExpenses } from "./tab-expenses";
import { TabExchange } from "./tab-exchange";
import { TabSettlement } from "./tab-settlement";
import { TabSettings } from "./tab-settings";
import { TripMemberProfileSheet } from "./trip-member-profile-sheet";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

const TABS = [
  { id: "expenses" as const, label: "지출", icon: Receipt },
  { id: "exchange" as const, label: "환전", icon: RefreshCw },
  { id: "settlement" as const, label: "정산", icon: Calculator },
  { id: "settings" as const, label: "설정", icon: Settings },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_IDS: TabId[] = ["expenses", "exchange", "settlement", "settings"];

function parseTabFromQuery(searchParams: ReturnType<typeof useSearchParams>): TabId {
  const t = searchParams.get("tab");
  return t && TAB_IDS.includes(t as TabId) ? (t as TabId) : "expenses";
}

type TripPageProps = {
  tripId: string;
};

/**
 * 여행 페이지: [지출, 환전, 정산, 설정] 4탭.
 * 탭은 URL ?tab= 에 반영되어 새로고침 시 유지됨.
 */
type ApiMember = {
  id: string;
  displayName: string;
  colorHex: string | null;
  role: string;
  userId: string | null;
  guestId: string | null;
};

export function TripPage({ tripId }: TripPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const guest = useAuthStore((s) => s.guest);
  const [tab, setTabState] = useState<TabId>(() => parseTabFromQuery(searchParams));
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const setTab = useCallback(
    (next: TabId) => {
      setTabState(next);
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const fromUrl = parseTabFromQuery(searchParams);
    setTabState(fromUrl);
  }, [searchParams]);

  const { data: tripData } = useQuery({
    queryKey: ["trips", tripId],
    queryFn: async () => {
      const res = await apiFetch<{ trip?: { name: string } }>(`/trips/${tripId}`);
      if (res.status === 403) router.replace("/trips");
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

  const tripName = tripData?.trip?.name ?? null;
  const invalidateMembers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["trips", tripId, "members"] });
  }, [queryClient, tripId]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane aria-hidden />
          </div>
          <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
            {tripName ?? "…"}
          </span>
          {currentMember && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1.5 rounded-full pl-1.5 pr-2.5 py-1.5 h-auto min-h-9 touch-manipulation"
              onClick={() => setProfileSheetOpen(true)}
              aria-label="이 여행에서의 내 프로필 수정"
            >
              <span
                className="size-6 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: currentMember.colorHex ?? "#94a3b8" }}
                aria-hidden
              />
              <span className="max-w-[100px] truncate text-sm text-foreground">
                {currentMember.displayName}
              </span>
            </Button>
          )}
        </div>
      </header>

      {currentMember && (
        <TripMemberProfileSheet
          open={profileSheetOpen}
          onOpenChange={setProfileSheetOpen}
          tripId={tripId}
          displayName={currentMember.displayName}
          colorHex={currentMember.colorHex}
          onSaved={invalidateMembers}
        />
      )}

      {/* 탭: 터치 영역 최소 48px 높이 (접근성·WCAG 터치 타겟) */}
      <nav
        className="shrink-0 border-b border-border/60 bg-background"
        aria-label="여행 메뉴"
      >
        <div className="mx-auto flex max-w-lg">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = tab === id;
            return (
              <Button
                key={id}
                type="button"
                variant="ghost"
                size="sm"
                className={`flex-1 gap-1.5 rounded-none border-b-2 min-h-12 py-3 touch-manipulation ${
                  isActive
                    ? "border-primary text-primary shadow-none"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTab(id)}
                aria-current={isActive ? "page" : undefined}
                aria-label={isActive ? `${label} (선택됨)` : label}
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </Button>
            );
          })}
        </div>
      </nav>

      <main className="flex flex-1 flex-col overflow-auto py-6 sm:py-8">
        <div className="mx-auto w-full max-w-lg flex flex-1 flex-col">
          {tab === "expenses" && (
            <TabExpenses tripId={tripId} />
          )}
          {tab === "exchange" && (
            <TabExchange tripId={tripId} />
          )}
          {tab === "settlement" && (
            <TabSettlement tripId={tripId} />
          )}
          {tab === "settings" && (
            <TabSettings tripId={tripId} />
          )}
        </div>
      </main>
    </div>
  );
}

