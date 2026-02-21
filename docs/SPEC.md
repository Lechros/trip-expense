# 여행 비용 정산 — 개발 정의서

개발 시 준수할 요구사항·데이터·API·기술 스택을 정의한다.

---

## 1. 개요

| 항목 | 내용                                                                                  |
| ---- | ------------------------------------------------------------------------------------- |
| 목적 | 여행 중 지출 기록, 여행 후 "누가 누구에게 얼마" 정산 계산·표시                        |
| UI   | 모바일 우선, 반응형                                                                   |
| 제약 | 소규모 사용 가정, 무료 티어 배포(Vercel, Railway), 비즈니스 로직은 별도 백엔드만 사용 |

---

## 2. 인증·사용자

### 2.1 회원

- 가입: 소셜(Google 등).
- 세션: JWT(access + refresh). Redis 미사용.

### 2.2 비회원(게스트)

- **목적**: 가입 없이 참여하되, 여러 기기에서 한 여행에 접속할 때 동일 게스트로 동기화할 수 있도록 함.
- **범위(여행 단위)**: 비회원은 **여행 단위로만 존재**한다. 한 게스트는 항상 특정 여행 하나에만 속하며, 동일 사람이 다른 여행에 비회원으로 참여하면 **여행마다 별도 게스트**로 취급된다. 시스템·UI·API에서 이 범위가 드러나야 한다(예: 게스트 식별은 항상 `tripId + guestId` 조합, 여행 전환 시 해당 여행의 멤버십만 사용).
- **참여**: 회원과 동일하게 **초대 링크**(여행 id 포함)로 참여한다. 해당 여행에 접속하려면 **링크(여행 id)와 여행 비밀번호를 모두 입력**해야 한다. 링크만으로는 참여 화면 진입이 불가하다.
- **게스트 계정**: 각 게스트는 **이름(displayName) + 비밀번호**로 식별. 비밀번호는 서버에 해시 저장. 다른 기기에서 같은 게스트로 들어오려면 "초대 링크 접속 → 여행 비밀번호 입력 → 기존 비회원 선택 → 해당 게스트 비밀번호 입력"으로 본인 검증.
- **권한**: 회원·비회원 구분 없이, **여행의 owner인지 여부**로만 구분(§2.3).

#### 2.2.1 게스트 참여 화면 플로우(링크 접속 시, 다른 기기 포함)

사용자가 **초대 링크**(여행 id 포함)로 접속했을 때(초기 진입 또는 다른 기기에서 재접속) 아래 순서로 진행한다. **링크(여행 id)와 여행 비밀번호를 모두 입력**해야 참여 단계로 진행할 수 있다.

1. **진입**: 사용자는 초대 링크를 통해 참여 화면에 도달한다. 링크에 포함된 **여행 id**로 해당 여행이 식별된다.

2. **여행 비밀번호 입력**: 링크로 식별된 여행에 접속하려면 **여행 비밀번호**를 입력해야 한다. 비밀번호 검증 성공 시에만 참여 방식 선택으로 이동한다.

3. **참여 방식 선택**
   - **회원으로 참여**: 로그인 여부에 따라 다르게 표시한다. 비로그인 시 로그인 버튼을 노출하여 로그인 후 해당 여행에 회원으로 참여한다. 로그인 상태일 때는 (회원 표시명)으로 참여하기 버튼을 노출한다.
   - **비회원으로 진행**: 아래 4번으로 이동.

4. **비회원으로 진행 선택 시**
   - **뒤로가기**: 3번(참여 방식 선택)으로 복귀 가능.
   - **현재 존재하는 비회원 목록**: 이 여행에 이미 등록된 게스트 목록 표시(displayName 등 식별용).
   - **새 비회원 추가** 버튼: 신규 게스트 생성(6번)으로 이동.

5. **기존 비회원 선택 시**
   - 목록에서 한 명 선택 → **해당 게스트의 비밀번호** 입력.
   - 검증 성공 시 해당 게스트로 로그인하여 여행 화면 진입(다른 기기 동기화).

6. **새 비회원 추가 시**
   - **이름**(displayName), **비밀번호**, **비밀번호 확인** 입력 후 생성.
   - 생성 성공 시 해당 게스트로 로그인하여 여행 화면 진입. 다른 기기에서는 4번에서 이 게스트 선택 후 비밀번호로 로그인하면 동일 인물로 동기화됨.

### 2.3 권한

- **구분**: 회원/비회원이 아닌 **여행의 owner(생성자) 여부**로만 권한을 구분한다.
- **여행 생성**: 회원만 가능(비회원은 계정이 없어 생성 불가). 생성 시 해당 회원이 owner.
- **여행 목록·조회**: 회원은 참여 여행 전체, 비회원(게스트)은 링크로 참여한 여행만 노출.

