import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthHydrate } from "@/components/auth-hydrate";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export default async function TripsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const res = await fetch(`${BACKEND_URL}/me`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (!res.ok) redirect("/login");
  return (
    <>
      <AuthHydrate />
      {children}
    </>
  );
}
