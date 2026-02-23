"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Receipt, RefreshCw, Calculator, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabExpenses } from "./tab-expenses";
import { TabExchange } from "./tab-exchange";
import { TabSettlement } from "./tab-settlement";
import { TabSettings } from "./tab-settings";
import { apiFetch } from "@/lib/api";

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
 * 여행 페이지 본문: 탭 + 메인. 헤더는 서버에서 TripPageHeader로 렌더됨(SSR).
 * 탭은 URL ?tab= 에 반영되어 새로고침 시 유지됨.
 */
export function TripPage({ tripId }: TripPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<TabId>(() => parseTabFromQuery(searchParams));

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

  useQuery({
    queryKey: ["trips", tripId],
    queryFn: async () => {
      const res = await apiFetch<{ trip?: { name: string } }>(`/trips/${tripId}`);
      if (res.status === 403) router.replace("/trips");
      if (!res.ok) throw new Error(res.error ?? "Failed to load trip");
      return res.data;
    },
  });

  useQuery({
    queryKey: ["trips", tripId, "members"],
    queryFn: async () => {
      const res = await apiFetch<{ members: { id: string; displayName: string; colorHex: string | null }[] }>(
        `/trips/${tripId}/members`
      );
      if (!res.ok) throw new Error(res.error ?? "Failed to load members");
      return res.data;
    },
  });

  return (
    <div className="flex min-h-dvh flex-col">
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

