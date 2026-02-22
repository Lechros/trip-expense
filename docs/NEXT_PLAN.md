# 다음 진행 작업 계획 (M2 — 여행·멤버)

M1(인증·스키마) 완료 후 **M2: 여행·멤버**를 다음 단계로 진행한다. API 우선으로 백엔드를 구현하고, 프론트는 목업을 API 연동으로 교체한다.

---

## 1. 목표

- 회원이 **여행을 생성**하고, **초대 링크 + 여행 비밀번호**로 다른 사용자(회원/비회원)가 **참여**할 수 있게 한다.
- **내가 속한 여행만** 목록에 노출되고, trip 하위 API는 **해당 trip 멤버만** 접근 가능하게 한다.
- owner만 여행 설정 수정·멤버 내보내기(추후 M5에서 UI까지 연동).

---

## 2. 백엔드 작업 순서

### 2.1 인증·멤버십 공통

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | JWT 인증 미들웨어 | `Authorization: Bearer <accessToken>`에서 userId 추출, 요청에 `req.userId` 등으로 붙임. 없으면 401. |
| 2 | Trip 멤버십 헬퍼 | `requireTripMember(tripId)` — 요청자가 해당 trip의 TripMember(회원 또는 게스트)인지 확인. 아니면 403. owner 전용은 `requireTripOwner(tripId)` 추가. |

### 2.2 여행 API

| 순서 | 작업 | 메서드/경로 | 비고 |
|------|------|-------------|------|
| 3 | 내 여행 목록 | `GET /trips` | 인증 필수. userId로 TripMember 조인해 해당 trip만 반환. |
| 4 | 여행 생성 | `POST /trips` | 인증 필수. body: name, startDate, endDate, countryCode, (선택) description, baseCurrency, additionalCurrency, isPublic, password. 생성 후 TripMember(owner) 자동 생성, displayName은 User email 또는 별도 필드. |
| 5 | 여행 단건 조회 | `GET /trips/:id` | 인증 + 멤버십 검증. 미멤버 403. |
| 6 | 여행 수정 | `PATCH /trips/:id` | owner만. body: name, description, 기간, countryCode, 통화, isPublic, password(설정 시). |

### 2.3 참여 API

| 순서 | 작업 | 메서드/경로 | 비고 |
|------|------|-------------|------|
| 7 | 참여 정보 조회 | `GET /trips/join-info` | query: tripId, password. 여행 비밀번호 검증 후 trip 기본 정보 + 기존 게스트 목록(displayName, id 등 식별용만) 반환. 비인증 호출 가능. |
| 8 | 참여 처리 | `POST /trips/join` | body: tripId, password, (회원) 없음 — JWT로 userId 사용 → TripMember 생성. (게스트) 기존: guestId + password / 신규: displayName, password, passwordConfirm, colorHex?. 비밀번호 해시 저장, TripMember + Guest 생성. 응답에 토큰(게스트용 세션/토큰) 포함 여부는 M5에서 결정 가능. |

### 2.4 멤버 API

| 순서 | 작업 | 메서드/경로 | 비고 |
|------|------|-------------|------|
| 9 | 멤버 목록 | `GET /trips/:tripId/members` | 인증 + 멤버십. TripMember 목록 반환(displayName, colorHex, role 등). |
| 10 | 멤버 수정/내보내기 | `PATCH`, `DELETE /trips/:tripId/members/:memberId` | owner만. PATCH: displayName, colorHex 등. DELETE: 해당 멤버 제거(owner 자신은 제거 불가 또는 owner 이전 후에만). |

### 2.5 스키마·검증

- Trip 생성/수정 시 Zod 스키마로 body 검증 (필수 필드, 기간 순서, isPublic이면 password 필수 등).
- join-info: tripId, password 필수. join: tripId, password + (회원 경로 | 게스트 경로) 분기.
- DB는 이미 Prisma 스키마로 준비됨. 필요 시 `visibility` 필드가 SPEC과 다르면 isPublic으로 매핑 유지.

---

## 3. 프론트엔드 작업 순서

### 3.1 인증·API 기반

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | API 클라이언트 | `fetch` 래퍼 또는 axios. baseURL = `NEXT_PUBLIC_API_URL`. 요청 시 `Authorization: Bearer <accessToken>` 추가. 401 시 refresh 후 재시도 또는 로그인 페이지로. |
| 2 | 인증 상태 | Zustand 또는 Context: accessToken, refreshToken, user(id, email). 로그인/회원가입 성공 시 저장, 로그아웃 시 초기화. refresh 로직(만료 시 POST /auth/refresh). |
| 3 | 라우트 보호 | 로그인 필요 페이지에서는 미인증 시 로그인/회원가입 페이지로 리다이렉트. (이미 있는 `/login`, `/join` 활용.) |

### 3.2 여행 목록·생성

| 순서 | 작업 | 설명 |
|------|------|------|
| 4 | 여행 목록 페이지 | 루트 또는 `/trips`: `GET /trips` 호출, 목록 렌더. 빈 목록이면 "여행 생성" 유도. |
| 5 | 여행 생성 | 버튼/폼 → `POST /trips` → 성공 시 해당 trip 상세(`/trips/[tripId]`)로 이동. |

### 3.3 참여 플로우

| 순서 | 작업 | 설명 |
|------|------|------|
| 6 | 참여 진입 | `/join/[code]` 등에서 tripId 추출. 여행 비밀번호 입력 폼 → `GET /trips/join-info?tripId=...&password=...` 호출. 성공 시 참여 방식 선택(회원/게스트) 화면으로. |
| 7 | 회원 참여 | "회원으로 참여" 선택 시 (이미 로그인되어 있으면) `POST /trips/join` body: tripId, password. JWT는 헤더에. 성공 시 `/trips/[tripId]`로 이동. |
| 8 | 게스트 참여 | 기존 게스트 선택 후 비밀번호 / 신규 게스트는 displayName, password, passwordConfirm 입력 후 `POST /trips/join`. 응답에 게스트 토큰이 있으면 저장 후 trip 페이지로 (M5에서 토큰 방식 확정 가능). |

### 3.4 여행 상세

| 순서 | 작업 | 설명 |
|------|------|------|
| 9 | trip 페이지 데이터 | `/trips/[tripId]`: `GET /trips/:id`로 여행 정보 로드. 멤버인지 검증은 API 403으로 처리. 헤더 "여행 이름" 등 표시. |

---

## 4. 작업 단위 정리 (추천 진행 순서)

1. **백엔드**: 인증 미들웨어 → requireTripMember/requireTripOwner → GET/POST /trips, GET/PATCH /trips/:id → GET /trips/join-info, POST /trips/join (회원 경로 먼저) → GET /trips/:tripId/members → PATCH/DELETE members (owner만).
2. **프론트**: API 클라이언트 + 인증 상태 + 라우트 보호 → 여행 목록 + 생성 → trip 상세 API 연동 → 참여 플로우(join-info → join 회원) → 게스트 참여(필요 시 M5와 같이 진행).

---

## 5. 검증

- **API**: Supertest 등으로 GET/POST /trips (인증 없음 401, 정상 200/201), GET /trips/:id (미멤버 403), join-info (잘못된 비밀번호 4xx), join (회원 성공 시 TripMember 생성 확인).
- **수동**: 로그인 → 여행 생성 → 목록에 노출 → 상세 진입. 다른 계정으로 참여 링크 + 비밀번호 → join → 목록에 해당 여행 노출.

이 계획을 기준으로 M2를 단계별로 구현하면 된다.
