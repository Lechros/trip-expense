"use client";

/**
 * 정산 탭. SPEC §6.
 * 순서: 경고(외화 결제 > 환전 시) → 내 이체 목록 → 내 정산 결과 → 멤버별 정산 → 전체 이체 목록.
 * 현재는 목업 데이터로 UI만 구성.
 */

/** 목업: 로그인 사용자 */
const MOCK_CURRENT_USER = "김철수";

/** 목업: 누군가의 총 외화 결제액이 총 환전액보다 많을 때 true */
const MOCK_SHOW_EXCHANGE_WARNING = true;

/** 목업: 내가 받을 이체 (누구에게서 얼마) */
type MockReceive = { from: string; amountKrw: number };

/** 목업: 내가 줄 이체 (누구에게 얼마) */
type MockSend = { to: string; amountKrw: number };

const MOCK_MY_RECEIVE: MockReceive[] = [{ from: "이영희", amountKrw: 50000 }];
const MOCK_MY_SEND: MockSend[] = [];

/** 목업: 내 정산 결과. *TotalKrw = 원화 환산 합계, 나머지 = 통화별 내역 */
type MockMySettlement = {
  usedTotalKrw: number;
  usedKrw: number;
  usedJpy: number;
  paidTotalKrw: number;
  paidKrw: number;
  paidJpy: number;
};

const MOCK_MY_SETTLEMENT: MockMySettlement = {
  usedTotalKrw: 127000,
  usedKrw: 80000,
  usedJpy: 5000,
  paidTotalKrw: 150000,
  paidKrw: 20000,
  paidJpy: 2000,
};

/** 목업: 멤버별 결제·사용·차이 (원화만) */
type MockMemberSummary = {
  name: string;
  paidKrw: number;
  usedKrw: number;
  diffKrw: number;
};

const MOCK_MEMBERS: MockMemberSummary[] = [
  { name: "김철수", paidKrw: 150000, usedKrw: 100000, diffKrw: 50000 },
  { name: "이영희", paidKrw: 50000, usedKrw: 100000, diffKrw: -50000 },
  { name: "박민수", paidKrw: 100000, usedKrw: 100000, diffKrw: 0 },
];

/** 목업: 전체 이체 한 건 */
type MockTransfer = {
  from: string;
  to: string;
  amountKrw: number;
};

const MOCK_TRANSFERS: MockTransfer[] = [
  { from: "이영희", to: "김철수", amountKrw: 50000 },
];

