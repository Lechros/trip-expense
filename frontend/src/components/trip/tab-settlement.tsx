"use client";

/**
 * 정산 탭. SPEC §6.
 * GET /trips/:tripId/settlement 로 계산 결과 조회.
 * 순서: 환전 부족 경고 → 내 정산 결과 → 내 이체 목록 → 멤버별 정산 → 전체 이체 목록.
 */

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type SettlementResponse = {
  settlementError?: boolean;
  settlementErrorMessage?: string[];
  exchangeWarning: boolean;
  excludedMessages: string[];
  memberSummaries: {
    memberId: string;
    displayName: string;
    paidKrw: number;
    usedKrw: number;
    diffKrw: number;
  }[];
  transfers: {
    fromMemberId: string;
    toMemberId: string;
    fromName: string;
    toName: string;
    amountKrw: number;
  }[];
  myReceive: { from: string; amountKrw: number }[];
  mySend: { to: string; amountKrw: number }[];
  mySummary: {
    memberId: string;
    displayName: string;
    paidKrw: number;
    usedKrw: number;
    diffKrw: number;
  } | null;
};

type TabSettlementProps = { tripId: string };

function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function TabSettlement({ tripId }: TabSettlementProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["trips", tripId, "settlement"],
    queryFn: async () => {
      const res = await apiFetch<SettlementResponse>(`/trips/${tripId}/settlement`);
      if (!res.ok) throw new Error(res.error ?? "정산 정보를 불러오지 못했습니다");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 pb-8">
        <p className="text-sm text-muted-foreground">정산 계산 중…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-6 px-4 pb-8">
        <p className="text-sm text-destructive" role="alert">
          {error instanceof Error ? error.message : "정산 정보를 불러오지 못했습니다"}
        </p>
      </div>
    );
  }

  const {
    settlementError,
    settlementErrorMessage = [],
    exchangeWarning,
    excludedMessages,
    memberSummaries,
    transfers,
    myReceive,
    mySend,
    mySummary,
  } = data;

  if (settlementError && settlementErrorMessage.length > 0) {
    return (
      <div className="flex flex-col gap-6 px-4 pb-8">
        <section aria-label="정산 불가 안내">
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3">
            <p className="text-sm font-medium text-foreground mb-1">
              정산을 계산할 수 없습니다
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
              {settlementErrorMessage.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              환전 탭에서 해당 통화의 환전 기록을 추가한 뒤 다시 확인해 주세요.
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      {/* 1. 환전 부족 / 제외 항목 경고 (정산은 되었으나 일부 제외된 경우) */}
      {exchangeWarning && excludedMessages.length > 0 && (
        <section aria-label="환전·정산 안내">
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
            <p className="text-sm font-medium text-foreground mb-1">
              일부 결제가 정산에서 제외되었습니다
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
              {excludedMessages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              환전 탭에서 해당 통화의 환전 기록을 추가해 주세요.
            </p>
          </div>
        </section>
      )}

      {/* 2. 내 정산 결과 */}
      <section aria-label="내 정산 결과">
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          내 정산 결과
        </h2>
        <div className="rounded-xl border border-border bg-card px-4 pt-3 pb-4">
          {mySummary ? (
            <>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
                <p className="text-sm text-muted-foreground mt-1">사용 금액</p>
                <p className="text-right text-2xl font-bold tabular-nums text-foreground">
                  {formatKrw(mySummary.usedKrw)}
                </p>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-3 mt-3 items-baseline">
                <p className="text-sm text-muted-foreground">결제 금액</p>
                <p className="text-right text-lg font-semibold tabular-nums text-foreground">
                  {formatKrw(mySummary.paidKrw)}
                </p>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-3 mt-3 items-baseline">
                <p className="text-sm text-muted-foreground">차이</p>
                <p className="text-right text-lg font-semibold tabular-nums">
                  {mySummary.diffKrw >= 0 ? (
                    <span className="text-green-600 dark:text-green-500">
                      {formatKrw(mySummary.diffKrw)} 받기
                    </span>
                  ) : (
                    <span className="text-destructive">
                      {formatKrw(-mySummary.diffKrw)} 주기
                    </span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">정산 결과가 없습니다.</p>
          )}
        </div>
      </section>

      {/* 3. 내 이체 목록 */}
      <section aria-label="내 이체 목록">
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          내 이체 목록
        </h2>
        <div className="flex flex-col gap-2">
          {myReceive.length === 0 && mySend.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 py-6 text-center text-sm text-muted-foreground">
              받을·줄 이체가 없습니다.
            </div>
          ) : (
            <>
              {myReceive.map((r, i) => (
                <div
                  key={`rec-${i}-${r.from}-${r.amountKrw}`}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-2"
                >
                  <span className="text-foreground">
                    <span className="font-medium">{r.from}</span>
                    <span className="text-muted-foreground">에게서 </span>
                    <span className="font-semibold tabular-nums text-green-600 dark:text-green-500">
                      {formatKrw(r.amountKrw)} 받기
                    </span>
                  </span>
                </div>
              ))}
              {mySend.map((s, i) => (
                <div
                  key={`send-${i}-${s.to}-${s.amountKrw}`}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-2"
                >
                  <span className="text-foreground">
                    <span className="font-medium">{s.to}</span>
                    <span className="text-muted-foreground">에게 </span>
                    <span className="font-semibold tabular-nums text-destructive">
                      {formatKrw(s.amountKrw)} 주기
                    </span>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      <div className="border-t border-border pt-6 mt-2" aria-hidden />

      {/* 4. 멤버별 정산 */}
      <section aria-label="멤버별 정산">
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          멤버별 정산
        </h2>
        <ul className="flex flex-col gap-2" role="list">
          {memberSummaries.map((m) => (
            <li
              key={m.memberId}
              className="rounded-xl border border-border bg-card px-4 py-3 grid grid-cols-[auto_1fr] gap-x-4 items-start"
            >
              <span className="font-medium text-foreground text-sm leading-6">{m.displayName}</span>
              <div className="text-right text-sm min-w-0">
                <p className="leading-6">
                  <span className="text-muted-foreground">사용 </span>
                  <span className="tabular-nums text-foreground">{formatKrw(m.usedKrw)}</span>
                </p>
                <p className="leading-6 mt-px">
                  <span className="text-muted-foreground">결제 </span>
                  <span className="tabular-nums text-foreground">{formatKrw(m.paidKrw)}</span>
                </p>
                {Math.abs(m.diffKrw) >= 0.01 && (
                  <p className="leading-6 mt-px">
                    {m.diffKrw >= 0 ? (
                      <span className="tabular-nums text-green-600 dark:text-green-500">
                        {formatKrw(m.diffKrw)} 받기
                      </span>
                    ) : (
                      <span className="tabular-nums text-destructive">
                        {formatKrw(-m.diffKrw)} 주기
                      </span>
                    )}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. 전체 이체 목록 */}
      <section aria-label="전체 이체 목록">
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          전체 이체 목록
        </h2>
        {transfers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
            이체할 내역이 없습니다.
          </div>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {transfers.map((t, i) => (
              <li
                key={`${t.fromMemberId}-${t.toMemberId}-${i}`}
                className="rounded-xl border border-border bg-card px-4 py-2.5 flex items-center justify-between gap-2"
              >
                <span className="text-sm text-foreground">
                  <span>{t.fromName}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{t.toName}</span>
                </span>
                <span className="text-sm tabular-nums text-foreground">
                  {formatKrw(t.amountKrw)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
