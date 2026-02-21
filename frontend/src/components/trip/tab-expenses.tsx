"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Receipt, Filter, Eye, EyeOff, FileText } from "lucide-react";
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
import { ExpenseAddSheet, type ExpenseFormValue } from "./expense-add-sheet";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import { ExpenseFilterSheet } from "./expense-filter-sheet";

/** 프로토타입용. 연동 시 로그인 사용자 정보로 교체 */
const MOCK_CURRENT_USER = "김철수";

/** 프로토타입용 mock 타입. 연동 시 API 타입으로 교체 */
type MockEntry = {
  id: string;
  title: string;
  paidBy: string;
  amount: number;
  currency: string;
  paidAt: string;
  beneficiaries: string[];
  memo?: string;
};

const INITIAL_ENTRIES: MockEntry[] = [
  {
    id: "1",
    title: "점심 식사",
    paidBy: "김철수",
    amount: 45000,
    currency: "KRW",
    paidAt: "2025-02-20",
    beneficiaries: ["김철수", "이영희", "박민수"],
    memo: "라멘",
  },
  {
    id: "2",
    title: "편의점",
    paidBy: "이영희",
    amount: 10000,
    currency: "JPY",
    paidAt: "2025-02-19",
    beneficiaries: ["이영희", "박민수"],
    memo: "음료·간식",
  },
  {
    id: "3",
    title: "숙소",
    paidBy: "박민수",
    amount: 120000,
    currency: "KRW",
    paidAt: "2025-02-18",
    beneficiaries: ["김철수", "이영희", "박민수"],
  },
];

function formValueToEntry(form: ExpenseFormValue, id: string): MockEntry {
  const paidAt = form.paidAt.slice(0, 10);
  const memoTrimmed = form.memo.trim();
  return {
    id,
    title: form.title.trim(),
    paidBy: form.paidBy,
    amount: Number(form.amount),
    currency: form.currency,
    paidAt,
    beneficiaries: [...form.beneficiaryIds],
    memo: memoTrimmed || undefined,
  };
}

function entryToFormValue(entry: MockEntry): ExpenseFormValue {
  const paidAt =
    entry.paidAt.length >= 16
      ? entry.paidAt
      : `${entry.paidAt}T00:00`;
  return {
    title: entry.title,
    paidBy: entry.paidBy,
    amount: String(entry.amount),
    currency: entry.currency,
    paidAt,
    beneficiaryIds: [...entry.beneficiaries],
    memo: entry.memo ?? "",
  };
}

function formatAmount(amount: number, currency: string): string {
  if (currency === "KRW") return `${amount.toLocaleString("ko-KR")}원`;
  return `${amount.toLocaleString("ko-KR")} ${currency}`;
}

/**
 * 지출 탭 프로토타입.
 * SPEC §4.4: 목록(리스트형), 필터(결제자/수혜자/날짜/통화), 삭제된 항목 보기, 항목 탭 시 상세·수정.
 */
