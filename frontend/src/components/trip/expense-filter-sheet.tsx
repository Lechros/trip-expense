"use client";

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

/** 프로토타입용. 연동 시 트립 멤버·통화로 교체 */
const MOCK_MEMBERS = ["김철수", "이영희", "박민수"];
const CURRENCIES = [
  { value: "", label: "전체" },
  { value: "KRW", label: "KRW (원)" },
  { value: "JPY", label: "JPY (엔)" },
];

type ExpenseFilterSheetProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * 지출 필터 시트 — 레이아웃만.
 * 결제자/수혜자/날짜/통화 영역 + 초기화·적용 버튼. 필터 로직·연동 없음.
 */
export function ExpenseFilterSheet({ open, onClose }: ExpenseFilterSheetProps) {
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
              <Select disabled>
                <SelectTrigger className="w-full min-h-10">
                  <SelectValue placeholder="결제자 선택" />
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

            <Field>
              <FieldLabel asChild>
                <Label>수혜자</Label>
              </FieldLabel>
              <Select disabled>
                <SelectTrigger className="w-full min-h-10">
                  <SelectValue placeholder="수혜자 선택" />
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

            <Field>
              <FieldLabel asChild>
                <Label>날짜</Label>
              </FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  placeholder="시작일"
                  className="min-h-10"
                  disabled
                  aria-label="시작일"
                />
                <Input
                  type="date"
                  placeholder="종료일"
                  className="min-h-10"
                  disabled
                  aria-label="종료일"
                />
              </div>
            </Field>

            <Field>
              <FieldLabel asChild>
                <Label>통화</Label>
              </FieldLabel>
              <Select disabled>
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
            onClick={onClose}
          >
            초기화
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1 min-h-12 touch-manipulation"
            onClick={onClose}
          >
            적용
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
