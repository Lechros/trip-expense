"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { X, Check } from "lucide-react";

/** 프로토타입용. 연동 시 API/트립 정보로 교체 */
const MOCK_MEMBERS = ["김철수", "이영희", "박민수"];
const CURRENCIES = [
  { value: "KRW", label: "KRW (원)", symbol: "₩" },
  { value: "JPY", label: "JPY (엔)", symbol: "¥" },
];

export type ExpenseFormValue = {
  title: string;
  paidBy: string;
  amount: string;
  currency: string;
  paidAt: string;
  beneficiaryIds: string[];
  memo: string;
};

const getDefaultFormValue = (defaultPaidBy?: string): ExpenseFormValue => {
  const paidBy =
    defaultPaidBy && MOCK_MEMBERS.includes(defaultPaidBy) ? defaultPaidBy : "";
  return {
    title: "",
    paidBy,
    amount: "",
    currency: "KRW",
    paidAt: new Date().toISOString().slice(0, 16),
    beneficiaryIds: [...MOCK_MEMBERS],
    memo: "",
  };
};

/** 결제자를 맨 앞으로 한 참여자 순서 */
function orderedMembers(defaultPaidBy?: string): string[] {
  if (!defaultPaidBy || !MOCK_MEMBERS.includes(defaultPaidBy))
    return [...MOCK_MEMBERS];
  const rest = MOCK_MEMBERS.filter((n) => n !== defaultPaidBy);
  return [defaultPaidBy, ...rest];
}

type ExpenseAddSheetProps = {
  open: boolean;
  onClose: () => void;
  /** 추가 시 value 전달, 수정 시 (value, editId) 전달 */
  onSubmit: (value: ExpenseFormValue, editId?: string) => void;
  /** 로그인된 사용자 이름. 있으면 결제자 기본값으로 사용 */
  defaultPaidBy?: string;
  /** 수정 모드: 기존 값. 있으면 제목은 "지출 수정", 폼 초기값으로 사용 */
  initialValue?: ExpenseFormValue | null;
  /** 수정 모드: 수정 대상 항목 id. 저장 시 onSubmit(value, editId) 호출 */
  editId?: string | null;
};

/**
 * 지출 추가 풀스크린. 결제 금액·참여자·추가 정보(아코디언)·하단 고정 버튼.
 */
