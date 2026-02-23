"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ExchangeAddSheet,
  type ExchangeFormValue,
} from "./exchange-add-sheet";
import { ExchangeDetailSheet, type ExchangeDetailRecord } from "./exchange-detail-sheet";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

const CURRENCY_LABEL: Record<string, string> = {
  KRW: "원",
  JPY: "엔",
  USD: "달러",
};

/** API 응답 타입 (GET /trips/:tripId/exchanges) */
type ApiExchange = {
  id: string;
  tripId: string;
  exchangedBy: { memberId: string; displayName: string };
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
  exchangedAt: string;
  recordedAt: string;
};

function apiExchangeToDetail(api: ApiExchange): ExchangeDetailRecord {
  return {
    id: api.id,
    exchangedBy: api.exchangedBy.displayName,
    sourceCurrency: api.sourceCurrency,
    targetCurrency: api.targetCurrency,
    rate: api.rate,
    sourceAmount: api.sourceAmount,
    targetAmount: api.targetAmount,
    exchangedAt: api.exchangedAt,
  };
}

/** 소수 2자리까지 문자열로 (수정 폼 표시용) */
function amountToFormString(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function recordToFormValue(record: ExchangeDetailRecord): ExchangeFormValue {
  return {
    exchangedBy: record.exchangedBy,
    sourceCurrency: record.sourceCurrency,
    targetCurrency: record.targetCurrency,
    rate: String(record.rate),
    sourceAmount: amountToFormString(record.sourceAmount),
    targetAmount: amountToFormString(record.targetAmount),
    exchangedAt:
      record.exchangedAt.length >= 16
        ? record.exchangedAt
        : `${record.exchangedAt.slice(0, 10)}T00:00`,
  };
}

/** 수령 금액용. 소수 2자리까지 표시 */
function formatAmount(amount: number, currency: string): string {
  const opts: Intl.NumberFormatOptions = { maximumFractionDigits: 2, minimumFractionDigits: 0 };
  if (currency === "KRW") return `${amount.toLocaleString("ko-KR", opts)}원`;
  return `${amount.toLocaleString("ko-KR", opts)} ${currency}`;
}

/** 메인 목록용 환율 표기: 1 외화 = rate 원 (소수 2자리) */
function formatRateMain(rate: number, targetCurrency: string): string {
  const opts: Intl.NumberFormatOptions = { maximumFractionDigits: 2, minimumFractionDigits: 0 };
  return `1 ${targetCurrency} = ${rate.toLocaleString("ko-KR", opts)}원`;
}

/** exchangedAt "2025-02-20" → "2.20" (월.일) */
function formatMonthDay(exchangedAt: string): string {
  const [y, m, d] = exchangedAt.slice(0, 10).split("-").map(Number);
  return `${m}.${d}`;
}

function getDateKey(exchangedAt: string): string {
  return exchangedAt.slice(0, 10);
}

function isCurrentYear(exchangedAt: string): boolean {
  return new Date(exchangedAt).getFullYear() === new Date().getFullYear();
}

function getYear(exchangedAt: string): number {
  return new Date(exchangedAt).getFullYear();
}

type TabExchangeProps = { tripId: string };

/**
 * 환전 탭. SPEC §5: 환전 기록 목록·추가·수정·삭제.
 * API가 요청자(자기 자신)의 환전 기록만 반환하므로 그대로 목록 표시.
 */
export function TabExchange({ tripId }: TabExchangeProps) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const guest = useAuthStore((s) => s.guest);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<ExchangeDetailRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitialValue, setEditInitialValue] =
    useState<ExchangeFormValue | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDeleteId, setRecordToDeleteId] = useState<string | null>(null);

  const exchangesQuery = useQuery({
    queryKey: ["trips", tripId, "exchanges"],
    queryFn: async () => {
      const res = await apiFetch<{ exchanges: ApiExchange[] }>(
        `/trips/${tripId}/exchanges`
      );
      if (!res.ok) throw new Error(res.error ?? "Failed to load exchanges");
      return res.data;
    },
  });

  const tripQuery = useQuery({
    queryKey: ["trips", tripId],
    queryFn: async () => {
      const res = await apiFetch<{
        trip?: { baseCurrency: string; additionalCurrency?: string | null };
      }>(`/trips/${tripId}`);
      if (!res.ok) throw new Error(res.error ?? "Failed to load trip");
      return res.data;
    },
  });

  const membersQuery = useQuery({
    queryKey: ["trips", tripId, "members"],
    queryFn: async () => {
      const res = await apiFetch<{ members: { id: string; displayName: string; userId?: string | null }[] }>(
        `/trips/${tripId}/members`
      );
      if (!res.ok) throw new Error(res.error ?? "Failed to load members");
      return res.data;
    },
  });

  const baseCurrency = tripQuery.data?.trip?.baseCurrency ?? "KRW";
  const additionalCurrency = tripQuery.data?.trip?.additionalCurrency ?? null;
  const targetCurrencyOptions =
    additionalCurrency ?
      [{ value: additionalCurrency, label: `${additionalCurrency} (${CURRENCY_LABEL[additionalCurrency] ?? additionalCurrency})` }]
    : [];

  const members = membersQuery.data?.members ?? [];
  const currentMemberDisplayName =
    user
      ? members.find((m) => m.userId === user.id)?.displayName
      : guest
        ? members.find((m) => m.id === guest.memberId)?.displayName
        : null;
  const defaultExchangedBy = currentMemberDisplayName ?? "나";

  const myRecords: ExchangeDetailRecord[] = (exchangesQuery.data?.exchanges ?? []).map(
    apiExchangeToDetail
  );

  const invalidateExchanges = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["trips", tripId, "exchanges"] });
  }, [queryClient, tripId]);

  const handleAddSubmit = useCallback(
    async (form: ExchangeFormValue, editIdArg?: string) => {
      const exchangedAt =
        form.exchangedAt.length >= 16
          ? form.exchangedAt
          : `${form.exchangedAt.slice(0, 10)}T00:00:00.000Z`;
      const rate = Number(form.rate);
      const sourceAmount = Number(form.sourceAmount);

      if (editIdArg) {
        const res = await apiFetch<{ exchange: ApiExchange }>(
          `/trips/${tripId}/exchanges/${editIdArg}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              rate,
              sourceAmount,
              exchangedAt,
            }),
          }
        );
        if (!res.ok) throw new Error(res.error ?? "Failed to update");
        invalidateExchanges();
        const updated = apiExchangeToDetail(res.data!.exchange);
        setEditOpen(false);
        setEditId(null);
        setEditInitialValue(null);
        setSelectedRecord(updated);
        setDetailOpen(true);
      } else {
        const res = await apiFetch<{ exchange: ApiExchange }>(
          `/trips/${tripId}/exchanges`,
          {
            method: "POST",
            body: JSON.stringify({
              sourceCurrency: form.sourceCurrency,
              targetCurrency: form.targetCurrency,
              rate,
              sourceAmount,
              exchangedAt,
            }),
          }
        );
        if (!res.ok) throw new Error(res.error ?? "Failed to create");
        invalidateExchanges();
        setAddOpen(false);
      }
    },
    [tripId, invalidateExchanges]
  );

  const openDetail = useCallback((record: ExchangeDetailRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  }, []);

  const handleEditFromDetail = useCallback(() => {
    if (!selectedRecord) return;
    setEditInitialValue(recordToFormValue(selectedRecord));
    setEditId(selectedRecord.id);
    setDetailOpen(false);
    setEditOpen(true);
  }, [selectedRecord]);

  const handleDeleteFromDetail = useCallback(() => {
    if (!selectedRecord) return;
    setRecordToDeleteId(selectedRecord.id);
    setDetailOpen(false);
    setDeleteConfirmOpen(true);
  }, [selectedRecord]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!recordToDeleteId) {
      setDeleteConfirmOpen(false);
      return;
    }
    const res = await apiFetch(`/trips/${tripId}/exchanges/${recordToDeleteId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(res.error ?? "Failed to delete");
    invalidateExchanges();
    setRecordToDeleteId(null);
    setDeleteConfirmOpen(false);
  }, [tripId, recordToDeleteId, invalidateExchanges]);

  useEffect(() => {
    if (deleteConfirmOpen) return;
    const t = setTimeout(() => {
      document.body.style.pointerEvents = "";
    }, 100);
    return () => clearTimeout(t);
  }, [deleteConfirmOpen]);

  return (
    <div className="flex flex-col min-h-full">
      {/* 스크롤 영역: 하단 고정 버튼 높이만큼 padding-bottom으로 마지막 항목이 가려지지 않도록 */}
      <div className="flex flex-col gap-4 pb-28">
        {/* 상단 영역: 지출 탭과 레이아웃 통일(환전 탭은 필터 등 상단 버튼 없음) */}
        <div className="flex flex-wrap items-center gap-2 px-4" aria-hidden />

        {/* 목록 없을 때 안내 / 목록: 토스 통장형 평면 리스트 */}
        {exchangesQuery.isLoading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">불러오는 중…</p>
        ) : myRecords.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-muted-foreground">환전 기록이 없습니다.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              하단 버튼으로 첫 환전 기록을 추가해 보세요.
            </p>
          </div>
        ) : (
        <ul className="flex flex-col" role="list" aria-label="환전 기록 목록">
        {myRecords.map((record, index) => {
          const dateKey = getDateKey(record.exchangedAt);
          const prevDateKey =
            index > 0 ? getDateKey(myRecords[index - 1].exchangedAt) : "";
          const showDate = dateKey !== prevDateKey;
          const recordYear = getYear(record.exchangedAt);
          const prevYear =
            index > 0 ? getYear(myRecords[index - 1].exchangedAt) : null;
          const showYearHeader =
            !isCurrentYear(record.exchangedAt) &&
            (prevYear === null || prevYear !== recordYear);

          return (
            <React.Fragment key={record.id}>
              {showYearHeader && (
                <li
                  className={cn(
                    "pt-3 pb-1 px-4",
                    index > 0 && "border-t border-border"
                  )}
                  aria-hidden
                >
                  <p className="text-sm text-muted-foreground">
                    {recordYear}년
                  </p>
                </li>
              )}
              <li>
                <button
                  type="button"
                  className={cn(
                    "w-full py-4 text-left",
                    "transition-colors hover:bg-muted/50 active:bg-muted touch-manipulation min-h-14"
                  )}
                  onClick={() => openDetail(record)}
                  aria-label={`${formatRateMain(record.rate, record.targetCurrency)}, 수령 ${formatAmount(record.targetAmount, record.targetCurrency)}. 상세 보기`}
                >
                  <div className="flex items-start gap-3 px-4">
                    <div className="w-11 shrink-0 h-5 flex items-center text-muted-foreground">
                      {showDate ? (
                        <span className="text-sm tabular-nums">
                          {formatMonthDay(record.exchangedAt)}
                        </span>
                      ) : (
                        <span
                          className="invisible text-sm tabular-nums"
                          aria-hidden
                        >
                          {formatMonthDay(record.exchangedAt)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex items-center">
                      <p className="text-sm text-muted-foreground truncate min-w-0">
                        {formatRateMain(record.rate, record.targetCurrency)}
                      </p>
                    </div>
                    <div className="shrink-0 h-5 flex items-center">
                      <span className="text-lg font-semibold tabular-nums text-foreground">
                        {formatAmount(record.targetAmount, record.targetCurrency)}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            </React.Fragment>
          );
        })}
        </ul>
        )}
      </div>

      {/* 하단 고정: 그라데이션(클릭 통과) + 환전 추가 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div
          className="h-8 w-full bg-gradient-to-t from-background to-transparent pointer-events-none"
          aria-hidden
        />
        <div className="px-4 pt-1 pb-4 bg-background">
          <Button
            type="button"
            size="lg"
            className="w-full min-h-12 gap-2 touch-manipulation"
            aria-label="환전 기록 추가"
            onClick={() => setAddOpen(true)}
          >
            <Plus aria-hidden />
            환전 추가
          </Button>
        </div>
      </div>

      <ExchangeAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
        defaultExchangedBy={defaultExchangedBy}
        baseCurrency={baseCurrency}
        targetCurrencyOptions={targetCurrencyOptions}
        defaultTargetCurrency={additionalCurrency ?? undefined}
      />

      <ExchangeAddSheet
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
          setEditInitialValue(null);
          setDetailOpen(true);
        }}
        onSubmit={handleAddSubmit}
        defaultExchangedBy={defaultExchangedBy}
        baseCurrency={baseCurrency}
        targetCurrencyOptions={targetCurrencyOptions}
        defaultTargetCurrency={additionalCurrency ?? undefined}
        initialValue={editInitialValue}
        editId={editId}
      />

      <ExchangeDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        record={selectedRecord}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>환전 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 환전 기록을 삭제할까요? 삭제하면 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
