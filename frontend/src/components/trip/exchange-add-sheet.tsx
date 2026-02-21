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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

/** 프로토타입용. 연동 시 트립 허용 통화로 교체 */
const CURRENCIES = [
  { value: "KRW", label: "KRW (원)" },
  { value: "JPY", label: "JPY (엔)" },
  { value: "USD", label: "USD (달러)" },
];

export type ExchangeFormValue = {
  exchangedBy: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: string;
  sourceAmount: string;
  exchangedAt: string;
};

const getDefaultFormValue = (defaultExchangedBy?: string): ExchangeFormValue => {
  return {
    exchangedBy: defaultExchangedBy ?? "",
    sourceCurrency: "KRW",
    targetCurrency: "JPY",
    rate: "",
    sourceAmount: "",
    exchangedAt: new Date().toISOString().slice(0, 16),
  };
};

function computeTargetAmount(rate: number, sourceAmount: number): number {
  if (!(rate > 0) || !(sourceAmount > 0)) return 0;
  return Math.round(rate * sourceAmount);
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
 * 환전 추가/수정 시트. SPEC §5: 환전한 사람, source/target 통화, rate, sourceAmount, exchangedAt.
 * targetAmount = rate × sourceAmount (표시만, 저장 시 계산값 사용).
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
  const sourceNum = Number(form.sourceAmount);
  const targetAmount = computeTargetAmount(rateNum, sourceNum);

  useEffect(() => {
    if (open) {
      if (initialValue) setForm(initialValue);
      else setForm(getDefaultFormValue(defaultExchangedBy));
    }
  }, [open, initialValue, defaultExchangedBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(form.rate);
    const sourceAmount = Number(form.sourceAmount);
    const exchangedBy = form.exchangedBy || defaultExchangedBy;
    if (
      !exchangedBy ||
      !form.sourceCurrency ||
      !form.targetCurrency ||
      !(rate > 0) ||
      !(sourceAmount > 0)
    )
      return;
    onSubmit(
      {
        ...form,
        exchangedBy,
        rate: form.rate.trim(),
        sourceAmount: form.sourceAmount.trim(),
      },
      editId ?? undefined
    );
    setForm({
      ...getDefaultFormValue(defaultExchangedBy),
      exchangedAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  const handleCancel = () => {
    setForm({
      ...getDefaultFormValue(defaultExchangedBy),
      exchangedAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="overflow-hidden flex flex-col">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle id="exchange-add-title">
            {isEdit ? "환전 수정" : "환전 추가"}
          </DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <FieldGroup className="gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel asChild>
                    <Label htmlFor="exchange-sourceCurrency">보내는 통화</Label>
                  </FieldLabel>
                  <Select
                    value={form.sourceCurrency}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, sourceCurrency: v }))
                    }
                  >
                    <SelectTrigger id="exchange-sourceCurrency" className="w-full min-h-10">
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
                </Field>
                <Field>
                  <FieldLabel asChild>
                    <Label htmlFor="exchange-targetCurrency">받는 통화</Label>
                  </FieldLabel>
                  <Select
                    value={form.targetCurrency}
                    onValueChange={(v) =>
                      setForm((p) => ({ ...p, targetCurrency: v }))
                    }
                  >
                    <SelectTrigger id="exchange-targetCurrency" className="w-full min-h-10">
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
                </Field>
              </div>

              <Field>
                <FieldLabel asChild>
                  <Label htmlFor="exchange-rate">환율 (1 {form.sourceCurrency} = ? {form.targetCurrency})</Label>
                </FieldLabel>
                <Input
                  id="exchange-rate"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  placeholder="예: 9.4"
                  value={form.rate}
                  onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                  className="min-h-10"
                  required
                />
              </Field>

              <Field>
                <FieldLabel asChild>
                  <Label htmlFor="exchange-sourceAmount">보내는 금액</Label>
                </FieldLabel>
                <Input
                  id="exchange-sourceAmount"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="0"
                  value={form.sourceAmount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sourceAmount: e.target.value }))
                  }
                  className="min-h-10"
                  required
                />
              </Field>

              <Field>
                <FieldLabel asChild>
                  <Label>받는 금액 (자동)</Label>
                </FieldLabel>
                <p className="min-h-10 flex items-center text-sm text-muted-foreground">
                  {targetAmount > 0
                    ? `${targetAmount.toLocaleString("ko-KR")} ${form.targetCurrency}`
                    : "—"}
                </p>
              </Field>

              <Field>
                <FieldLabel asChild>
                  <Label htmlFor="exchange-exchangedAt">환전 일시</Label>
                </FieldLabel>
                <Input
                  id="exchange-exchangedAt"
                  type="datetime-local"
                  value={form.exchangedAt}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, exchangedAt: e.target.value }))
                  }
                  className="min-h-10"
                />
              </Field>
            </FieldGroup>
          </div>

          <DrawerFooter className="flex-row gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 min-h-12 touch-manipulation"
              onClick={handleCancel}
            >
              취소
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1 min-h-12 touch-manipulation"
              disabled={
                !form.exchangedBy ||
                !(Number(form.rate) > 0) ||
                !(Number(form.sourceAmount) > 0)
              }
            >
              저장
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
