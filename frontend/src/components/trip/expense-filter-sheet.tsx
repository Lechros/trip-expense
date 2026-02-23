"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

export type ExpenseFilter = {
  paidByMemberId?: string;
  beneficiaryMemberId?: string;
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
};

type ExpenseMember = { id: string; displayName: string };

const CURRENCIES = [
  { value: "", label: "전체" },
  { value: "KRW", label: "KRW (원)" },
  { value: "JPY", label: "JPY (엔)" },
];

type ExpenseFilterSheetProps = {
  open: boolean;
  onClose: () => void;
  members: ExpenseMember[];
  filter: ExpenseFilter;
  onApply: (filter: ExpenseFilter) => void;
};

/**
 * 지출 필터 시트. 결제자/수혜자/날짜/통화 선택 후 적용 시 onApply 호출.
 */
export function ExpenseFilterSheet({
  open,
  onClose,
  members,
  filter,
  onApply,
}: ExpenseFilterSheetProps) {
  const [paidBy, setPaidBy] = useState(filter.paidByMemberId ?? "");
  const [beneficiary, setBeneficiary] = useState(filter.beneficiaryMemberId ?? "");
  const [dateFrom, setDateFrom] = useState(filter.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filter.dateTo ?? "");
  const [currency, setCurrency] = useState(filter.currency ?? "");

  useEffect(() => {
    if (open) {
      setPaidBy(filter.paidByMemberId ?? "");
      setBeneficiary(filter.beneficiaryMemberId ?? "");
      setDateFrom(filter.dateFrom ?? "");
      setDateTo(filter.dateTo ?? "");
      setCurrency(filter.currency ?? "");
    }
  }, [open, filter]);

  const handleReset = () => {
    setPaidBy("");
    setBeneficiary("");
    setDateFrom("");
    setDateTo("");
    setCurrency("");
  };

  const handleApply = () => {
    onApply({
      paidByMemberId: paidBy || undefined,
      beneficiaryMemberId: beneficiary || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      currency: currency || undefined,
    });
    onClose();
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="overflow-hidden flex flex-col">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle id="expense-filter-title">필터</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel asChild>
                <Label>결제자</Label>
              </FieldLabel>
              <Select value={paidBy || "all"} onValueChange={(v) => setPaidBy(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full min-h-10">
                  <SelectValue placeholder="결제자 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel asChild>
                <Label>수혜자</Label>
              </FieldLabel>
              <Select value={beneficiary || "all"} onValueChange={(v) => setBeneficiary(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full min-h-10">
                  <SelectValue placeholder="수혜자 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel asChild>
                <Label>날짜</Label>
              </FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  placeholder="시작일"
                  className="min-h-10"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="시작일"
                />
                <Input
                  type="date"
                  placeholder="종료일"
                  className="min-h-10"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="종료일"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel asChild>
                <Label>통화</Label>
              </FieldLabel>
              <Select value={currency || "all"} onValueChange={(v) => setCurrency(v === "all" ? "" : v)}>
                <SelectTrigger className="w-full min-h-10">
                  <SelectValue placeholder="통화 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value || "all"} value={c.value || "all"}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>
        </div>

        <DrawerFooter className="flex-row gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 min-h-12 touch-manipulation"
            onClick={handleReset}
          >
            초기화
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1 min-h-12 touch-manipulation"
            onClick={handleApply}
          >
            적용
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
