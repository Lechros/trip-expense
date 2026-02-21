"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

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

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString("ko-KR")} ${currency}`;
}

type ExchangeDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  record: ExchangeDetailRecord | null;
  onEdit: () => void;
  onDelete: () => void;
};

export function ExchangeDetailSheet({
  open,
  onClose,
  record,
  onEdit,
  onDelete,
}: ExchangeDetailSheetProps) {
  if (!record) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="overflow-hidden flex flex-col">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle id="exchange-detail-title">환전 상세</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">환전한 사람</dt>
              <dd>{record.exchangedBy}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">보내는 금액</dt>
              <dd>{formatAmount(record.sourceAmount, record.sourceCurrency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">환율</dt>
              <dd>
                1 {record.sourceCurrency} = {record.rate.toLocaleString("ko-KR")}{" "}
                {record.targetCurrency}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">받는 금액</dt>
              <dd>{formatAmount(record.targetAmount, record.targetCurrency)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">환전 일시</dt>
              <dd>{record.exchangedAt}</dd>
            </div>
          </dl>
        </div>

        <DrawerFooter className="flex-row gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 min-h-12 touch-manipulation"
            onClick={onEdit}
          >
            수정
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 min-h-12 touch-manipulation text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            삭제
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