| 기능               | owner(여행 생성자) | 멤버(그 외) |
| ------------------ | ------------------ | ----------- |
| 여행 설정 수정     | ✅                 | ❌          |
| 멤버 목록·내보내기 | ✅                 | ❌          |
| 정산 항목 CRUD     | ✅                 | ✅          |
| 환전 기록 CRUD     | ✅                 | ✅          |
| 정산 계산 보기     | ✅                 | ✅          |

---

## 3. 여행(Trip)

### 3.1 정의

- 생성: 회원만. 이름, 기간(시작일–종료일), 국가(ISO country code) 필수. 생성자가 owner.
- **초대 링크**: 여행 id가 포함된 URL. 링크를 가진 사용자가 해당 여행에 접속(참여)하려면 **여행 비밀번호**를 함께 입력해야 한다.
- 참여: **회원·비회원 모두** 초대 링크(여행 id) + 여행 비밀번호로 참여. 내가 속한 여행만 목록 노출.
- **공개 여부**: 설정에서 여행의 공개 여부를 지정한다. **공개**(링크를 가진 사용자만 접근 가능)로 설정한 경우 **여행 비밀번호를 반드시 설정**해야 한다. 비공개 여행은 링크·비밀번호 방식의 참여를 사용하지 않거나 별도 정책으로 정의.
- 통화: 기본 통화 KRW 고정. 추가 통화 1개만 허용(예: JPY 또는 USD). 즉 최대 2통화.
- 접근: 모든 trip 하위 API에서 요청자가 해당 trip 멤버(회원 또는 게스트)인지 검증 필수.

### 3.2 여행 내 프로필

- TripMember별: displayName(이 여행에서만 보이는 이름), colorHex(구분용 색상).
- 설정: 여행 설정 또는 "내 프로필(이 여행)" 모달.

---

## 4. 정산 항목(Settlement Entry)

### 4.1 의미

"누가, 언제, 얼마를 결제했고, 그 비용이 누구 것인지" 기록. 실제 결제/송금 기능 없음.

### 4.2 필드

| 필드              | 타입     | 필수 | 설명                                              |
| ----------------- | -------- | ---- | ------------------------------------------------- |
| id                | UUID     | ✓    |                                                   |
| tripId            | FK       | ✓    |                                                   |
| paidByUserId      | FK       | 조건 | 결제자(회원). paidByGuestId와 둘 중 하나 필수     |
| paidByGuestId     | FK       | 조건 | 결제자(게스트)                                    |
| amount            | decimal  | ✓    | > 0                                               |
| currency          | code     | ✓    | 해당 여행 허용 통화                               |
| paidAt            | datetime | ✓    | 사용자 입력 결제 시각                             |
| recordedAt        | datetime | ✓    | 서버 저장 시각(수정 불가)                         |
| recordedByUserId  | FK       | 조건 | 입력자(회원). recordedByGuestId와 둘 중 하나 필수 |
| recordedByGuestId | FK       | 조건 | 입력자(게스트)                                    |
| memo              | string   |      |                                                   |
| deletedAt         | datetime |      | null이면 유효. soft delete                        |

- beneficiaries: 별도 N:N 테이블(SettlementBeneficiary). entryId, userId 또는 guestId. 1:N 가능.

### 4.3 비즈니스 규칙

- amount > 0. currency는 trip의 baseCurrency 또는 additionalCurrencies 중 하나.
- paidBy, beneficiaries 모두 해당 trip의 멤버(회원 또는 게스트).
- paidAt은 여행 기간으로 제한하지 않음.

### 4.4 UI

- 목록: 리스트형. 가상 리스트로 수십 개 부드럽게 표시. 필터: 결제자/수혜자/날짜/통화.
- 수정: 항목 탭 → 상세 또는 바텀시트에서 수정.
- 삭제: soft delete(deletedAt 설정). 목록 기본은 미삭제만. "삭제된 항목 보기" 필터 제공. 정산 계산 시 deletedAt null인 항목만 사용.

---

## 5. 환전 기록(Exchange Record)

### 5.1 목적

정산 계산 시 "결제자별 환율" 산출용. 입력 예: 1 JPY = 9.4 KRW, 10,000 JPY → targetAmount는 서버에서 rate×sourceAmount로 계산해 저장.

### 5.2 필드

| 필드             | 타입          | 필수 | 설명                              |
| ---------------- | ------------- | ---- | --------------------------------- |
| id               | UUID          | ✓    |                                   |
| tripId           | FK            | ✓    |                                   |
| userId / guestId | FK            | 조건 | 환전한 사람(둘 중 하나)           |
| sourceCurrency   | code          | ✓    | 예: JPY                           |
| targetCurrency   | code          | ✓    | KRW(기본 통화)                    |
| rate             | decimal       | ✓    | 1 source = rate target, > 0       |
| sourceAmount     | decimal       | ✓    | > 0                               |
| targetAmount     | decimal       | ✓    | 서버에서 rate×sourceAmount로 저장 |
| exchangedAt      | date/datetime | ✓    |                                   |
| recordedAt       | datetime      | ✓    |                                   |

