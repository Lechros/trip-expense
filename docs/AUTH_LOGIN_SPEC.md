# 인증·로그인 명세서

**문서 버전**: 1.0  
**대상**: 여행 비용 정산 앱 — 인증(회원/비회원), 로그인 플로우, 접근 제어 및 상태 관리  
**관련 문서**: `AUTH_PERSIST_STRATEGIES.md`, `GUEST_ACCESS_SOLUTION.md`, `GUEST_MEMBER_PARITY.md`

---

## 1. 용어 정의

| 용어                     | 설명                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **회원**                 | Google OAuth로 로그인한 사용자. `User` 테이블 레코드, JWT(accessToken/refreshToken) 보유.                                                             |
| **비회원(게스트)**       | 트립 비밀번호 + 게스트 비밀번호로 특정 여행에만 참여한 사용자. `Guest` + `TripMember.guestId`. (현재는 트립 페이지 접속 불가 — 별도 명세로 확장 예정) |
| **비인증**               | JWT·게스트 세션 모두 없는 상태.                                                                                                                       |
| **참여 완료**            | 해당 트립의 멤버(회원이면 `TripMember.userId`, 게스트면 `TripMember.guestId`로 식별).                                                                 |
| **redirect(return) URL** | 로그인 완료 후 이동할 경로. 쿼리 파라미터 `redirect`로 전달.                                                                                          |

---

## 2. 목표 동작 요약

- **회원**: Google 로그인 → JWT 쿠키 → `/me` 성공 → 트립 목록/상세 접근. 로그인 후에는 `redirect` 파라미터가 있으면 해당 URL로, 없으면 `/trips`로 이동.
- **비인증이 트립 상세 접근 시**: 로그인으로 보내지 않고 **해당 여행 참여(join) 페이지**로 이동 (`/join/:tripId`). 참여 플로우에서 “로그인하여 참여” 선택 시 로그인 후 다시 join으로 돌아올 수 있도록 **진짜 뒤로가기** 및 **join 단계/비밀번호 유지**.
- **비인증이 트립 목록 접근 시**: 로그인 필요이므로 `/login`으로 이동. 이때 `redirect=/trips` 등 목적지 전달 가능.
- **로그인 페이지 “뒤로”**: 브라우저 history back(이전 URL로). 히스토리 없으면 `/`로.

---

## 3. 유저 플로우

### 3.1 회원 로그인 (Google OAuth)

```
[사용자]                    [프론트]                     [백엔드]                    [Google]
   |                           |                             |                           |
   |  /login 접속               |                             |                           |
   |-------------------------->|                             |                           |
   |  로그인 페이지 렌더         |                             |                           |
   |<--------------------------|                             |                           |
   |  "Google로 로그인" 클릭     |                             |                           |
   |-------------------------->| GET /auth/google            |                           |
   |                           | (선택: ?state=redirect_url) |                           |
   |                           |---------------------------->| 302 redirect to Google   |
   |                           |                             |-------------------------->|
   |  Google 로그인/동의         |                             |                           |
   |<----------------------------------------------------------------------------------------|
   |  redirect to /api/auth/google/callback?code=...         |                           |
   |-------------------------->|---------------------------->| code로 토큰 교환          |
   |                           |                             | User 조회/생성            |
   |                           |                             | Set-Cookie(access,refresh)|
   |                           |                             | 302 → /auth/callback     |
   |  /auth/callback            |                             |                           |
   |<--------------------------|                             |                           |
   |  checkAuth() GET /me       |                             |                           |
   |-------------------------->|---------------------------->| 200 { user }             |
   |  redirect: 있으면 해당 URL, 없으면 /trips                 |                           |
   |  router.replace(redirect ?? "/trips")                    |                           |
   |<--------------------------|                             |                           |
```

