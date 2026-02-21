"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";

/** 프로토타입용. 연동 시 API/트립 정보로 교체 */
const MOCK_MEMBERS = ["김철수", "이영희", "박민수"];
const CURRENCIES = [
  { value: "KRW", label: "KRW (원)" },
  { value: "JPY", label: "JPY (엔)" },
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
 * 지출 추가 Drawer. SPEC §4.2: 결제자, 금액, 통화, paidAt, 참여자, 메모.
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const titleTrimmed = form.title.trim();
    const amount = Number(form.amount);
    if (!titleTrimmed || !form.paidBy || !(amount > 0) || form.beneficiaryIds.length === 0) return;
    onSubmit(
      { ...form, title: titleTrimmed, memo: form.memo.trim() },
      editId ?? undefined
    );
    setForm({
      ...getDefaultFormValue(defaultPaidBy),
      paidAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  const handleCancel = () => {
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

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="overflow-hidden flex flex-col">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle id="expense-add-title">
            {isEdit ? "지출 수정" : "지출 추가"}
          </DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel asChild>
                  <Label htmlFor="expense-title">제목</Label>
                </FieldLabel>
                <Input
                  id="expense-title"
                  type="text"
                  placeholder="예: 점심 식사"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="min-h-10"
                  required
                />
              </Field>

              <Field>
                <FieldLabel asChild>
                  <Label htmlFor="expense-paidBy">결제자</Label>
                </FieldLabel>
                <Select
                  value={form.paidBy}
                  onValueChange={(value) => setForm((p) => ({ ...p, paidBy: value }))}
                  required
                >
                  <SelectTrigger id="expense-paidBy" className="w-full min-h-10">
                    <SelectValue placeholder="결제한 사람 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_MEMBERS.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel asChild>
                    <Label htmlFor="expense-currency">통화</Label>
                  </FieldLabel>
                  <Select
                    value={form.currency}
                    onValueChange={(value) => setForm((p) => ({ ...p, currency: value }))}
                  >
                    <SelectTrigger id="expense-currency" className="w-full min-h-10">
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
                    <Label htmlFor="expense-amount">금액</Label>
                  </FieldLabel>
                  <Input
                    id="expense-amount"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    className="min-h-10"
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel asChild>
                  <Label htmlFor="expense-paidAt">결제 일시</Label>
                </FieldLabel>
                <Input
                  id="expense-paidAt"
                  type="datetime-local"
                  value={form.paidAt}
                  onChange={(e) => setForm((p) => ({ ...p, paidAt: e.target.value }))}
                  className="min-h-10"
                />
              </Field>

              <Field>
                <FieldLabel asChild>
                  <Label>참여자</Label>
                </FieldLabel>
                <p className="text-muted-foreground text-xs mb-2">
                  이 비용을 나눠 쓴 참여자를 선택하세요. 1명 이상 선택해야 합니다.
                </p>
                <div className="flex flex-col gap-2" role="group" aria-label="참여자 선택">
                  {MOCK_MEMBERS.map((name) => (
                    <label
                      key={name}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border border-border bg-input/30 px-4 py-3 min-h-12 cursor-pointer touch-manipulation",
                        "hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.beneficiaryIds.includes(name)}
                        onChange={() => toggleBeneficiary(name)}
                        className="size-4 rounded border-border"
                        aria-label={`${name} 참여`}
                      />
                      <span className="font-medium">{name}</span>
                    </label>
                  ))}
                </div>
              </Field>

              <Field>
                <FieldLabel asChild>
                  <Label htmlFor="expense-memo">메모 (선택)</Label>
                </FieldLabel>
                <Textarea
                  id="expense-memo"
                  placeholder="추가 설명이 있으면 입력하세요"
                  value={form.memo}
                  onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                  rows={3}
                  className="min-h-20 resize-none"
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
                !form.title.trim() ||
                !form.paidBy ||
                !(Number(form.amount) > 0) ||
                form.beneficiaryIds.length === 0
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
