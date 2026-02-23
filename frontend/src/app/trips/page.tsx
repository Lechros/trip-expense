import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Plane, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const BACKEND_URL = process.env.BACKEND_URL ?? "";

type TripItem = {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  countryCode: string;
  baseCurrency: string;
  additionalCurrency?: string | null;
  isPublic: boolean;
  createdAt: string;
  role?: string;
  memberId?: string;
};

export default async function TripsListPage() {
  const cookieStore = await cookies();
  const res = await fetch(`${BACKEND_URL}/trips`, {
    headers: { Cookie: cookieStore.toString() },
    cache: "no-store",
  });
  if (!res.ok) redirect("/login");
  const data = (await res.json().catch(() => ({}))) as { trips?: TripItem[]; error?: string };
  const trips: TripItem[] = data.trips ?? [];
  const error = null;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="shrink-0 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plane className="size-4" aria-hidden />
            </div>
            <span className="text-base font-semibold tracking-tight text-foreground">내 여행</span>
          </div>
          <Button asChild size="sm">
            <Link href="/trips/new">
              <Plus className="size-4" />
              새 여행
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-lg flex flex-col gap-4">
          {error && (
            <p className="text-center text-destructive" role="alert">
              {error}
            </p>
          )}
          {!error && trips.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">아직 여행이 없어요.</p>
                <p className="mt-1 text-sm text-muted-foreground">새 여행을 만들거나 초대 링크로 참여해 보세요.</p>
                <Button asChild className="mt-6">
                  <Link href="/trips/new">
                    <Plus className="size-4" />
                    여행 만들기
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {!error && trips.length > 0 && (
            <ul className="flex flex-col gap-3">
              {trips.map((t) => (
                <li key={t.id}>
                  <Button asChild variant="outline" className="h-auto w-full justify-start px-4 py-4 text-left">
                    <Link href={`/trips/${t.id}`}>
                      <span className="font-medium">{t.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {new Date(t.startDate).toLocaleDateString("ko-KR")}–
                        {new Date(t.endDate).toLocaleDateString("ko-KR")}
                      </span>
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
