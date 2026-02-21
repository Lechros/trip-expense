"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { FileText } from "lucide-react";

/**
 * 설계: 지출 항목 탭 → 수정/삭제 UI
 * ---------------------------------
 * 1. 항목 탭 → 지출 상세 시트(이 컴포넌트) 열림
 *    - 읽기 전용: 제목, 결제자, 금액·통화, 결제 일시, 참여자, 메모
 *    - 액션: [수정] [삭제]
 * 2. 수정 → 상세 시트 닫고, 지출 추가/수정 시트를 같은 폼으로 열어 기존 값 채움 → 저장 시 해당 id로 업데이트
 * 3. 삭제 → 상세 시트 닫고, 확인 다이얼로그("이 지출을 삭제할까요?") → 확인 시 목록에서 제거(또는 soft delete)
 *
 * 모바일 우선: 한 번의 탭으로 상세 진입 후 수정/삭제 선택. 롱프레스·스와이프 대신 단순 탭 + 버튼으로 처리.
 */

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

type ExpenseDetailSheetProps = {
  open: boolean;
  onClose: () => void;
  entry: ExpenseDetailEntry | null;
  onEdit: () => void;
  onDelete: () => void;
};

export function ExpenseDetailSheet({
  open,
  onClose,
  entry,
  onEdit,
  onDelete,
}: ExpenseDetailSheetProps) {
  if (!entry) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="overflow-hidden flex flex-col">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle id="expense-detail-title">지출 상세</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">제목</dt>
              <dd className="font-medium flex items-center gap-1.5">
                <span>{entry.title}</span>
                {entry.memo != null && entry.memo !== "" && (
                  <FileText
                    className="size-4 text-muted-foreground shrink-0"
                    aria-label="메모 있음"
                  />
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">결제자</dt>
              <dd>{entry.paidBy}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">금액</dt>
              <dd>
                {formatAmount(entry.amount, entry.currency)} ({entry.currency})
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">결제 일시</dt>
              <dd>{entry.paidAt}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">참여자</dt>
              <dd>{entry.beneficiaries.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs mb-0.5">메모</dt>
              <dd className="text-muted-foreground whitespace-pre-wrap">
                {entry.memo ?? "—"}
              </dd>
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
