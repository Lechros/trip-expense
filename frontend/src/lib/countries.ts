/** 국가 목록 (ISO 3166-1 alpha-2). 여행 생성·수정 등에서 선택용 */
export const COUNTRY_OPTIONS = [
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
] as const;

export type CountryCode = (typeof COUNTRY_OPTIONS)[number]["value"];

/** code → 한글 라벨 (설정 탭 등 표시용) */
export const COUNTRY_LABELS: Record<string, string> = Object.fromEntries(
  COUNTRY_OPTIONS.map((c) => [c.value, c.label])
);