- **로그인 시작 시**: `GET /auth/google` 호출. 필요 시 `state`에 `redirect` URL 인코딩하여 전달 가능(백엔드가 callback 시 state 그대로 돌려줌).
- **로그인 완료 후**: 백엔드는 `302 → {FRONTEND_URL}/auth/callback` (에러 시 `?error=...`). 프론트 `/auth/callback`에서 `checkAuth()` 후 **`redirect` 쿼리 또는 state 복원값이 있으면 해당 URL로, 없으면 `/trips`로** 이동.

### 3.2 비인증 접근 — 트립 상세 vs 목록

```
경로                    조건                    동작
─────────────────────────────────────────────────────────────────
/trips                 GET /trips 401          redirect("/login")  (목록은 “내 여행”이므로 로그인 필요)
/trips/:tripId         GET /trips/:id 401/403  redirect("/join/:tripId")  (참여하지 않았으면 참여 플로우로)
/login                 -                       로그인 페이지. "뒤로" 시 router.back() 또는 /
/join/:tripId          -                       참여 플로우. (인증 불필요)
```

- **Layout**: `/trips` 하위 모든 요청에서 `GET /me` 호출하지만, **실패 시 리다이렉트하지 않음**. 목록/상세 각각에서 위 규칙으로 리다이렉트.

### 3.2.1 참여 플로우 — 단계 구조

1. **여행 페이지 접속** (`/join/:tripId`)
2. **2-1. 로그인 상태** → **여행에 참가할지 확인** (단계 `member`): 여행 비밀번호 입력 + "참가하기" 버튼.
3. **2-2. 비로그인 상태** → **참여 방식 선택** (단계 `choice`): "로그인하여 참가" | "비회원으로 참가"
   - **2-2-1. 로그인 클릭** → `/login?redirect=/join/:tripId` → 로그인 후 복귀 시 **2-1** (`member`)로 이동.
   - **2-2-2. 비회원으로 참가 클릭** → 단계 `guest-trip-password`: 여행 비밀번호 입력.
   - **2-2-3. 여행 비밀번호 검증 후** → 단계 `guest-list`: 비회원 목록에서 선택 또는 새로 생성 → 기존 선택 시 `guest-password`, 새로 생성 시 `guest-new`.

- **단계를 URL에 반영**: `?step=choice|member|guest-trip-password|guest-list|guest-password|guest-new`. 보안상 민감 정보 없음, 뒤로가기·공유 시 단계 복원용.
- **저장**: sessionStorage `join-flow:{tripId}` 에 step, tripPassword, joinInfo, selectedGuestId 유지.

### 3.3 참여(join) 플로우에서 로그인 취소 시

```
[참여 플로우 /join/:tripId]
   |  단계 choice 또는 member 등
   |  "로그인하여 참가" 클릭 → Link href="/login?redirect=/join/:tripId"
   |  → join 상태는 sessionStorage에 이미 저장됨
   |
   |  /login 도착 후 "뒤로" 클릭 → router.back() → /join/:tripId 복귀
   |  → sessionStorage에서 step, tripPassword, joinInfo, selectedGuestId 복원
   |  → 로그인 완료 후 redirect로 돌아오면 단계 member로 표시
```

- **저장 키**: `join-flow:{tripId}` (sessionStorage).
- **저장 필드**: `step`, `tripPassword`, `joinInfo`, `selectedGuestId`. (게스트 비밀번호 등 민감 입력은 저장하지 않음.)
- **삭제 시점**: 참여 성공(회원/게스트) 후 해당 `tripId`용 저장 삭제.

### 3.4 로그인 페이지 “뒤로”

- **동작**: `window.history.length > 1` 이면 `router.back()`, 아니면 `router.push("/")`.
- **목적**: join 등 이전 페이지로 돌아갈 때 진짜 back으로, join 상태는 sessionStorage로 유지.

---

## 4. 백엔드 동작

### 4.1 인증 관련 API

