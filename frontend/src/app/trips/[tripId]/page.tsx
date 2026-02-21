import { TripPage } from "@/components/trip/trip-page";

type Props = { params: Promise<{ tripId: string }> };

/**
 * 여행 상세 페이지. [지출, 환전, 정산, 설정] 4개 탭.
 * SPEC §4–§7: 정산 항목, 환전 기록, 정산 계산, 설정.
 */
export default async function TripDetailPage({ params }: Props) {
  const { tripId } = await params;
  return <TripPage tripId={tripId} />;
}
