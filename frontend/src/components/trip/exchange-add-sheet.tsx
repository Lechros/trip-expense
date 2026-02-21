"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { X } from "lucide-react";

/** 수령 통화 옵션 (원화 고정이므로 KRW 제외). 연동 시 트립 허용 통화로 교체 */
const TARGET_CURRENCIES = [
  { value: "JPY", label: "JPY (엔)" },
  { value: "USD", label: "USD (달러)" },
];

export type ExchangeFormValue = {
  exchangedBy: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: string;
  /** 결제 금액(원화). 수령 금액 = 결제 금액 / 환율 */
  sourceAmount: string;
  /** 수령 금액(외화). 결제 금액 = 수령 금액 × 환율. 둘 중 하나 입력 시 다른 쪽 자동 계산 */
  targetAmount: string;
  exchangedAt: string;
};

const getDefaultFormValue = (defaultExchangedBy?: string): ExchangeFormValue => {
  return {
    exchangedBy: defaultExchangedBy ?? "",
    sourceCurrency: "KRW",
    targetCurrency: "JPY",
    rate: "",
    sourceAmount: "",
    targetAmount: "",
    exchangedAt: new Date().toISOString().slice(0, 16),
  };
};

/** 소수 2자리까지 유지 */
function toDecimal2(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/** 환율: 1 수령통화 = rate 원. 결제(원) → 수령: 수령 = 결제 / rate (소수 2자리) */
function targetFromSource(rate: number, sourceAmount: number): string {
  if (!(rate > 0) || !(sourceAmount > 0)) return "";
  const v = sourceAmount / rate;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** 수령 → 결제(원): 결제 = 수령 × rate (소수 2자리) */
function sourceFromTarget(rate: number, targetAmount: number): string {
  if (!(rate > 0) || !(targetAmount > 0)) return "";
  const v = targetAmount * rate;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

type ExchangeAddSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: ExchangeFormValue, editId?: string) => void;
  defaultExchangedBy?: string;
  initialValue?: ExchangeFormValue | null;
  editId?: string | null;
};

/**
 * 환전 추가/수정 시트. 수령 통화·환율·수령 금액 입력, 결제 금액(원화) = 수령 금액 × 환율 자동 계산.
 */
export function ExchangeAddSheet({
  open,
  onClose,
  onSubmit,
  defaultExchangedBy,
  initialValue,
  editId,
}: ExchangeAddSheetProps) {
  const isEdit = Boolean(editId && initialValue);
  const [form, setForm] = useState<ExchangeFormValue>(() =>
    initialValue ?? getDefaultFormValue(defaultExchangedBy)
  );

  const rateNum = Number(form.rate);

  useEffect(() => {
    if (open) {
      if (initialValue) setForm(initialValue);
      else setForm(getDefaultFormValue(defaultExchangedBy));
    }
  }, [open, initialValue, defaultExchangedBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(form.rate);
    const sourceNum = Number(form.sourceAmount);
    const targetNum = Number(form.targetAmount);
    const exchangedBy = form.exchangedBy || defaultExchangedBy;
    const hasSource = sourceNum > 0;
    const hasTarget = targetNum > 0;
    if (
      !exchangedBy ||
      !form.targetCurrency ||
      !(rate > 0) ||
      (!hasSource && !hasTarget)
    )
      return;
    const targetAmountStr = hasTarget ? toDecimal2(targetNum) : targetFromSource(rate, sourceNum);
    const sourceAmountStr = hasSource
      ? toDecimal2(sourceNum)
      : sourceFromTarget(rate, hasTarget ? targetNum : Number(targetFromSource(rate, sourceNum)));
    onSubmit(
      {
        ...form,
        exchangedBy,
        rate: form.rate.trim(),
        sourceAmount: sourceAmountStr,
        targetAmount: targetAmountStr,
      },
      editId ?? undefined
    );
    setForm({
      ...getDefaultFormValue(defaultExchangedBy),
      exchangedAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  const handleClose = () => {
    setForm({
      ...getDefaultFormValue(defaultExchangedBy),
      exchangedAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="dialog-slide-from-bottom inset-0 left-0 top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col overflow-hidden bg-background data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        <DialogTitle className="sr-only">
          {isEdit ? "환전 수정" : "환전 추가"}
        </DialogTitle>

        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-3 sm:px-6">
          <div className="w-9" aria-hidden />
          <h2 className="text-foreground text-center text-base font-semibold">
            {isEdit ? "환전 수정" : "환전 추가"}
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
            <div className="space-y-2">
              <Label htmlFor="exchange-targetCurrency" className="text-muted-foreground text-sm">
                수령 통화
              </Label>
              <Select
                value={form.targetCurrency}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, targetCurrency: v }))
                }
              >
                <SelectTrigger id="exchange-targetCurrency" className="w-full min-h-12 bg-transparent text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="exchange-rate" className="text-muted-foreground text-sm">
                환율 (1 {form.targetCurrency} = ? 원)
              </Label>
              <Input
                id="exchange-rate"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                placeholder="예: 9.4"
                value={form.rate}
                onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                className="min-h-12 bg-transparent text-lg"
                required
              />
            </div>

            {/* 결제 금액(위): 통화 왼쪽, 입력 시 수령 금액 자동 계산 */}
            <div className="mt-6 space-y-2">
              <Label htmlFor="exchange-sourceAmount" className="text-muted-foreground text-sm">
                결제 금액
              </Label>
              <InputGroup className="min-h-12 bg-transparent text-lg">
                <InputGroupAddon align="inline-start">
                  <span className="text-foreground text-lg font-medium">원</span>
                </InputGroupAddon>
                <InputGroupInput
                  id="exchange-sourceAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.sourceAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    const rate = Number(form.rate);
                    setForm((p) => ({
                      ...p,
                      sourceAmount: v,
                      targetAmount:
                        rate > 0 && Number(v) > 0
                          ? targetFromSource(rate, Number(v))
                          : p.targetAmount,
                    }));
                  }}
                  className="text-lg"
                  aria-label="결제 금액"
                />
              </InputGroup>
            </div>

            {/* 수령 금액(아래): 통화 왼쪽, 입력 시 결제 금액 자동 계산 */}
            <div className="mt-6 space-y-2">
              <Label htmlFor="exchange-targetAmount" className="text-muted-foreground text-sm">
                수령 금액
              </Label>
              <InputGroup className="min-h-12 bg-transparent text-lg">
                <InputGroupAddon align="inline-start">
                  <span className="text-foreground text-lg font-medium">{form.targetCurrency}</span>
                </InputGroupAddon>
                <InputGroupInput
                  id="exchange-targetAmount"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={form.targetAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    const rate = Number(form.rate);
                    setForm((p) => ({
                      ...p,
                      targetAmount: v,
                      sourceAmount:
                        rate > 0 && Number(v) > 0
                          ? sourceFromTarget(rate, Number(v))
                          : p.sourceAmount,
                    }));
                  }}
                  className="text-lg"
                  aria-label="수령 금액"
                />
              </InputGroup>
            </div>

            <div className="mt-6 border-t border-border pt-4 space-y-2">
              <Label htmlFor="exchange-exchangedAt" className="text-muted-foreground text-sm">
                환전 일시
              </Label>
              <Input
                id="exchange-exchangedAt"
                type="datetime-local"
                value={form.exchangedAt}
                onChange={(e) =>
                  setForm((p) => ({ ...p, exchangedAt: e.target.value }))
                }
                className="min-h-12 w-full bg-transparent"
              />
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
                onClick={handleClose}
              >
                취소
              </Button>
              <Button
                type="submit"
                size="lg"
                className="min-h-12 flex-1 touch-manipulation"
                disabled={
                  !form.exchangedBy ||
                  !(Number(form.rate) > 0) ||
                  (!(Number(form.sourceAmount) > 0) && !(Number(form.targetAmount) > 0))
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
