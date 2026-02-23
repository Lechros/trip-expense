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

const CURRENCIES = [
  { value: "KRW", label: "KRW (원)", symbol: "₩" },
  { value: "JPY", label: "JPY (엔)", symbol: "¥" },
];

export type ExpenseFormValue = {
  paidByMemberId: string;
  beneficiaryMemberIds: string[];
  amount: string;
  currency: string;
  paidAt: string;
  memo: string;
};

export type ExpenseMember = { id: string; displayName: string };

function getDefaultFormValue(
  members: ExpenseMember[],
  defaultPaidByMemberId?: string
): ExpenseFormValue {
  const allIds = members.map((m) => m.id);
  const paidBy =
    defaultPaidByMemberId && allIds.includes(defaultPaidByMemberId)
      ? defaultPaidByMemberId
      : members[0]?.id ?? "";
  return {
    paidByMemberId: paidBy,
    beneficiaryMemberIds: [...allIds],
    amount: "",
    currency: "KRW",
    paidAt: new Date().toISOString().slice(0, 16),
    memo: "",
  };
}

/** 결제자를 맨 앞으로 한 멤버 순서 */
function orderedMembers(
  members: ExpenseMember[],
  defaultPaidByMemberId?: string
): ExpenseMember[] {
  if (!defaultPaidByMemberId || !members.some((m) => m.id === defaultPaidByMemberId))
    return [...members];
  const paidBy = members.find((m) => m.id === defaultPaidByMemberId);
  const rest = members.filter((m) => m.id !== defaultPaidByMemberId);
  return paidBy ? [paidBy, ...rest] : [...members];
}

type ExpenseAddSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: ExpenseFormValue, editId?: string) => void;
  members: ExpenseMember[];
  defaultPaidByMemberId?: string;
  initialValue?: ExpenseFormValue | null;
  editId?: string | null;
};

/**
 * 지출 추가/수정 시트. 결제자·수혜자 = 트립 멤버(memberId) 기준.
 */
export function ExpenseAddSheet({
  open,
  onClose,
  onSubmit,
  members,
  defaultPaidByMemberId,
  initialValue,
  editId,
}: ExpenseAddSheetProps) {
  const isEdit = Boolean(editId && initialValue);
  const [form, setForm] = useState<ExpenseFormValue>(() =>
    initialValue ?? getDefaultFormValue(members, defaultPaidByMemberId)
  );

  useEffect(() => {
    if (open) {
      if (initialValue) setForm(initialValue);
      else setForm(getDefaultFormValue(members, defaultPaidByMemberId));
    }
  }, [open, initialValue, defaultPaidByMemberId, members]);

  const handleClose = () => {
    setForm({
      ...getDefaultFormValue(members, defaultPaidByMemberId),
      paidAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.paidByMemberId || !(amount > 0) || form.beneficiaryMemberIds.length === 0) return;
    onSubmit(form, editId ?? undefined);
    setForm({
      ...getDefaultFormValue(members, defaultPaidByMemberId),
      paidAt: new Date().toISOString().slice(0, 16),
    });
    onClose();
  };

  const toggleBeneficiary = (memberId: string) => {
    setForm((prev) => ({
      ...prev,
      beneficiaryMemberIds: prev.beneficiaryMemberIds.includes(memberId)
        ? prev.beneficiaryMemberIds.filter((id) => id !== memberId)
        : [...prev.beneficiaryMemberIds, memberId],
    }));
  };

  const currencySymbol =
    CURRENCIES.find((c) => c.value === form.currency)?.symbol ?? "₩";
  const ordered = orderedMembers(members, defaultPaidByMemberId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="dialog-slide-from-bottom inset-0 left-0 top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col overflow-hidden bg-background data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        <DialogTitle className="sr-only">
          {isEdit ? "지출 수정" : "지출 추가"}
        </DialogTitle>

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
              <X />
            </Button>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-28 pt-6">
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

            <div className="mt-6 space-y-1">
              <Label className="text-muted-foreground text-sm">
                참여자 {form.beneficiaryMemberIds.length}명
              </Label>
              <div className="flex flex-col" role="group" aria-label="참여자 선택">
                {ordered.map((member) => {
                  const checked = form.beneficiaryMemberIds.includes(member.id);
                  const isPayer = form.paidByMemberId === member.id;
                  return (
                    <Button
                      key={member.id}
                      type="button"
                      variant="ghost"
                      onClick={() => toggleBeneficiary(member.id)}
                      className="h-14 justify-start rounded-none -mx-6 px-6 touch-manipulation font-normal"
                      aria-label={`${member.displayName} ${checked ? "참여함" : "참여 안 함"}`}
                      aria-pressed={checked}
                    >
                      <span className="flex flex-1 items-center gap-2">
                        <span className="font-medium">{member.displayName}</span>
                        {isPayer && (
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

          <div className="fixed bottom-0 left-0 right-0 z-10 w-full">
            <div className="h-8 w-full bg-linear-to-t from-background to-transparent pointer-events-none" aria-hidden />
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
                  !form.paidByMemberId ||
                  !(Number(form.amount) > 0) ||
                  form.beneficiaryMemberIds.length === 0
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
