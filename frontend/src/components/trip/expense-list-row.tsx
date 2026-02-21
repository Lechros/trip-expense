"use client";

import React from "react";
import { FileText, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAmount, formatMonthDay, getDateKey, getYear, isCurrentYear } from "./expense-utils";

export type ExpenseListEntry = {
  id: string;
  title: string;
  paidBy: string;
  amount: number;
  currency: string;
  paidAt: string;
  beneficiaries: string[];
  memo?: string;
};

type ExpenseListRowProps = {
  entry: ExpenseListEntry;
  index: number;
  entries: ExpenseListEntry[];
  onSelect: (entry: ExpenseListEntry) => void;
};

export function ExpenseListRow({ entry, index, entries, onSelect }: ExpenseListRowProps) {
  const dateKey = getDateKey(entry.paidAt);
  const prevDateKey = index > 0 ? getDateKey(entries[index - 1].paidAt) : "";
  const showDate = dateKey !== prevDateKey;
  const entryYear = getYear(entry.paidAt);
  const prevYear = index > 0 ? getYear(entries[index - 1].paidAt) : null;
  const showYearHeader =
    !isCurrentYear(entry.paidAt) &&
    (prevYear === null || prevYear !== entryYear);

  return (
    <React.Fragment key={entry.id}>
      {showYearHeader && (
        <li
          className={cn(
            "pt-3 pb-1 px-4",
            index > 0 && "border-t border-border"
          )}
          aria-hidden
        >
          <p className="text-sm text-muted-foreground">
            {entryYear}년
          </p>
        </li>
      )}
      <li>
        <button
          type="button"
          className={cn(
            "w-full py-4 text-left",
            "transition-colors hover:bg-muted/50 active:bg-muted touch-manipulation min-h-14"
          )}
          onClick={() => onSelect(entry)}
          aria-label={`${entry.title}, ${entry.paidBy}님이 ${formatAmount(entry.amount, entry.currency)} 결제. 상세 보기`}
        >
          <div className="flex items-start gap-3 px-4">
            <div className="w-11 shrink-0 h-5 flex items-center text-muted-foreground">
              {showDate ? (
                <span className="text-sm tabular-nums">
                  {formatMonthDay(entry.paidAt)}
                </span>
              ) : (
                <span className="invisible text-sm tabular-nums" aria-hidden>
                  {formatMonthDay(entry.paidAt)}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-5 flex items-center min-w-0">
                <p className="font-medium text-foreground flex items-center gap-1.5 truncate min-w-0">
                  <span className="truncate">{entry.title}</span>
                  {entry.memo && (
                    <FileText
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-label="메모 있음"
                    />
                  )}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-1 truncate flex items-center gap-1.5">
                <span>{entry.paidBy}</span>
                <ArrowLeft className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                <span>{entry.beneficiaries.join(" · ")}</span>
              </p>
            </div>
            <div className="shrink-0 h-5 flex items-center">
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {formatAmount(entry.amount, entry.currency)}
              </span>
            </div>
          </div>
        </button>
      </li>
    </React.Fragment>
  );
}
