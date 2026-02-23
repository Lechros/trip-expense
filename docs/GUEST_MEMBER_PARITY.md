# 비회원(게스트) = 로그인된 멤버 대비 현황

비회원도 "구글 로그인이 아닐 뿐, 동일하게 로그인된 멤버"로 다루는지, 그에 대한 대비가 되어 있는지 정리합니다.

---

## 1. 정책

- **회원**: Google OAuth 로그인 → `User` + `TripMember.userId`로 트립 멤버 식별.
- **비회원(게스트)**: 트립 비밀번호 + 게스트 비밀번호(또는 신규 생성)로 참여 → `Guest` + `TripMember.guestId`로 트립 멤버 식별.
- **목표**: 두 경우 모두 "현재 로그인된 멤버"로 동일하게 취급(예: 지출 추가 시 기본 결제자 = 현재 멤버).

---

## 2. 현재 구현 상태

### 백엔드

| 항목 | 회원(Google) | 비회원(게스트) |
|------|----------------|-----------------|
| 인증 | JWT → `requireAuth` → `request.userId` | **없음** (POST /trips/join은 쿠키/토큰 미발급) |
| 트립 멤버 검증 | `requireTripMember` → `getTripMemberByUserId(tripId, userId)` | **미지원** (`getTripMemberByGuestId` 없음) |
| 데이터 | `TripMember.userId` / Entry `paidByUserId` 등 | `TripMember.guestId` / Entry `paidByGuestId` 등 **구조상 지원** |

- GET /trips/:tripId/members 응답에 `userId`, `guestId` 포함 → 프론트에서 회원/게스트 구분 가능.
- 지출 CRUD는 `memberId` → 내부적으로 `userId`/`guestId` 변환하여 처리하므로, **API 스키마는 게스트 대비됨**.

### 프론트엔드

| 항목 | 회원(Google) | 비회원(게스트) |
|------|----------------|-----------------|
| 인증 상태 | `useAuthStore.user` (id, email) | **없음** (게스트용 전역 상태/세션 없음) |
| /trips 접근 | GET /me 성공 → layout 통과 | GET /me 실패 → **/login 리다이렉트** (게스트는 트립 페이지 접근 불가) |
| 기본 결제자 | `members.find(m => m.userId === currentUserId)?.id` | **미반영** (currentUserId만 사용 → 게스트는 항상 `members[0]` 등 fallback) |

- 조인 후 `router.push(\`/trips/${tripId}\`)` 하더라도, **trips layout**이 `/me`로 인증 확인하므로 게스트(쿠키 없음)는 로그인 페이지로 튕김.

---

## 3. 결론

- **회원(Google)**: "로그인된 멤버"로 대비됨 — 인증, 트립 멤버 검증, 기본 결제자 모두 해당 멤버 기준으로 동작.
- **비회원(게스트)**:
  - **데이터/API**: 멤버·지출에 `guestId`로 저장/조회되므로 **도메인 상으로는** 동일 멤버로 취급 가능.
  - **인증·접근·UX**: 게스트 세션 및 "현재 멤버" 식별이 없어, **동일하게 로그인된 멤버로 대비되어 있지 않음**.
    - 트립 페이지 접근 불가( layout → /me 실패 → /login).
    - 트립 페이지에 들어온다 해도, 기본 결제자 = "현재 멤버"가 게스트일 때 반영할 방법이 없음.

---

## 4. 비회원까지 동일 대비를 위한 제안

1. **백엔드 — 게스트 세션**
   - POST /trips/join (게스트) 성공 시, 해당 트립 전용 **게스트 세션** 발급 (예: 서명된 쿠키 `guest_session={tripId}:{guestId}:signature` 또는 단기 JWT에 `guestId`, `tripId` 포함).
   - `requireAuth`: JWT에 `userId` 없고 `guestId`+`tripId` 있으면 게스트 인증으로 통과, `request.guestId`, `request.tripId` 설정.
   - `requireTripMember`: `userId`로 멤버 조회 실패 시 `guestId`+`tripId`로 `getTripMemberByGuestId` 조회하여 통과 처리.

2. **백엔드 — GET /me 확장(선택)**
   - 게스트 쿠키가 있으면 `{ type: 'guest', guestId, tripId, memberId }` 등 반환하여, 프론트에서 "현재 멤버" 식별 가능하게 함.

3. **프론트 — trips 접근**
   - layout에서 `/me` 실패 시, 곧바로 /login 보내지 말고 (선택) 해당 요청이 트립 페이지인 경우 **게스트 쿠키**로 재시도하거나, 트립 페이지만 게스트 허용 경로로 두고 게스트 세션으로 prefetch 등 처리.

4. **프론트 — 기본 결제자**
   - "현재 멤버 ID"를 한 곳에서 관리: 회원은 `useAuthStore.user.id` → `members.find(m => m.userId === id)?.id`, 게스트는 `/me` 또는 전역 상태의 `currentMemberId`(또는 `guestId`로 멤버 조회).
   - `defaultPaidByMemberId = currentMemberId ?? members.find(m => m.userId === currentUserId)?.id ?? members[0]?.id` 형태로 통일.

5. **문서/주석**
   - "비회원도 동일하게 로그인된 멤버" 정책과, 위 확장 후 회원/게스트 모두 기본 결제자 등에서 동일하게 동작함을 코드/문서에 명시.

이 문서는 위 확장이 반영되기 전 **현재 상태**를 기준으로 작성되었습니다.