| 메서드/경로               | 인증                        | 설명                                                                                                                                      |
| ------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| GET /auth/google          | 불필요                      | Google 로그인 시작. `state` 쿼리 그대로 전달 가능. redirect URI: `{FRONTEND}/api/auth/google/callback`.                                   |
| GET /auth/google/callback | 불필요                      | code 수신 → User 조회/생성 → JWT 발급 → Set-Cookie(accessToken, refreshToken) → 302 to `{FRONTEND}/auth/callback` (에러 시 `?error=...`). |
| POST /auth/refresh        | 쿠키 또는 body refreshToken | 새 access/refresh 발급, 쿠키로 설정.                                                                                                      |
| POST /auth/logout         | 불필요                      | access/refresh 쿠키 삭제.                                                                                                                 |
| GET /me                   | JWT(requireAuth)            | 200 { user: { id, email, ... } }. 401: 토큰 없음/만료/유효하지 않음.                                                                      |

- **토큰 추출 순서**: 쿠키 `accessToken` 우선, 없으면 `Authorization: Bearer <token>`.
- **requireAuth**: JWT 검증 후 `request.userId` 설정. 실패 시 401.

### 4.2 트립 접근

| 메서드/경로                | 인증                                     | 설명                                                                         |
| -------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| GET /trips                 | JWT                                      | 내 여행 목록. 401 시 로그인 필요.                                            |
| GET /trips/:id             | JWT + requireTripMember                  | 해당 트립 상세. 멤버가 아니면 403.                                           |
| GET /trips/:tripId/members | JWT + requireTripMember                  | 멤버 목록.                                                                   |
| GET /trips/:tripId/entries | JWT + requireTripMember                  | 지출 목록.                                                                   |
| POST /trips/join           | 트립/게스트 비밀번호 또는 JWT(회원 참여) | 참여 처리. 게스트 성공 시 현재는 쿠키 미발급(게스트 접속 확장 시 명세 반영). |

- **requireTripMember**: `getTripMemberByUserId(tripId, request.userId)`로 멤버 여부 확인. 실패 시 403.

---

## 5. 프론트엔드 상태 관리

### 5.1 전역(클라이언트) — auth store (Zustand)

| 상태     | 타입                                    | 설명                                        |
| -------- | --------------------------------------- | ------------------------------------------- |
| user     | `{ id: string; email: string } \| null` | GET /me 성공 시 설정. 로그인된 회원만 해당. |
| checking | boolean                                 | GET /me 호출 중(가드 등에서 사용).          |

| 액션          | 설명                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| setUser(user) | user 설정.                                                               |
| checkAuth()   | GET /me(credentials: include). 성공 시 user 설정 후 true, 실패 시 false. |
| logout()      | POST /auth/logout 호출 후 user = null.                                   |

- **용도**: 헤더 등에서 “로그인된 사용자” 표시, AuthGuard(사용 시)에서 인증 여부 판단. **비회원(게스트)은 현재 이 스토어에 없음.**

### 5.2 서버에서의 “인증” 판단

- **TripsLayout**: 매 요청 시 `cookies()`로 GET /me 호출. **응답 코드로 리다이렉트하지 않음.** (자식 페이지에서 401/403 시 각각 /login, /join/:tripId로 리다이렉트.)
- **Trips 목록 페이지**: GET /trips 호출. `!res.ok` 이면 `redirect("/login")`. (추가 시 `redirect` 쿼리 전달 가능.)
- **Trips 상세 페이지**: GET /trips/:id 등 prefetch. `!tripData?.trip` 이면 `redirect("/join/:tripId")`.

### 5.3 참여 플로우 — sessionStorage

| 키                 | 값                                                          | 비고                                                             |
| ------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| join-flow:{tripId} | `{ tripId, step, tripPassword, joinInfo, selectedGuestId }` | 탭 단위. 로그인 갔다 와도 단계·비밀번호 유지. 참여 성공 시 삭제. |

- **복원**: JoinFlow 마운트 시 동일 tripId면 위 필드 복원.
- **저장**: step / tripPassword / joinInfo / selectedGuestId 변경 시 저장(hydrated 이후).

### 5.4 로그인 후 이동(redirect) — 목표

