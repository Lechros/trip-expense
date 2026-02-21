/** paidAt "2025-02-20" → "2.20" (월.일) */
export function formatMonthDay(paidAt: string): string {
  const [y, m, d] = paidAt.slice(0, 10).split("-").map(Number);
  return `${m}.${d}`;
}

export function formatAmount(amount: number, currency: string): string {
  if (currency === "KRW") return `${amount.toLocaleString("ko-KR")}원`;
  return `${amount.toLocaleString("ko-KR")} ${currency}`;
}

export function getDateKey(paidAt: string): string {
  return paidAt.slice(0, 10);
}

export function isCurrentYear(paidAt: string): boolean {
  return new Date(paidAt).getFullYear() === new Date().getFullYear();
}

export function getYear(paidAt: string): number {
  return new Date(paidAt).getFullYear();
}
