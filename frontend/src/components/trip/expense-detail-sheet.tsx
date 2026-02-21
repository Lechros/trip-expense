"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { X, Check } from "lucide-react";

const CURRENCY_SYMBOL: Record<string, string> = {
  KRW: "₩",
  JPY: "¥",
};

export type ExpenseDetailEntry = {
  id: string;
  title: string;
  paidBy: string;
  amount: number;
  currency: string;
  paidAt: string;
  beneficiaries: string[];
  memo?: string;
};

function formatAmount(amount: number, currency: string): string {
  if (currency === "KRW") return `${amount.toLocaleString("ko-KR")}원`;
  return `${amount.toLocaleString("ko-KR")} ${currency}`;
}

/** 결제자를 맨 앞으로 한 참여자 순서 */
function orderedBeneficiaries(entry: ExpenseDetailEntry): string[] {
  const { paidBy, beneficiaries } = entry;
  if (!paidBy || !beneficiaries.includes(paidBy)) return [...beneficiaries];
  const rest = beneficiaries.filter((n) => n !== paidBy);
  return [paidBy, ...rest];
}

type ExpenseDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  entry: ExpenseDetailEntry | null;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * 지출 조회(상세). 추가/수정 시트와 동일한 Dialog·레이아웃, 읽기 전용.
 */
export function ExpenseDetailSheet({
  open,
  onClose,
  entry,
  onEdit,
  onDelete,
}: ExpenseDetailSheetProps) {
  if (!entry) return null;

  const symbol = CURRENCY_SYMBOL[entry.currency] ?? entry.currency;
  const ordered = orderedBeneficiaries(entry);
  const memoDisplay = entry.memo?.trim() ?? entry.title?.trim() ?? "—";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="dialog-slide-from-bottom inset-0 left-0 top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col overflow-hidden bg-background data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        <DialogTitle className="sr-only">지출 상세</DialogTitle>

        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-3 sm:px-6">
          <div className="w-9" aria-hidden />
          <h2 className="text-foreground text-center text-base font-semibold">
            지출 상세
          </h2>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label="닫기"
              onClick={onClose}
            >
              <X className="size-5" />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-28 pt-6">
            {/* 1. 결제 금액 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">결제 금액</Label>
              <div className="flex min-h-12 items-center gap-2 text-lg">
                <span className="text-foreground font-medium">{symbol}</span>
                <span className="font-medium">
                  {entry.amount.toLocaleString("ko-KR")}
                </span>
                <span className="text-muted-foreground text-base">
                  {entry.currency}
                </span>
              </div>
            </div>

            {/* 2. 참여자 */}
            <div className="mt-6 space-y-2">
              <Label className="text-muted-foreground text-sm">
                참여자 {entry.beneficiaries.length}명
              </Label>
              <div className="flex flex-col" role="list">
                {ordered.map((name) => (
                  <div
                    key={name}
                    className="flex w-full items-center gap-3 px-6 py-3"
                  >
                    <span className="flex flex-1 items-center gap-2">
                      <span className="font-medium">{name}</span>
                      {entry.paidBy === name && (
                        <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                          결제자
                        </span>
                      )}
                    </span>
                    <Check className="text-primary size-6 shrink-0" aria-hidden />
                  </div>
                ))}
              </div>
            </div>

            {/* 3. 구분선 + 메모, 결제 일시 */}
            <div className="mt-6 border-t border-border pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">
                  메모 (선택)
                </Label>
                <p className="text-foreground min-h-10 py-2">
                  {memoDisplay}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">
                  결제 일시
                </Label>
                <p className="text-foreground min-h-10 py-2">
                  {entry.paidAt}
                </p>
              </div>
            </div>
          </div>

          {/* 하단 고정: 그라데이션 + 닫기 / 수정 / 삭제 */}
          <div className="fixed bottom-0 left-0 right-0 z-10 w-full">
            <div
              className="h-8 w-full bg-linear-to-t from-background to-transparent pointer-events-none"
              aria-hidden
            />
            <div className="flex w-full gap-2 px-6 pt-1 pb-4 bg-background">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-12 flex-1 touch-manipulation"
                onClick={onClose}
              >
                닫기
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-12 flex-1 touch-manipulation"
                onClick={onEdit}
              >
                수정
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="min-h-12 flex-1 touch-manipulation text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={onDelete}
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
