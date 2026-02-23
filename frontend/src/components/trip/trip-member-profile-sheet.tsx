"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#3b82f6", "#8b5cf6", "#ef4444", "#6b7280",
];

type TripMemberProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  displayName: string;
  colorHex: string | null;
  onSaved: () => void;
};

export function TripMemberProfileSheet({
  open,
  onOpenChange,
  tripId,
  displayName: initialDisplayName,
  colorHex: initialColorHex,
  onSaved,
}: TripMemberProfileSheetProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [colorHex, setColorHex] = useState(initialColorHex ?? PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (open) {
      setDisplayName(initialDisplayName);
      setColorHex(initialColorHex ?? PRESET_COLORS[0]);
      setError(null);
    }
  }, [open, initialDisplayName, initialColorHex]);

  const handleSave = async () => {
    const name = displayName.trim();
    if (!name) {
      setError("이름을 입력해 주세요");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await apiFetch<{ member: unknown }>(`/trips/${tripId}/members/me`, {
        method: "PATCH",
        body: JSON.stringify({ displayName: name, colorHex }),
      });
      if (!res.ok) throw new Error(res.error ?? "저장에 실패했습니다");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  const openLogoutConfirm = () => setLogoutConfirmOpen(true);

  const handleLogoutConfirm = async () => {
    setLogoutConfirmOpen(false);
    onOpenChange(false);
    await logout();
    router.replace("/");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !left-0 !right-0 !bottom-0 !top-auto !w-full max-w-none !translate-x-0 !translate-y-0 max-h-[85dvh] rounded-t-2xl border-0 border-b-0 p-0 gap-0 flex flex-col bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-200"
      >
        <DialogTitle className="sr-only">이 여행에서의 내 프로필</DialogTitle>
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-border px-4 py-3">
          <div className="w-9" aria-hidden />
          <h2 className="text-center text-base font-semibold text-foreground">
            내 프로필
          </h2>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              aria-label="닫기"
              onClick={() => onOpenChange(false)}
            >
              <X />
            </Button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="profile-displayName" className="text-sm text-muted-foreground">
              이 여행에서 보이는 이름
            </Label>
            <Input
              id="profile-displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="이름"
              className="min-h-12 bg-transparent"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">구분 색상</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`색상 ${hex}`}
                  className="size-9 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    backgroundColor: hex,
                    borderColor: colorHex === hex ? "var(--foreground)" : "transparent",
                  }}
                  onClick={() => setColorHex(hex)}
                />
              ))}
            </div>
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="shrink-0 space-y-3 px-6 pb-6">
          <Button
            type="button"
            size="lg"
            className="w-full min-h-12"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            className="w-full min-h-12"
            onClick={openLogoutConfirm}
          >
            로그아웃
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로그아웃</AlertDialogTitle>
            <AlertDialogDescription>
              로그아웃 하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleLogoutConfirm}
            >
              로그아웃
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
