/**
 * 서버 전용: 요청 쿠키로 백엔드 호출. SSR prefetch용.
 */

const BACKEND_URL = process.env.BACKEND_URL?.replace(/\/$/, "") ?? "";

export async function fetchTripServer(
  tripId: string,
  cookieHeader: string
): Promise<{ trip?: { name: string } }> {
  const res = await fetch(`${BACKEND_URL}/trips/${tripId}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return {};
  const data = await res.json().catch(() => ({}));
  return data as { trip?: { name: string } };
}

export type ApiMember = {
  id: string;
  displayName: string;
  colorHex: string | null;
  role?: string;
  userId: string | null;
  guestId: string | null;
};

export async function fetchTripMembersServer(
  tripId: string,
  cookieHeader: string
): Promise<{ members: ApiMember[] }> {
  const res = await fetch(`${BACKEND_URL}/trips/${tripId}/members`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return { members: [] };
  const data = (await res.json().catch(() => ({}))) as { members?: ApiMember[] };
  return { members: data.members ?? [] };
}

export type EntryFilter = {
  paidByMemberId?: string;
  beneficiaryMemberId?: string;
  dateFrom?: string;
  dateTo?: string;
  currency?: string;
  includeDeleted?: boolean;
};

export type ApiEntry = {
  id: string;
  amount: number;
  currency: string;
  paidAt: string;
  memo: string | null;
  deletedAt: string | null;
  paidBy: { memberId: string; displayName: string };
  beneficiaries: { memberId: string; displayName: string }[];
};

export async function fetchTripEntriesServer(
  tripId: string,
  cookieHeader: string,
  filter: EntryFilter = {}
): Promise<{ entries: ApiEntry[] }> {
  const params = new URLSearchParams();
  if (filter.paidByMemberId) params.set("paidByMemberId", filter.paidByMemberId);
  if (filter.beneficiaryMemberId) params.set("beneficiaryMemberId", filter.beneficiaryMemberId);
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom);
  if (filter.dateTo) params.set("dateTo", filter.dateTo);
  if (filter.currency) params.set("currency", filter.currency);
  if (filter.includeDeleted) params.set("includeDeleted", "true");
  const query = params.toString();
  const res = await fetch(`${BACKEND_URL}/trips/${tripId}/entries${query ? `?${query}` : ""}`, {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });
  if (!res.ok) return { entries: [] };
  const data = (await res.json().catch(() => ({}))) as { entries?: ApiEntry[] };
  return { entries: data.entries ?? [] };
}
