import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TripPage } from "@/components/trip/trip-page";
import { TripPageHeader } from "@/components/trip/trip-page-header";
import {
  fetchTripServer,
  fetchTripMembersServer,
  fetchTripEntriesServer,
} from "@/lib/server-api";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

type Props = { params: Promise<{ tripId: string }> };

/**
 * 여행 상세 페이지. 서버에서 trip·멤버·/me prefetch 후 헤더(SSR) + HydrationBoundary로 전달.
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

  const membersData = queryClient.getQueryData<{ members: { id: string; displayName: string; colorHex: string | null; userId: string | null; guestId: string | null }[] }>([
    "trips",
    tripId,
    "members",
  ]);
  const members = membersData?.members ?? [];

  const meRes = await fetch(`${BACKEND_URL}/me`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  const meJson = meRes.ok ? await meRes.json().catch(() => null) : null;
  const currentMember =
    meJson?.user
      ? members.find((m) => m.userId === meJson.user.id)
      : meJson?.guest
        ? members.find((m) => m.id === meJson.guest.memberId)
        : null;

  const headerMember =
    currentMember ?
      {
        id: currentMember.id,
        displayName: currentMember.displayName,
        colorHex: currentMember.colorHex,
      }
    : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <TripPageHeader
        tripName={tripData.trip.name}
        tripId={tripId}
        currentMember={headerMember}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TripPage tripId={tripId} />
      </HydrationBoundary>
    </div>
  );
}