export function TabExpenses() {
  const [showDeleted, setShowDeleted] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [entries, setEntries] = useState<MockEntry[]>(INITIAL_ENTRIES);
  const [selectedEntry, setSelectedEntry] = useState<MockEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitialValue, setEditInitialValue] = useState<ExpenseFormValue | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  const handleAddSubmit = useCallback((form: ExpenseFormValue, editId?: string) => {
    if (editId) {
      const updated = formValueToEntry(form, editId);
      setEntries((prev) =>
        prev.map((e) => (e.id === editId ? updated : e))
      );
      setEditOpen(false);
      setEditId(null);
      setEditInitialValue(null);
      setSelectedEntry(updated);
      setDetailOpen(true);
    } else {
      const newEntry = formValueToEntry(form, `new-${Date.now()}`);
      setEntries((prev) => [newEntry, ...prev]);
    }
  }, []);

  const openDetail = useCallback((entry: MockEntry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  }, []);

  const handleEditFromDetail = useCallback(() => {
    if (!selectedEntry) return;
    setEditInitialValue(entryToFormValue(selectedEntry));
    setEditId(selectedEntry.id);
    setDetailOpen(false);
    setEditOpen(true);
  }, [selectedEntry]);

  const handleDeleteFromDetail = useCallback(() => {
    if (!selectedEntry) return;
    setEntryToDeleteId(selectedEntry.id);
    setDetailOpen(false);
    setDeleteConfirmOpen(true);
  }, [selectedEntry]);

  const handleDeleteConfirm = useCallback(() => {
    if (entryToDeleteId) {
      setEntries((prev) => prev.filter((e) => e.id !== entryToDeleteId));
      setEntryToDeleteId(null);
    }
    setDeleteConfirmOpen(false);
  }, [entryToDeleteId]);

  // AlertDialog 닫힌 뒤 body 등에 pointer-events가 남아 클릭이 안 되는 경우 복구
  useEffect(() => {
    if (deleteConfirmOpen) return;
    const t = setTimeout(() => {
      document.body.style.pointerEvents = "";
    }, 100);
    return () => clearTimeout(t);
  }, [deleteConfirmOpen]);

  return (
    <div className="flex flex-col gap-4">
      {/* 필터 영역: 접근 가능한 터치 영역 유지 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 gap-1.5 touch-manipulation"
          aria-label="필터 열기"
          onClick={() => setFilterOpen(true)}
        >
          <Filter className="size-4" aria-hidden />
          필터
        </Button>
        <Button
          variant={showDeleted ? "secondary" : "ghost"}
          size="sm"
          className="min-h-10 gap-1.5 touch-manipulation"
          onClick={() => setShowDeleted(!showDeleted)}
          aria-pressed={showDeleted}
          aria-label={showDeleted ? "삭제된 항목 숨기기" : "삭제된 항목 보기"}
        >
          {showDeleted ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
          삭제된 항목 보기
        </Button>
      </div>

      {/* 목록: 터치 타겟 최소 48px */}
      <ul className="flex flex-col gap-2" role="list" aria-label="정산 항목 목록">
        {entries.map((entry) => (
          <li key={entry.id}>
            <Card
              className={cn(
                "transition-colors cursor-pointer hover:bg-muted/50 active:bg-muted",
                "min-h-12 flex flex-col justify-center touch-manipulation py-4"
              )}
              role="button"
              tabIndex={0}
              onClick={() => openDetail(entry)}
              aria-label={`${entry.title}, ${entry.paidBy}님이 ${formatAmount(entry.amount, entry.currency)} 결제. 상세 보기`}
            >
              <CardContent className="px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground flex items-center gap-1.5 truncate">
                      <span className="truncate">{entry.title}</span>
                      {entry.memo && (
                        <FileText
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-label="메모 있음"
                        />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.paidBy} · {formatAmount(entry.amount, entry.currency)} · {entry.paidAt}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {entry.beneficiaries.join(", ")}
                    </p>
                  </div>
                  <Receipt className="size-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {/* 삭제된 항목 보기 켰을 때: 섹션 헤더 + 빈 상태(레이아웃만) */}
      {showDeleted && (
        <section aria-label="삭제된 항목">
          <h2 className="text-sm font-medium text-muted-foreground px-1 pb-2">
            삭제된 항목
          </h2>
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-10 text-center text-sm text-muted-foreground">
            삭제된 항목이 없습니다.
          </div>
        </section>
      )}

      {/* 추가 버튼: 고정 하단 또는 인라인, 터치 영역 48px 이상 */}
      <Button
        type="button"
        size="lg"
        className="w-full min-h-12 gap-2 touch-manipulation"
        aria-label="지출 항목 추가"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="size-5" aria-hidden />
        지출 추가
      </Button>

      <ExpenseFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
      />

      <ExpenseAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
        defaultPaidBy={MOCK_CURRENT_USER}
      />

      <ExpenseAddSheet
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
          setEditInitialValue(null);
          setDetailOpen(true);
        }}
        onSubmit={handleAddSubmit}
        defaultPaidBy={MOCK_CURRENT_USER}
        initialValue={editInitialValue}
        editId={editId}
      />

      <ExpenseDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        entry={selectedEntry}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>지출 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 지출 항목을 삭제할까요? 삭제하면 복구할 수 없습니다.
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