export function ExpenseAddSheet({
  open,
  onClose,
  onSubmit,
  defaultPaidBy,
  initialValue,
  editId,
}: ExpenseAddSheetProps) {
  const isEdit = Boolean(editId && initialValue);
  const [form, setForm] = useState<ExpenseFormValue>(() =>
    initialValue ?? getDefaultFormValue(defaultPaidBy)
  );

  useEffect(() => {
    if (open) {
      if (initialValue) setForm(initialValue);
      else setForm(getDefaultFormValue(defaultPaidBy));
    }
  }, [open, initialValue, defaultPaidBy]);

  const handleClose = () => {
    setForm({
      ...getDefaultFormValue(defaultPaidBy),
      paidAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.paidBy || !(amount > 0) || form.beneficiaryIds.length === 0) return;
    onSubmit(
      { ...form, title: form.memo.trim(), memo: form.memo.trim() },
      editId ?? undefined
    );
    setForm({
      ...getDefaultFormValue(defaultPaidBy),
      paidAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  const toggleBeneficiary = (name: string) => {
    setForm((prev) => ({
      ...prev,
      beneficiaryIds: prev.beneficiaryIds.includes(name)
        ? prev.beneficiaryIds.filter((id) => id !== name)
        : [...prev.beneficiaryIds, name],
    }));
  };

  const currencySymbol =
    CURRENCIES.find((c) => c.value === form.currency)?.symbol ?? "₩";
  const members = orderedMembers(defaultPaidBy);

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="dialog-slide-from-bottom inset-0 left-0 top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col overflow-hidden bg-background data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        <DialogTitle className="sr-only">
          {isEdit ? "지출 수정" : "지출 추가"}
        </DialogTitle>

        {/* 헤더: 제목 가운데, X, navbar와 동일 py-3 */}
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-3 sm:px-6">
          <div className="w-9" aria-hidden />
          <h2 className="text-foreground text-center text-base font-semibold">
            {isEdit ? "지출 수정" : "지출 추가"}
          </h2>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label="닫기"
              onClick={handleClose}
            >
              <X className="size-5" />
            </Button>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-28 pt-6">
          {/* 1. 결제 금액: 라벨 + [통화기호][input][dropdown] */}
          <div className="space-y-2">
            <Label htmlFor="expense-amount" className="text-muted-foreground text-sm">
              결제 금액
            </Label>
            <InputGroup className="min-h-12 bg-transparent text-lg">
              <InputGroupAddon align="inline-start">
                <div className="text-foreground text-lg font-medium w-5 text-center">
                  {currencySymbol}
                </div>
              </InputGroupAddon>
              <InputGroupInput
                id="expense-amount"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="text-lg"
                aria-label="결제 금액"
              />
              <InputGroupAddon align="inline-end" className="border-0 bg-transparent pr-1">
                <Select
                  value={form.currency}
                  onValueChange={(value) => setForm((p) => ({ ...p, currency: value }))}
                >
                  <SelectTrigger
                    id="expense-currency"
                    className="h-9 w-fit min-w-0 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InputGroupAddon>
            </InputGroup>
          </div>

          {/* 2. 참여자: 라벨(참여자 N명) + 풀폭 리스트 */}
          <div className="mt-6 space-y-1">
            <Label className="text-muted-foreground text-sm">
              참여자 {form.beneficiaryIds.length}명
            </Label>
            <div
              className="flex flex-col"
              role="group"
              aria-label="참여자 선택"
            >
              {members.map((name) => {
                const checked = form.beneficiaryIds.includes(name);
                return (
                  <Button
                    key={name}
                    type="button"
                    variant="ghost"
                    onClick={() => toggleBeneficiary(name)}
                    className="h-14 justify-start rounded-none -mx-6 px-6 touch-manipulation font-normal"
                    aria-label={`${name} ${checked ? "참여함" : "참여 안 함"}`}
                    aria-pressed={checked}
                  >
                    <span className="flex flex-1 items-center gap-2">
                      <span className="font-medium">{name}</span>
                      {defaultPaidBy === name && (
                        <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
                          결제자
                        </span>
                      )}
                    </span>
                    <Check
                      className={cn(
                        "size-6 shrink-0",
                        checked ? "text-primary" : "text-muted-foreground/35"
                      )}
                      aria-hidden
                    />
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 3. 구분선 + 메모(선택), 결제 일시 */}
          <div className="mt-2 border-t border-border pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-memo" className="text-muted-foreground text-sm">
                메모 (선택)
              </Label>
              <Input
                id="expense-memo"
                type="text"
                placeholder="예: 점심 식사"
                value={form.memo}
                onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                className="min-h-10 bg-transparent"
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="expense-paidAt" className="text-muted-foreground text-sm">
                  결제 일시
                </Label>
                <Input
                  id="expense-paidAt"
                  type="datetime-local"
                  value={form.paidAt}
                  onChange={(e) => setForm((p) => ({ ...p, paidAt: e.target.value }))}
                  className="min-h-10 w-full bg-transparent"
                />
              </div>
          </div>
        </div>

          {/* 하단 고정: 그라데이션 + 취소 / 추가하기 */}
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
                onClick={handleClose}
              >
                취소
              </Button>
              <Button
                type="submit"
                size="lg"
                className="min-h-12 flex-1 touch-manipulation"
                disabled={
                  !form.paidBy ||
                  !(Number(form.amount) > 0) ||
                  form.beneficiaryIds.length === 0
                }
              >
                {isEdit ? "저장" : "추가하기"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
