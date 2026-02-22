"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plane, Receipt, RefreshCw, Calculator, Settings } from "lucide-react";
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

type TripPageProps = {
  tripId: string;
};

/**
 * 여행 페이지: [지출, 환전, 정산, 설정] 4탭.
 * GET /trips/:id로 여행 정보 로드 후 헤더에 이름 표시.
 */
export function TripPage({ tripId }: TripPageProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("expenses");
  const [tripName, setTripName] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ trip?: { name: string } }>(`/trips/${tripId}`).then((res) => {
      if (res.ok && res.data.trip) setTripName(res.data.trip.name);
      if (res.status === 403) router.replace("/trips");
    });
  }, [tripId, router]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane aria-hidden />
          </div>
          <span className="truncate text-base font-semibold tracking-tight text-foreground">
            {tripName ?? "…"}
          </span>
        </div>
      </header>

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
            <TabExpenses />
          )}
          {tab === "exchange" && (
            <TabExchange />
          )}
          {tab === "settlement" && (
            <TabSettlement />
          )}
          {tab === "settings" && (
            <TabSettings />
          )}
        </div>
      </main>
    </div>
  );
}