---

## 6. 정산 계산

### 6.1 표시 내용

1. 기준 통화(KRW) 환산: 멤버별 "결제한 금액", "사용한 금액"(beneficiary 참여 비용의 1/N).
2. 멤버별 차이: (결제한 금액 − 사용한 금액). 양수면 받을 돈, 음수면 낼 돈.
3. 이체 목록: "A가 B에게 X원 전달" 형태. 최소 이체 횟수 그리디 알고리즘 사용.

### 6.2 환율 적용

- 항목별: 결제자(paidBy)의, paidAt에 가장 가까운 환전 기록들로 평균 환율 산출 → amount × 평균 환율로 KRW 환산.
- 환전 기록 없음: 해당 항목은 정산 계산에서 제외하고, "OO님의 [통화] 환전 기록이 없어 이 결제는 원화로 환산되지 않았습니다" 안내.

### 6.3 알고리즘(요약)

1. 유효 항목(deletedAt null)만 기준 통화로 환산.
2. 멤버별 결제 합계·사용 합계 → 순 차이 계산.
3. 받을 사람·줄 사람 그리디 매칭(큰 금액부터 상쇄) → 이체 리스트 생성.

---

## 7. 설정 페이지

- 접근: 여행 내 설정(톱니바퀴).
- 여행 설정: 이름, 설명, 기간, 국가, 기본/추가 통화. 수정 권한: owner만.
- **공개 여부**: 비공개 / 공개(링크를 가진 사용자만 접근 가능). **공개로 설정 시 여행 비밀번호를 반드시 설정**하도록 한다. 여행 비밀번호는 참여 시 링크와 함께 입력하는 값이며, 해시 저장.
- 멤버 관리: owner만. 멤버 목록, 내보내기. owner 자신은 제거 불가; 제거 시 "다른 멤버에게 owner 이전" 후 제거. 단 비회원에게 이전 불가.
- 데이터: 기간 변경 시 유효성 검사 없음. 멤버 제거 시 해당 멤버가 포함된 기존 항목은 유지, 표시 시 "탈퇴한 멤버" 라벨. 정산 계산에는 포함.

---

## 8. 기술 스택

### 8.1 프론트엔드

| 항목       | 기술                                                |
| ---------- | --------------------------------------------------- |
| 프레임워크 | Next.js 14+ (App Router), React 18, TypeScript      |
| 스타일     | Tailwind CSS, 모바일 우선                           |
| UI         | shadcn/ui                                           |
| 상태       | Zustand(클라이언트), TanStack Query(서버 상태·캐시) |
| 검증·폼    | Zod, React Hook Form                                |

### 8.2 백엔드

| 항목       | 기술                   |
| ---------- | ---------------------- |
| 런타임     | Node.js, TypeScript    |
| 프레임워크 | Fastify                |
| DB         | PostgreSQL             |
| ORM        | Prisma                 |
| 인증       | JWT (access + refresh) |
| 검증       | Zod                    |

### 8.3 아키텍처

- 클라이언트 ↔ Next.js(Vercel) ↔ Backend API(Railway) ↔ PostgreSQL(Railway).
- 비즈니스 로직·DB 접근은 백엔드만. Next API Route는 SSR/프록시 목적만 사용 가능.
- CORS: 백엔드에서 Vercel 도메인·localhost만 허용.

---

## 9. 데이터 모델

| 엔티티                | 주요 필드                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User                  | id, email, passwordHash 또는 oauthId, createdAt                                                                                                                 |
| Guest                 | id, tripId, displayName, colorHex, passwordHash, createdAt. **여행 단위로만 존재**: 한 레코드는 한 여행에만 속함. 동일 사람이 다른 여행에 비회원 참여 시 여행마다 별도 Guest. 다른 기기 복원 시 비밀번호로 검증. |
| Trip                  | id, name, description?, startDate, endDate, countryCode, baseCurrency(KRW), additionalCurrencies(배열, 최대 1개), visibility(공개 여부), passwordHash(공개 시 여행 비밀번호 해시), createdByUserId, createdAt. 링크에는 id가 포함됨. 공개 여행은 passwordHash 필수. |
| TripMember            | id, tripId, userId?, guestId?, displayName, colorHex, role(owner/member), joinedAt. userId/guestId 둘 중 하나 필수. owner는 생성자 1명                          |
| SettlementEntry       | id, tripId, paidByUserId?, paidByGuestId?, recordedByUserId?, recordedByGuestId?, amount, currency, paidAt, recordedAt, memo?, deletedAt?                       |
| SettlementBeneficiary | entryId, userId 또는 guestId (N:N)                                                                                                                              |
| ExchangeRecord        | id, tripId, userId?, guestId?, sourceCurrency, targetCurrency, rate, sourceAmount, targetAmount, exchangedAt, recordedAt                                        |

