"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
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
import { ExchangeDetailSheet } from "./exchange-detail-sheet";

/** 프로토타입용. 연동 시 로그인 사용자로 교체 */
const MOCK_CURRENT_USER = "김철수";

/** 프로토타입용 mock 타입. SPEC §5 */
type MockExchangeRecord = {
  id: string;
  exchangedBy: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
  exchangedAt: string;
};

/** rate = 1 target = rate 원. 항상 원화 결제 → 외화 수령 */
const INITIAL_RECORDS: MockExchangeRecord[] = [
  {
    id: "1",
    exchangedBy: "김철수",
    sourceCurrency: "KRW",
    targetCurrency: "JPY",
    rate: 9.4,
    sourceAmount: 100000,
    targetAmount: 10638,
    exchangedAt: "2025-02-20",
  },
  {
    id: "2",
    exchangedBy: "김철수",
    sourceCurrency: "KRW",
    targetCurrency: "JPY",
    rate: 9.45,
    sourceAmount: 50000,
    targetAmount: 5291,
    exchangedAt: "2025-02-19",
  },
  {
    id: "3",
    exchangedBy: "이영희",
    sourceCurrency: "KRW",
    targetCurrency: "USD",
    rate: 1350,
    sourceAmount: 1000000,
    targetAmount: 740,
    exchangedAt: "2025-02-18",
  },
];

/** 폼에서 결제/수령 금액 모두 전달됨(둘 중 하나 입력 시 다른 쪽 자동 계산된 상태) */
function formValueToRecord(
  form: ExchangeFormValue,
  id: string
): MockExchangeRecord {
  const rate = Number(form.rate);
  const sourceAmount = Number(form.sourceAmount);
  const targetAmount = Number(form.targetAmount);
  const exchangedAt = form.exchangedAt.slice(0, 16);
  return {
    id,
    exchangedBy: form.exchangedBy,
    sourceCurrency: "KRW",
    targetCurrency: form.targetCurrency,
    rate,
    sourceAmount,
    targetAmount,
    exchangedAt,
  };
}

/** 소수 2자리까지 문자열로 (수정 폼 표시용) */
function amountToFormString(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function recordToFormValue(record: MockExchangeRecord): ExchangeFormValue {
  return {
    exchangedBy: record.exchangedBy,
    sourceCurrency: "KRW",
    targetCurrency: record.targetCurrency,
    rate: String(record.rate),
    sourceAmount: amountToFormString(record.sourceAmount),
    targetAmount: amountToFormString(record.targetAmount),
    exchangedAt:
      record.exchangedAt.length >= 16
        ? record.exchangedAt
        : `${record.exchangedAt}T00:00`,
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

/**
 * 환전 탭. SPEC §5: 환전 기록 목록·추가·수정·삭제.
 * 목록은 로그인 사용자(자기 자신)의 환전 기록만 표시.
 */
export function TabExchange() {
  const [addOpen, setAddOpen] = useState(false);
  const [records, setRecords] = useState<MockExchangeRecord[]>(INITIAL_RECORDS);
  const myRecords = records.filter((r) => r.exchangedBy === MOCK_CURRENT_USER);
  const [selectedRecord, setSelectedRecord] =
    useState<MockExchangeRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitialValue, setEditInitialValue] =
    useState<ExchangeFormValue | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [recordToDeleteId, setRecordToDeleteId] = useState<string | null>(null);

  const handleAddSubmit = useCallback(
    (form: ExchangeFormValue, editId?: string) => {
      if (editId) {
        const updated = formValueToRecord(form, editId);
        setRecords((prev) =>
          prev.map((r) => (r.id === editId ? updated : r))
        );
        setEditOpen(false);
        setEditId(null);
        setEditInitialValue(null);
        setSelectedRecord(updated);
        setDetailOpen(true);
      } else {
        const newRecord = formValueToRecord(form, `new-${Date.now()}`);
        setRecords((prev) => [newRecord, ...prev]);
      }
    },
    []
  );

  const openDetail = useCallback((record: MockExchangeRecord) => {
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

  const handleDeleteConfirm = useCallback(() => {
    if (recordToDeleteId) {
      setRecords((prev) => prev.filter((r) => r.id !== recordToDeleteId));
      setRecordToDeleteId(null);
    }
    setDeleteConfirmOpen(false);
  }, [recordToDeleteId]);

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

        {/* 목록: 토스 통장형 평면 리스트. 월.일(연속 시 생략). 올해 아닌 구간 맨 위에만 "YYYY년" 표시 */}
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
            <Plus className="size-5" aria-hidden />
            환전 추가
          </Button>
        </div>
      </div>

      <ExchangeAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
        defaultExchangedBy={MOCK_CURRENT_USER}
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
        defaultExchangedBy={MOCK_CURRENT_USER}
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
