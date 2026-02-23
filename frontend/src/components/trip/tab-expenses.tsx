"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Filter, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ExpenseAddSheet, type ExpenseFormValue } from "./expense-add-sheet";
import { ExpenseDetailSheet } from "./expense-detail-sheet";
import { ExpenseFilterSheet } from "./expense-filter-sheet";
import { ExpenseListRow, type ExpenseListEntry } from "./expense-list-row";
import { useAuthStore } from "@/stores/auth";
import { apiFetch } from "@/lib/api";

/** API 응답: 지출 항목 */
export type ApiEntry = {
  id: string;
  amount: number;
  currency: string;
  paidAt: string;
  memo: string | null;
  deletedAt: string | null;
  paidBy: { memberId: string; displayName: string };
  beneficiaries: { memberId: string; displayName: string }[];
};

/** API 응답: 트립 멤버 */
export type ApiMember = {
  id: string;
  displayName: string;
  role?: string;
  userId?: string | null;
  guestId?: string | null;
};

type ExpenseFilter = {
  paidByMemberId?: string;
  beneficiaryMemberId?: string;
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
};

function apiEntryToListEntry(e: ApiEntry): ExpenseListEntry {
  const title = e.memo?.trim() || "메모 없음";
  return {
    id: e.id,
    title,
    paidBy: e.paidBy.displayName,
    amount: e.amount,
    currency: e.currency,
    paidAt: e.paidAt,
    beneficiaries: e.beneficiaries.map((b) => b.displayName),
    memo: e.memo ?? undefined,
  };
}

type TabExpensesProps = {
  tripId: string;
};

/**
 * 지출 탭. useQuery로 members/entries 로드 (SSR prefetch로 초기엔 로딩 없음).
 * 지출 목록이 없을 때 빈 상태 메시지 표시.
 */
