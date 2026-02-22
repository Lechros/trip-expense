import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TripPage } from "@/components/trip/trip-page";
import {
  fetchTripServer,
  fetchTripMembersServer,
  fetchTripEntriesServer,
} from "@/lib/server-api";

type Props = { params: Promise<{ tripId: string }> };

/**
 * 여행 상세 페이지. 지출·멤버를 서버에서 prefetch 후 HydrationBoundary로 전달.
 */
export default async function TripDetailPage({ params }: Props) {
  const { tripId } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const queryClient = new QueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["trips", tripId],
      queryFn: () => fetchTripServer(tripId, cookieHeader),
    }),
    queryClient.prefetchQuery({
      queryKey: ["trips", tripId, "members"],
      queryFn: () => fetchTripMembersServer(tripId, cookieHeader),
    }),
    queryClient.prefetchQuery({
      queryKey: ["trips", tripId, "entries", {}, false],
      queryFn: () => fetchTripEntriesServer(tripId, cookieHeader, {}),
    }),
  ]);

  const tripData = queryClient.getQueryData<{ trip?: { name: string } }>(["trips", tripId]);
  if (!tripData?.trip) redirect(`/join/${tripId}`);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TripPage tripId={tripId} />
    </HydrationBoundary>
  );
}
