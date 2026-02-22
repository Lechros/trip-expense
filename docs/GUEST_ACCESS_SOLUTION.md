# 비회원(게스트) 여행 접속 불가 문제 — 해결 방안 보고

## 1. 문제

- 게스트가 참여(POST /trips/join) 후 `router.push(\`/trips/${tripId}\`)` 로 이동.
- **TripsLayout**이 서버에서 GET /me 호출 → 게스트는 JWT 없음 → 401 → **즉시 `/login` 리다이렉트**.
- 따라서 비회원은 여행 페이지에 접속할 방법이 없음.

---

## 2. 원인 정리

| 구간   | 동작                                                                          |
| ------ | ----------------------------------------------------------------------------- |
| Layout | `cookies()` → GET /me(BACKEND, Cookie 전달) → !res.ok 이면 redirect("/login") |
| /me    | requireAuth → JWT만 검사, 쿠키에 accessToken 없으면 401                       |
| 조인   | POST /trips/join(게스트) 성공 시 **쿠키/토큰 미발급**, JSON만 반환            |

결론: **게스트용 세션(쿠키)이 없고**, layout은 “/me 성공 = 인증됨”으로만 보므로 게스트는 항상 로그인 페이지로 튕김.

---

## 3. 해결 방향: 게스트 전용 쿠키 + /me·인증 확장

**선택한 방식**: 게스트 로그인 시 **전용 쿠키**를 발급하고, **GET /me**와 **requireAuth/requireTripMember**를 “회원 또는 게스트” 둘 다 인정하도록 확장.  
URL 구조는 그대로 `/trips`, `/trips/:tripId` 사용.

이유:

- 게스트도 회원과 같은 화면/경로를 쓰는 것이 UX·코드 일관성에 유리함.
- 이미 `/api` rewrite로 same-origin 호출을 쓰므로, 백엔드가 Set-Cookie 하면 브라우저에 저장되고 layout/API 호출 시 쿠키가 전달됨.

---

## 4. 적용 방안 (간결)

### 4.1 백엔드

1. **게스트 세션 쿠키**
   - 쿠키 이름: 예) `guest_session`.
   - 값: 서명된 payload `{ tripId, guestId, memberId, exp }` (JWT 또는 HMAC+JSON). 만료 예: 7일.
   - POST /trips/join (게스트) **성공 시** 응답에 `Set-Cookie: guest_session=...` (httpOnly, Path=/, SameSite=Lax, 필요 시 Secure) 추가.
   - 별도 시크릿 사용 권장 (예: `GUEST_SESSION_SECRET`), 없으면 `JWT_SECRET` 재사용.

2. **GET /me 확장**
   - 우선 기존: accessToken 쿠키 있으면 JWT 검증 → `{ user }` 반환 (기존과 동일).
   - accessToken 없으면: `guest_session` 쿠키 읽어 서명 검증 및 exp 확인.
     - 유효하면 DB에서 해당 TripMember 존재·활성 여부 확인 후  
       `200 { guest: { guestId, tripId, memberId } }` 반환.
     - 없거나 무효면 401.

3. **requireAuth 확장**
   - JWT 있으면: 기존처럼 `request.userId` 설정.
   - JWT 없고 guest_session 유효하면: `request.guestId`, `request.tripId`, `request.tripMemberId` (및 필요 시 `request.isGuest = true`) 설정.
   - 둘 다 없거나 무효면 401.

4. **requireTripMember 확장**
   - `request.userId` 있으면: 기존처럼 `getTripMemberByUserId(tripId, userId)`.
   - `request.guestId` 있으면: **getTripMemberByGuestId(tripId, guestId)** 추가 구현 후 사용.  
     단, **요청의 params.tripId와 request.tripId 일치**할 때만 통과 (다른 트립 접근 차단).
   - 일치하는 멤버 없으면 403.

5. **getTripMemberByGuestId**
   - `trip-member.ts`에 추가: (tripId, guestId)로 TripMember 조회, 있으면 `{ memberId, role }` 반환.

6. **로그아웃(선택)**
   - POST /auth/logout 시 `guest_session` 쿠키도 제거.

### 4.2 프론트엔드

1. **TripsLayout**
   - GET /me 호출 유지.
   - **res.ok 이면** (200):
     - body.user 있으면: 기존처럼 회원으로 렌더.
     - body.guest 있으면: 게스트로 렌더. (선택) pathname이 `/trips`만(리스트)이면 `redirect(\`/trips/${guest.tripId}\`)` 로 “참여한 그 트립만” 보게 할 수 있음.
   - **!res.ok (401)** 일 때만 `redirect("/login")`.

2. **조인 후 이동**
   - 현재처럼 `router.push(\`/trips/${tripId}\`)`유지.  
이번 요청부터 브라우저가`guest_session` 쿠키를 보내므로 layout의 /me가 200(guest)으로 통과.

3. **API 호출**
   - 기존대로 `credentials: "include"`.  
     게스트일 때도 `guest_session`이 백엔드로 전달되어 requireAuth(확장) → requireTripMember(확장) 통과.

4. **auth store / 기본 결제자 (선택, GUEST_MEMBER_PARITY 연장)**
   - GET /me가 guest일 때 `memberId`를 내려주므로, 프론트에서 “현재 멤버 ID”를 저장해 두고 지출 추가 시 기본 결제자로 사용 가능.

### 4.3 쿠키 전제

- 조인 요청이 **same-origin**이어야 Set-Cookie가 브라우저에 저장됨.  
  현재: join-flow에서 `NEXT_PUBLIC_API_URL ?? "/api"` 사용, next.config에 `/api` → backend rewrite 있음 → **동일 오리진으로 처리 가능**.  
  배포 시에도 프론트와 백엔드가 같은 사이트(또는 proxy)로 서빙되면 동일하게 동작.

---

## 5. 구현 순서 제안

1. 백엔드: guest_session 서명/검증 유틸 + POST /trips/join(게스트)에서 Set-Cookie.
2. 백엔드: GET /me 게스트 분기, requireAuth 확장, getTripMemberByGuestId + requireTripMember 확장.
3. 프론트: TripsLayout에서 /me 200 + body.guest 허용, 401일 때만 redirect("/login").
4. (선택) 게스트 로그아웃 시 guest_session 제거, 프론트 “현재 멤버”로 기본 결제자 반영.

이 순서로 적용하면 비회원도 로그인 페이지로 넘어가지 않고 해당 여행에 접속할 수 있음.

---

## 6. 구현 완료 사항 (동기화됨)

- **백엔드**: `guest_session` 쿠키 발급(POST /trips/join 게스트 성공 시), `signGuestSessionToken`/`verifyGuestSessionToken`, `requireAuthOrGuest`, GET /me 게스트 분기, `getTripMemberByGuestId`·`requireTripMember` 게스트 지원, GET /trips·GET /trips/:id·entries 라우트 `requireAuthOrGuest`, POST /auth/logout 시 `guest_session` 삭제, 지출 생성 시 `recordedByGuestId` 반영.
- **프론트**: auth store `guest: GuestSession | null` 및 checkAuth 시 `user`/`guest` 분기, 로그아웃 시 guest 초기화, tab-expenses 기본 결제자 `guestForTrip?.memberId` 반영.