function formatKrw(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatJpy(amount: number): string {
  return `${amount.toLocaleString("ko-KR")} JPY`;
}

export function TabSettlement() {
  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      {/* 1. 맨 위: 외화 결제 > 환전 시 경고 */}
      {MOCK_SHOW_EXCHANGE_WARNING && (
        <section aria-label="환전 부족 안내">
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
            <p className="text-sm text-foreground">
              일부 멤버의 외화 결제액이 환전한 금액보다 많습니다. 환전 탭에서 추가 환전을 등록해 주세요.
            </p>
          </div>
        </section>
      )}

      {/* 2. 로그인 사용자의 정산 결과: 컬럼(왼쪽 라벨, 오른쪽 금액·세부 내역) */}
      <section aria-label={`${MOCK_CURRENT_USER}님의 정산 결과`}>
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          내 정산 결과
        </h2>
        <div className="rounded-xl border border-border bg-card px-4 pt-3 pb-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 items-baseline">
            <p className="text-sm text-muted-foreground mt-1">사용 금액</p>
            <div className="text-right min-w-0">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatKrw(MOCK_MY_SETTLEMENT.usedTotalKrw)}
              </p>
              {(MOCK_MY_SETTLEMENT.usedKrw > 0 || MOCK_MY_SETTLEMENT.usedJpy > 0) && (
                <p className="text-sm tabular-nums text-muted-foreground mt-0.5">
                  {[
                    MOCK_MY_SETTLEMENT.usedKrw > 0 && formatKrw(MOCK_MY_SETTLEMENT.usedKrw),
                    MOCK_MY_SETTLEMENT.usedJpy > 0 && `${MOCK_MY_SETTLEMENT.usedJpy.toLocaleString("ko-KR")}엔`,
                  ]
                    .filter(Boolean)
                    .join(" + ")}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border pt-3 mt-3 items-baseline">
            <p className="text-sm text-muted-foreground">결제 금액</p>
            <div className="text-right min-w-0">
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {formatKrw(MOCK_MY_SETTLEMENT.paidTotalKrw)}
              </p>
              {(MOCK_MY_SETTLEMENT.paidKrw > 0 || MOCK_MY_SETTLEMENT.paidJpy > 0) && (
                <p className="text-sm tabular-nums text-muted-foreground mt-0.5">
                  {[
                    MOCK_MY_SETTLEMENT.paidKrw > 0 && formatKrw(MOCK_MY_SETTLEMENT.paidKrw),
                    MOCK_MY_SETTLEMENT.paidJpy > 0 && `${MOCK_MY_SETTLEMENT.paidJpy.toLocaleString("ko-KR")}엔`,
                  ]
                    .filter(Boolean)
                    .join(" + ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. 로그인 사용자의 이체 목록: 누구에게서 얼마 받고, 누구에게 얼마 줘야 하는지 */}
      <section aria-label={`${MOCK_CURRENT_USER}님의 이체 목록`}>
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          내 이체 목록
        </h2>
        <div className="flex flex-col gap-2">
          {MOCK_MY_RECEIVE.length === 0 && MOCK_MY_SEND.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 py-6 text-center text-sm text-muted-foreground">
              받을·줄 이체가 없습니다.
            </div>
          ) : (
            <>
              {MOCK_MY_RECEIVE.map((r) => (
                <div
                  key={r.from}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-2"
                >
                  <span className="text-foreground">
                    <span className="font-medium">{r.from}</span>
                    <span className="text-muted-foreground">에게서 </span>
                    <span className="font-semibold tabular-nums text-green-600 dark:text-green-500">
                      {formatKrw(r.amountKrw)} 받기
                    </span>
                  </span>
                </div>
              ))}
              {MOCK_MY_SEND.map((s) => (
                <div
                  key={s.to}
                  className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between gap-2"
                >
                  <span className="text-foreground">
                    <span className="font-medium">{s.to}</span>
                    <span className="text-muted-foreground">에게 </span>
                    <span className="font-semibold tabular-nums text-destructive">
                      {formatKrw(s.amountKrw)} 주기
                    </span>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* 구분: 내 → 전체 */}
      <div className="border-t border-border pt-6 mt-2" aria-hidden />

      {/* 4. 멤버별 정산: 이름 | 사용(금액) / 결제(금액) 두 줄, 차액 없음 */}
      <section aria-label="멤버별 정산">
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          멤버별 정산
        </h2>
        <ul className="flex flex-col gap-2" role="list">
          {MOCK_MEMBERS.map((m) => (
            <li
              key={m.name}
              className="rounded-xl border border-border bg-card px-4 py-3 grid grid-cols-[auto_1fr] gap-x-4 items-start"
            >
              <span className="font-medium text-foreground text-sm leading-6">{m.name}</span>
              <div className="text-right text-sm min-w-0">
                <p className="leading-6">
                  <span className="text-muted-foreground">사용 </span>
                  <span className="tabular-nums text-foreground">{formatKrw(m.usedKrw)}</span>
                </p>
                <p className="leading-6 mt-px">
                  <span className="text-muted-foreground">결제 </span>
                  <span className="tabular-nums text-foreground">{formatKrw(m.paidKrw)}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. 전체 이체 목록 */}
      <section aria-label="전체 이체 목록">
        <h2 className="text-sm font-medium text-muted-foreground pb-2">
          전체 이체 목록
        </h2>
        {MOCK_TRANSFERS.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 py-8 text-center text-sm text-muted-foreground">
            이체할 내역이 없습니다.
          </div>
        ) : (
          <ul className="flex flex-col gap-2" role="list">
            {MOCK_TRANSFERS.map((t, i) => (
              <li
                key={`${t.from}-${t.to}-${i}`}
                className="rounded-xl border border-border bg-card px-4 py-2.5 flex items-center justify-between gap-2"
              >
                <span className="text-sm text-foreground">
                  <span>{t.from}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span>{t.to}</span>
                </span>
                <span className="text-sm tabular-nums text-foreground">
                  {formatKrw(t.amountKrw)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