- 금액: decimal 또는 정수(원 단위) 사용. 부동소수 오차 방지.
- FK·인덱스·unique: 구현 시 ERD에서 정의.

---

## 10. API 목록

- 인증: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /me`, `PATCH /me`
- 여행: `GET /trips`, `POST /trips`, `GET /trips/:id`, `PATCH /trips/:id`, `POST /trips/join`
- **참여**: `GET /trips/join-info`(tripId, 여행 비밀번호) → trip 정보, 기존 게스트 목록(displayName 등 식별용). 여행 비밀번호 검증 후 반환. `POST /trips/join` body: tripId, 여행 비밀번호, (회원이면 토큰으로 회원 참여) (게스트면) 기존 게스트 참여 시 `guestId` + `password` / 신규 게스트 시 `displayName`, `password`, `passwordConfirm`, (선택) `colorHex`.
- 멤버: `GET /trips/:tripId/members`, `PATCH /trips/:tripId/members/:memberId`, `DELETE /trips/:tripId/members/:memberId` (owner만)
- 정산 항목: `GET /trips/:tripId/entries`, `POST /trips/:tripId/entries`, `PATCH /trips/:tripId/entries/:id`, `DELETE /trips/:tripId/entries/:id` (soft delete)
- 환전: `GET /trips/:tripId/exchanges`, `POST /trips/:tripId/exchanges`, `PATCH`, `DELETE`
- 정산 결과: `GET /trips/:tripId/settlement` (또는 `/summary`)

모든 `trips/:tripId` 하위 요청: 요청자(회원 또는 게스트)가 해당 trip 멤버인지 검증 필수.

---

## 11. 보안·검증

- 인증: 여행/정산 API는 인증 필수. 게스트는 여행별 토큰 또는 제한된 API로 식별.
- 권한: tripId 포함 요청 시 TripMember 기반 접근 검증(미들웨어 또는 서비스 레이어).
- 입력: 금액·날짜·FK 백엔드에서 Zod 재검증. DB 제약(NOT NULL, CHECK, FK) 병행.
- 여행 비밀번호: 공개 여행은 passwordHash 저장. 참여 시 링크(여행 id)와 함께 입력한 비밀번호로 검증 후 접근 허용.
- 게스트 비밀번호: 저장 시 해시만 저장. 기존 게스트 선택 시 비밀번호 검증 후 해당 guestId로 토큰(또는 세션) 발급.
- 정산 항목: paidBy, beneficiaries가 해당 trip 소속인지 검증.
- 멤버 제거·역할 변경·owner 이전: owner만 허용하도록 API에서 강제.
- rate limiting 적용. 로그에 금액·개인정보 포함 금지.

---

## 12. 배포

| 구분       | 서비스                                     |
| ---------- | ------------------------------------------ |
| 프론트엔드 | Vercel                                     |
| 백엔드·DB  | Railway (단일 PostgreSQL, 단일 API 서비스) |

- 환경 변수: 프론트 `NEXT_PUBLIC_API_URL`, 백엔드 `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
- 마이그레이션: 배포 시 또는 CI에서 실행.

---

## 13. 마일스톤

| 단계 | 범위        | 산출물                                                                                        |
| ---- | ----------- | --------------------------------------------------------------------------------------------- |
| M1   | 기반 구축   | 모노레포(frontend/, backend/), Next.js·백엔드 스켈레톤, DB 스키마 초안, 회원 가입·로그인(JWT) |
| M2   | 여행·멤버   | 여행 CRUD, 참여(링크/코드), TripMember, displayName·colorHex                                  |
| M3   | 정산 항목   | SettlementEntry CRUD, soft delete, 목록/필터/모바일 리스트·수정 UI                            |
| M4   | 환전·정산   | 환전 기록 CRUD, 정산 계산(환율·부족 안내), 정산 결과 화면                                     |
| M5   | 설정·마무리 | 설정(여행 정보·멤버 관리), 게스트 경로, 보안·검증 점검, 배포                                  |

---

## 14. 성공 기준

- 모바일에서 여행 생성·참여, 정산 항목 입력·수정·soft delete가 불편 없이 동작.
- 정산 결과가 "누가 누구에게 얼마"로 표시되고, 환전 기록 없는 결제는 안내됨.
- 미참여 여행 데이터 미노출.
- Vercel·Railway 무료 범위 내 안정 동작.
