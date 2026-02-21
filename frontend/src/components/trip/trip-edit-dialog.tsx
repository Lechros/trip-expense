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
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

/** 국가 목록 (ISO 3166-1 alpha-2). 연동 시 필요 목록으로 교체 */
const COUNTRY_OPTIONS = [
  { value: "KR", label: "대한민국" },
  { value: "JP", label: "일본" },
  { value: "US", label: "미국" },
  { value: "CN", label: "중국" },
  { value: "TH", label: "태국" },
  { value: "VN", label: "베트남" },
  { value: "SG", label: "싱가포르" },
  { value: "TW", label: "대만" },
  { value: "HK", label: "홍콩" },
  { value: "GB", label: "영국" },
  { value: "FR", label: "프랑스" },
  { value: "DE", label: "독일" },
  { value: "IT", label: "이탈리아" },
  { value: "ES", label: "스페인" },
  { value: "AU", label: "호주" },
];

/** 추가 통화 '선택 안 함'용 값 (Select는 빈 문자열 value 불가) */
const ADDITIONAL_CURRENCY_NONE = "__none__";

/** 통화 목록. 연동 시 트립 허용 통화 등으로 제한 가능 */
const CURRENCY_OPTIONS = [
  { value: "KRW", label: "KRW (원)" },
  { value: "JPY", label: "JPY (엔)" },
  { value: "USD", label: "USD (달러)" },
  { value: "EUR", label: "EUR (유로)" },
  { value: "CNY", label: "CNY (위안)" },
  { value: "THB", label: "THB (바트)" },
  { value: "GBP", label: "GBP (파운드)" },
  { value: "AUD", label: "AUD (호주 달러)" },
];

export type TripForm = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  countryCode: string;
  baseCurrency: string;
  additionalCurrency: string;
  isPublic: boolean;
  hasPassword: boolean;
};

type TripEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: TripForm;
  onSave: (value: TripForm) => void;
};

export function TripEditDialog({ open, onOpenChange, value, onSave }: TripEditDialogProps) {
  const [editForm, setEditForm] = useState<TripForm>(value);

  useEffect(() => {
    if (open) setEditForm({ ...value });
  }, [open, value]);

  const closeEdit = () => onOpenChange(false);

  const saveEdit = () => {
    onSave({ ...editForm });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeEdit()}>
      <DialogContent
        showCloseButton={false}
        className="dialog-slide-from-bottom inset-0 left-0 top-0 h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col overflow-hidden bg-background data-[state=open]:animate-none data-[state=closed]:animate-none"
      >
        <DialogTitle className="sr-only">여행 설정 수정</DialogTitle>
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-3 sm:px-6">
          <div className="w-9" aria-hidden />
          <h2 className="text-foreground text-center text-base font-semibold">
            여행 설정 수정
          </h2>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full"
              aria-label="닫기"
              onClick={closeEdit}
            >
              <X />
            </Button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-28 pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trip-name" className="text-sm text-muted-foreground">이름</Label>
              <Input
                id="trip-name"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="min-h-12 bg-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-description" className="text-sm text-muted-foreground">설명</Label>
              <Input
                id="trip-description"
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                className="min-h-12 bg-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trip-startDate" className="text-sm text-muted-foreground">시작일</Label>
                <Input
                  id="trip-startDate"
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="min-h-12 bg-transparent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-endDate" className="text-sm text-muted-foreground">종료일</Label>
                <Input
                  id="trip-endDate"
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="min-h-12 bg-transparent"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-countryCode" className="text-sm text-muted-foreground">국가</Label>
              <Select
                value={editForm.countryCode}
                onValueChange={(v) => setEditForm((p) => ({ ...p, countryCode: v }))}
              >
                <SelectTrigger id="trip-countryCode" className="min-h-12 bg-transparent w-full">
                  <SelectValue placeholder="국가 선택" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trip-baseCurrency" className="text-sm text-muted-foreground">기본 통화</Label>
                <Select
                  value={editForm.baseCurrency}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, baseCurrency: v }))}
                >
                  <SelectTrigger id="trip-baseCurrency" className="min-h-12 bg-transparent w-full">
                    <SelectValue placeholder="통화 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-additionalCurrency" className="text-sm text-muted-foreground">추가 통화</Label>
                <Select
                  value={editForm.additionalCurrency || ADDITIONAL_CURRENCY_NONE}
                  onValueChange={(v) =>
                    setEditForm((p) => ({ ...p, additionalCurrency: v === ADDITIONAL_CURRENCY_NONE ? "" : v }))
                  }
                >
                  <SelectTrigger id="trip-additionalCurrency" className="min-h-12 bg-transparent w-full">
                    <SelectValue placeholder="선택 안 함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ADDITIONAL_CURRENCY_NONE}>선택 안 함</SelectItem>
                    {CURRENCY_OPTIONS.filter((c) => c.value !== editForm.baseCurrency).map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="trip-isPublic" className="text-sm text-muted-foreground">공개 (링크 보유자만 접근)</Label>
                <input
                  id="trip-isPublic"
                  type="checkbox"
                  checked={editForm.isPublic}
                  onChange={(e) => setEditForm((p) => ({ ...p, isPublic: e.target.checked }))}
                  className="size-4 rounded border-border"
                />
              </div>
              {editForm.isPublic && (
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="trip-hasPassword" className="text-sm text-muted-foreground">여행 비밀번호 설정</Label>
                  <input
                    id="trip-hasPassword"
                    type="checkbox"
                    checked={editForm.hasPassword}
                    onChange={(e) => setEditForm((p) => ({ ...p, hasPassword: e.target.checked }))}
                    className="size-4 rounded border-border"
                  />
                </div>
              )}
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
              onClick={closeEdit}
            >
              취소
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-h-12 flex-1 touch-manipulation"
              onClick={saveEdit}
            >
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