- **진입**: `/login?redirect=/join/xxx` 또는 `/login?redirect=/trips` 등.
- **OAuth 후**: 백엔드가 `/auth/callback`으로 리다이렉트. **현재 구현**: 콜백 페이지에서 `router.replace("/trips")` 고정. **목표**: `redirect` 쿼리(또는 state에서 복원)가 있으면 해당 URL로, 없으면 `/trips`로.
- **검증**: redirect 값은 같은 오리진, path만 허용(예: `/join/...`, `/trips`, `/trips/...`). 외부 URL은 사용하지 않음.

---

## 6. 화면·라우트별 동작 정리

| 라우트         | 비인증 시                                       | 회원(인증됨) 시                              | 비고                               |
| -------------- | ----------------------------------------------- | -------------------------------------------- | ---------------------------------- |
| /              | 랜딩                                            | 랜딩 또는 /trips 링크                        | -                                  |
| /login         | 로그인 페이지. "뒤로" = history back 또는 /     | -                                            | redirect 쿼리 전달 가능.           |
| /auth/callback | -                                               | checkAuth 후 redirect URL 또는 /trips로 이동 | 에러 시 에러 메시지 + 로그인 링크. |
| /trips         | GET /trips 401 → redirect("/login")             | 목록 표시                                    | -                                  |
| /trips/:tripId | GET /trips/:id 실패 → redirect("/join/:tripId") | 상세 표시                                    | -                                  |
| /join/:tripId  | 참여 플로우. 상태 sessionStorage 유지. 비로그인 시 첫 단계에서 비밀번호 입력 또는 로그인 옵션 | 참여 플로우(회원이면 “회원으로 참여” 가능)   | -                                  |

---

## 7. 에러·예외 처리

| 상황                 | 백엔드 | 프론트                                                                                                         |
| -------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| JWT 없음/만료        | 401    | GET /me 실패 → layout은 리다이렉트 안 함. 목록/상세에서 각각 /login 또는 /join/:tripId.                        |
| refresh 실패         | 401    | apiFetch 등에서 로그아웃 후 /login 이동(현재 window.location.href="/login", 추후 redirect 파라미터 전달 권장). |
| OAuth callback error | -      | /auth/callback?error=... → 메시지 표시, "로그인으로 돌아가기" 링크.                                            |
| 트립 멤버 아님       | 403    | GET /trips/:id 등 실패 → trip 데이터 없음 → redirect("/join/:tripId").                                         |

---

## 8. 구현 체크리스트(목표 대비)

- [x] 트립 상세 참여 안 됐을 때 /login이 아닌 /join/:tripId로 이동
- [x] 트립 목록은 비인증 시 /login으로 이동
- [x] 로그인 페이지 "뒤로" = router.back() (히스토리 없으면 /)
- [x] Join 플로우 상태 sessionStorage 저장/복원, 참여 성공 시 삭제
- [x] Join에서 "로그인하여 참여" 시 `/login?redirect=/join/:tripId` 링크
- [x] **여행 비밀번호 단계(첫 화면)**: 비로그인 시 "비밀번호 입력" + "로그인" 옵션 표시, 로그인된 경우 로그인 옵션 미표시
- [x] **로그인 완료 후 redirect 파라미터 반영**: /auth/callback에서 `state` 쿼리(백엔드가 OAuth state 전달) 읽어 유효한 path면 해당 URL로, 아니면 /trips로 이동
- [x] GET /auth/google 호출 시 state에 redirect 넣어 callback에서 복원 (로그인 폼에서 redirect 쿼리 읽어 ?state= 로 전달)
- [x] 비회원(게스트) 트립 접속: `GUEST_ACCESS_SOLUTION.md` 적용 완료(guest_session, requireAuthOrGuest, 프론트 guest 상태·기본 결제자)

---

## 9. 참조

- **인증 전략(토큰 보관, SSR)**: `AUTH_PERSIST_STRATEGIES.md`
- **비회원 트립 접속 불가 해결안**: `GUEST_ACCESS_SOLUTION.md`
- **비회원 = 로그인된 멤버 대비 현황**: `GUEST_MEMBER_PARITY.md`
