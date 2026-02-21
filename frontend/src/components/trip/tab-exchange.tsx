"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
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

const INITIAL_RECORDS: MockExchangeRecord[] = [
  {
    id: "1",
    exchangedBy: "김철수",
    sourceCurrency: "KRW",
    targetCurrency: "JPY",
    rate: 0.106,
    sourceAmount: 100000,
    targetAmount: 10600,
    exchangedAt: "2025-02-20",
  },
  {
    id: "2",
    exchangedBy: "김철수",
    sourceCurrency: "JPY",
    targetCurrency: "KRW",
    rate: 9.4,
    sourceAmount: 10000,
    targetAmount: 94000,
    exchangedAt: "2025-02-19",
  },
  {
    id: "3",
    exchangedBy: "이영희",
    sourceCurrency: "JPY",
    targetCurrency: "KRW",
    rate: 9.35,
    sourceAmount: 50000,
    targetAmount: 467500,
    exchangedAt: "2025-02-18",
  },
];

function formValueToRecord(
  form: ExchangeFormValue,
  id: string
): MockExchangeRecord {
  const rate = Number(form.rate);
  const sourceAmount = Number(form.sourceAmount);
  const targetAmount = Math.round(rate * sourceAmount);
  const exchangedAt = form.exchangedAt.slice(0, 16);
  return {
    id,
    exchangedBy: form.exchangedBy,
    sourceCurrency: form.sourceCurrency,
    targetCurrency: form.targetCurrency,
    rate,
    sourceAmount,
    targetAmount,
    exchangedAt,
  };
}

function recordToFormValue(record: MockExchangeRecord): ExchangeFormValue {
  return {
    exchangedBy: record.exchangedBy,
    sourceCurrency: record.sourceCurrency,
    targetCurrency: record.targetCurrency,
    rate: String(record.rate),
    sourceAmount: String(record.sourceAmount),
    exchangedAt:
      record.exchangedAt.length >= 16
        ? record.exchangedAt
        : `${record.exchangedAt}T00:00`,
  };
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("ko-KR")} ${currency}`;
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
    <div className="flex flex-col gap-4">
      <ul
        className="flex flex-col gap-2"
        role="list"
        aria-label="환전 기록 목록"
      >
        {myRecords.map((record) => (
          <li key={record.id}>
            <Card
              className={cn(
                "transition-colors cursor-pointer hover:bg-muted/50 active:bg-muted",
                "min-h-12 flex flex-col justify-center touch-manipulation py-4"
              )}
              role="button"
              tabIndex={0}
              onClick={() => openDetail(record)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.preventDefault();
              }}
              aria-label={`${record.exchangedBy}, ${formatAmount(record.sourceAmount, record.sourceCurrency)} → ${formatAmount(record.targetAmount, record.targetCurrency)}. 상세 보기`}
            >
              <CardContent className="px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {record.exchangedBy}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatAmount(record.sourceAmount, record.sourceCurrency)} →{" "}
                      {formatAmount(record.targetAmount, record.targetCurrency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      1 {record.sourceCurrency} = {record.rate.toLocaleString("ko-KR")}{" "}
                      {record.targetCurrency} · {record.exchangedAt.slice(0, 10)}
                    </p>
                  </div>
                  <RefreshCw
                    className="size-4 shrink-0 text-muted-foreground mt-0.5"
                    aria-hidden
                  />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

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
