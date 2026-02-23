"use client";

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TripMemberProfileSheet } from "./trip-member-profile-sheet";

export type TripPageHeaderMember = {
  id: string;
  displayName: string;
  colorHex: string | null;
};

type TripPageHeaderProps = {
  tripName: string;
  tripId: string;
  currentMember: TripPageHeaderMember | null;
};

/**
 * 여행 상세 상단 헤더. 서버에서 tripName·currentMember를 받아 첫 HTML에 반영(SSR).
 * 프로필 버튼·시트는 클라이언트 인터랙션.
 */
export function TripPageHeader({ tripName, tripId, currentMember }: TripPageHeaderProps) {
  const queryClient = useQueryClient();
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const invalidateMembers = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["trips", tripId, "members"] });
  }, [queryClient, tripId]);

  return (
    <>
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Plane aria-hidden />
          </div>
          <span className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
            {tripName}
          </span>
          {currentMember && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 gap-1.5 rounded-full pl-1.5 pr-2.5 py-1.5 h-auto min-h-9 touch-manipulation"
              onClick={() => setProfileSheetOpen(true)}
              aria-label="이 여행에서의 내 프로필 수정"
            >
              <span
                className="size-6 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: currentMember.colorHex ?? "#94a3b8" }}
                aria-hidden
              />
              <span className="max-w-[100px] truncate text-sm text-foreground">
                {currentMember.displayName}
              </span>
            </Button>
          )}
        </div>
      </header>

      {currentMember && (
        <TripMemberProfileSheet
          open={profileSheetOpen}
          onOpenChange={setProfileSheetOpen}
          tripId={tripId}
          displayName={currentMember.displayName}
          colorHex={currentMember.colorHex}
          onSaved={invalidateMembers}
        />
      )}
    </>
  );
}