export function TabExpenses({ tripId }: TabExpensesProps) {
  const queryClient = useQueryClient();
  const [showDeleted, setShowDeleted] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState<ExpenseFilter>({});
  const [addOpen, setAddOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ApiEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitialValue, setEditInitialValue] = useState<ExpenseFormValue | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  const membersQuery = useQuery({
    queryKey: ["trips", tripId, "members"],
    queryFn: async () => {
      const res = await apiFetch<{ members: ApiMember[] }>(`/trips/${tripId}/members`);
      if (!res.ok) throw new Error(res.error ?? "Failed to load members");
      return res.data;
    },
  });

  const entriesQuery = useQuery({
    queryKey: ["trips", tripId, "entries", filter, showDeleted],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.paidByMemberId) params.set("paidByMemberId", filter.paidByMemberId);
      if (filter.beneficiaryMemberId) params.set("beneficiaryMemberId", filter.beneficiaryMemberId);
      if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
      if (filter.dateTo) params.set("dateTo", filter.dateTo);
      if (filter.currency) params.set("currency", filter.currency);
      if (showDeleted) params.set("includeDeleted", "true");
      const query = params.toString();
      const res = await apiFetch<{ entries: ApiEntry[] }>(
        `/trips/${tripId}/entries${query ? `?${query}` : ""}`
      );
      if (!res.ok) throw new Error(res.error ?? "Failed to load entries");
      return res.data;
    },
  });

  const members = membersQuery.data?.members ?? [];
  const allEntries = entriesQuery.data?.entries ?? [];
  const entries = allEntries.filter((e) => !e.deletedAt);
  const deletedEntries = allEntries.filter((e) => e.deletedAt);
  const isLoading = entriesQuery.isLoading;
  const error = entriesQuery.error ? (entriesQuery.error as Error).message : null;

  const invalidateEntries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["trips", tripId, "entries"] });
  }, [queryClient, tripId]);

  const handleAddSubmit = useCallback(
    async (form: ExpenseFormValue, editIdArg?: string) => {
      const paidAt =
        form.paidAt.length >= 16 ? form.paidAt : `${form.paidAt.slice(0, 10)}T00:00:00.000Z`;
      if (editIdArg) {
        const res = await apiFetch<{ entry: ApiEntry }>(`/trips/${tripId}/entries/${editIdArg}`, {
          method: "PATCH",
          body: JSON.stringify({
            amount: Number(form.amount),
            currency: form.currency,
            paidAt,
            memo: form.memo.trim() || null,
            paidByMemberId: form.paidByMemberId,
            beneficiaryMemberIds: form.beneficiaryMemberIds,
          }),
        });
        if (res.ok && res.data.entry) {
          invalidateEntries();
          setSelectedEntry(res.data.entry);
          setEditOpen(false);
          setEditId(null);
          setEditInitialValue(null);
          setDetailOpen(true);
        }
      } else {
        const res = await apiFetch<{ entry: ApiEntry }>(`/trips/${tripId}/entries`, {
          method: "POST",
          body: JSON.stringify({
            amount: Number(form.amount),
            currency: form.currency,
            paidAt,
            memo: form.memo.trim() || null,
            paidByMemberId: form.paidByMemberId,
            beneficiaryMemberIds: form.beneficiaryMemberIds,
          }),
        });
        if (res.ok) {
          invalidateEntries();
          setAddOpen(false);
        }
      }
    },
    [tripId, invalidateEntries]
  );

  const openDetail = useCallback((entry: ApiEntry) => {
    setSelectedEntry(entry);
    setDetailOpen(true);
  }, []);

  const handleEditFromDetail = useCallback(() => {
    if (!selectedEntry) return;
    setEditInitialValue({
      paidByMemberId: selectedEntry.paidBy.memberId,
      beneficiaryMemberIds: selectedEntry.beneficiaries.map((b) => b.memberId),
      amount: String(selectedEntry.amount),
      currency: selectedEntry.currency,
      paidAt:
        selectedEntry.paidAt.length >= 16
          ? selectedEntry.paidAt.slice(0, 16)
          : `${selectedEntry.paidAt.slice(0, 10)}T00:00`,
      memo: selectedEntry.memo ?? "",
    });
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

  const handleDeleteConfirm = useCallback(async () => {
    if (!entryToDeleteId) return;
    const res = await apiFetch(`/trips/${tripId}/entries/${entryToDeleteId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      invalidateEntries();
    }
    setEntryToDeleteId(null);
    setDeleteConfirmOpen(false);
  }, [tripId, entryToDeleteId, invalidateEntries]);

  const handleFilterApply = useCallback((next: ExpenseFilter) => {
    setFilter(next);
    setFilterOpen(false);
  }, []);

  const listEntries = entries.map(apiEntryToListEntry);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const guestForTrip = useAuthStore((s) => (s.guest?.tripId === tripId ? s.guest : null));
  const defaultPaidByMemberId =
    guestForTrip?.memberId ??
    members.find((m) => m.userId === currentUserId)?.id ??
    members[0]?.id;
  const showEmptyState =
    !isLoading && error == null && entries.length === 0 && !showDeleted;

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex flex-col gap-4 pb-28">
        <div className="flex flex-wrap items-center gap-2 px-4">
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 gap-1.5 touch-manipulation"
            aria-label="필터 열기"
            onClick={() => setFilterOpen(true)}
          >
            <Filter aria-hidden />
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
            {showDeleted ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            삭제된 항목 보기
          </Button>
        </div>

        {isLoading && (
          <p className="px-4 text-sm text-muted-foreground">불러오는 중…</p>
        )}
        {error && (
          <p className="px-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {showEmptyState && (
          <div className="px-4 py-10 text-center">
            <p className="text-muted-foreground">지출 목록이 없습니다.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              하단 버튼으로 첫 지출을 추가해 보세요.
            </p>
          </div>
        )}

        {!showEmptyState && (
          <ul className="flex flex-col" role="list" aria-label="정산 항목 목록">
            {listEntries.map((entry, index) => (
              <ExpenseListRow
                key={entry.id}
                entry={entry}
                index={index}
                entries={listEntries}
                onSelect={() => {
                  const apiEntry = entries.find((e) => e.id === entry.id);
                  if (apiEntry) openDetail(apiEntry);
                }}
              />
            ))}
          </ul>
        )}

        {showDeleted && (
          <section aria-label="삭제된 항목" className="px-4">
            <h2 className="text-sm font-medium text-muted-foreground pb-2">
              삭제된 항목
            </h2>
            {deletedEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 py-10 text-center text-sm text-muted-foreground">
                삭제된 항목이 없습니다.
              </div>
            ) : (
              <ul className="flex flex-col gap-2" role="list">
                {deletedEntries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground line-through"
                  >
                    {e.memo || "메모 없음"} · {e.paidBy.displayName} {e.amount}{" "}
                    {e.currency}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div
          className="h-8 w-full bg-linear-to-t from-background to-transparent pointer-events-none"
          aria-hidden
        />
        <div className="px-4 pt-1 pb-4 bg-background">
          <Button
            type="button"
            size="lg"
            className="w-full min-h-12 gap-2 touch-manipulation"
            aria-label="지출 항목 추가"
            onClick={() => setAddOpen(true)}
          >
            <Plus aria-hidden />
            지출 추가
          </Button>
        </div>
      </div>

      <ExpenseFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        members={members}
        filter={filter}
        onApply={handleFilterApply}
      />

      <ExpenseAddSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
        members={members}
        defaultPaidByMemberId={defaultPaidByMemberId}
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
        members={members}
        defaultPaidByMemberId={defaultPaidByMemberId}
        initialValue={editInitialValue}
        editId={editId}
      />

      <ExpenseDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        entry={selectedEntry ? apiEntryToListEntry(selectedEntry) : null}
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
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
