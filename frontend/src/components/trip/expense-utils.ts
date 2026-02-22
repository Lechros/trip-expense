/** paidAt "2025-02-20" → "2.20" (월.일) */
export function formatMonthDay(paidAt: string): string {
  const [y, m, d] = paidAt.slice(0, 10).split("-").map(Number);
  return `${m}.${d}`;
}

/** 결제 일시를 로컬 시간 기준으로 "YYYY년 M월 D일" / "오전 H시 m분" 또는 "오후 H시 m분" 두 줄 반환 (세부 정보용) */
export function formatPaidAtLocalWithAmPm(paidAt: string): { dateLine: string; timeLine: string } {
  const d = new Date(paidAt);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours < 12 ? "오전" : "오후";
  const hour12 = hours % 12 || 12;
  return {
    dateLine: `${year}년 ${month}월 ${day}일`,
    timeLine: `${ampm} ${hour12}시 ${minutes}분`,
  };
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
