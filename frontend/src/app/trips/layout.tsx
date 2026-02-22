import { cookies } from "next/headers";
import { AuthHydrate } from "@/components/auth-hydrate";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export default async function TripsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const res = await fetch(`${BACKEND_URL}/me`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });
  // 인증 실패 시에도 여기서 /login으로 보내지 않음. 트립 상세는 참여 불가 시 /join/:tripId로, 목록은 페이지에서 /login으로 보냄.
  return (
    <>
      <AuthHydrate />
      {children}
    </>
  );
}
