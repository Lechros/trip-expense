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
import { COUNTRY_OPTIONS } from "@/lib/countries";

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
  /** 공개 시 설정/변경할 비밀번호 (API 전송용, 저장되지 않음) */
  password?: string;
};

type TripEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: TripForm;
  onSave: (value: TripForm) => void | Promise<void>;
};

export function TripEditDialog({ open, onOpenChange, value, onSave }: TripEditDialogProps) {
  const [editForm, setEditForm] = useState<TripForm>(value);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEditForm({ ...value, baseCurrency: "KRW" });
      setSaveError(null);
    }
  }, [open, value]);

  const closeEdit = () => onOpenChange(false);

  const saveEdit = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      await onSave({ ...editForm });
      onOpenChange(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
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
                <div
                  id="trip-baseCurrency"
                  className="flex min-h-12 items-center rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground"
                >
                  KRW (원)
                </div>
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
                    {CURRENCY_OPTIONS.filter((c) => c.value !== "KRW").map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {saveError && (
              <p className="text-sm text-destructive" role="alert">
                {saveError}
              </p>
            )}
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
                <div className="space-y-2">
                  <Label htmlFor="trip-password" className="text-sm text-muted-foreground">
                    여행 비밀번호 (공개 시 필수)
                  </Label>
                  <Input
                    id="trip-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={editForm.hasPassword ? "변경 시에만 입력" : "비밀번호 입력"}
                    value={editForm.password ?? ""}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, password: e.target.value, hasPassword: !!e.target.value || p.hasPassword }))
                    }
                    className="min-h-12 bg-transparent"
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
              disabled={saving}
            >
              {saving ? "저장 중…" : "저장"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
