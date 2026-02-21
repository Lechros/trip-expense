"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export type ExchangeDetailRecord = {
  id: string;
  exchangedBy: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
  exchangedAt: string;
};

/** 소수 2자리까지 표시 */
function formatAmount(amount: number, currency: string): string {
  const opts: Intl.NumberFormatOptions = { maximumFractionDigits: 2, minimumFractionDigits: 0 };
  if (currency === "KRW") return `${amount.toLocaleString("ko-KR", opts)}원`;
  return `${amount.toLocaleString("ko-KR", opts)} ${currency}`;
}

type ExchangeDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  record: ExchangeDetailRecord | null;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * 환전 조회(상세). 지출 상세와 동일한 Dialog·레이아웃, 읽기 전용.
 */
export function ExchangeDetailSheet({
  open,
  onClose,
  record,
  onEdit,
  onDelete,
}: ExchangeDetailSheetProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="dialog-slide-from-bottom inset-0 left-0 top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col overflow-hidden bg-background data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        <DialogTitle className="sr-only">환전 상세</DialogTitle>

        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-3 sm:px-6">
          <div className="w-9" aria-hidden />
          <h2 className="text-foreground text-center text-base font-semibold">
            환전 상세
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
              <X />
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-28 pt-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm">환율</Label>
              <p className="text-foreground text-lg font-medium">
                1 {record.targetCurrency} = {record.rate.toLocaleString("ko-KR", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}원
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <Label className="text-muted-foreground text-sm">결제 금액</Label>
              <p className="text-foreground min-h-10 py-2">
                {formatAmount(record.sourceAmount, record.sourceCurrency)}
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <Label className="text-muted-foreground text-sm">수령 금액</Label>
              <p className="text-foreground min-h-10 py-2">
                {formatAmount(record.targetAmount, record.targetCurrency)}
              </p>
            </div>

            <div className="mt-6 border-t border-border pt-4 space-y-2">
              <Label className="text-muted-foreground text-sm">환전한 사람</Label>
              <p className="text-foreground min-h-10 py-2">{record.exchangedBy}</p>
            </div>

            <div className="mt-6 space-y-2">
              <Label className="text-muted-foreground text-sm">환전 일시</Label>
              <p className="text-foreground min-h-10 py-2">{record.exchangedAt}</p>
            </div>
          </div>

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
