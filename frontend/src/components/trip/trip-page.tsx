"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plane, Receipt, RefreshCw, Calculator, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TabExpenses } from "./tab-expenses";
import { TabExchange } from "./tab-exchange";

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
 * SPEC §4.4(지출), §5(환전), §6(정산), §7(설정).
 */
export function TripPage({ tripId }: TripPageProps) {
  const [tab, setTab] = useState<TabId>("expenses");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="shrink-0 -ml-1"
            aria-label="여행 목록으로"
          >
            <Link href="/">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plane className="size-4" aria-hidden />
            </div>
            <span className="truncate text-base font-semibold tracking-tight text-foreground">
              여행 이름
            </span>
          </div>
          <div className="w-9 shrink-0" aria-hidden />
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
                <Icon className="size-4 shrink-0" aria-hidden />
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
            <TabSettlementPlaceholder />
          )}
          {tab === "settings" && (
            <TabSettingsPlaceholder />
          )}
        </div>
      </main>
    </div>
  );
}

function TabSettlementPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="size-4 text-primary" />
          정산
        </CardTitle>
        <CardDescription>
          기준 통화(KRW) 환산, 멤버별 결제/사용 금액·차이, 이체 목록(A가 B에게 X원). 환전 기록 없음 시 안내.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          (정산 결과·이체 목록 UI 설계 예정)
        </p>
      </CardContent>
    </Card>
  );
}

function TabSettingsPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="size-4 text-primary" />
          설정
        </CardTitle>
        <CardDescription>
          여행 설정(이름, 설명, 기간, 국가, 통화), 공개 여부·여행 비밀번호, 멤버 관리(owner만).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          (여행 설정·멤버 관리 UI 설계 예정)
        </p>
      </CardContent>
    </Card>
  );
}
