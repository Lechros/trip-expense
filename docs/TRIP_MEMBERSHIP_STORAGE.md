# 여행 참여 정보 저장 방식

로그인된 사용자가 이미 참여한 여행인지 서버에서 어떻게 판단하는지, 참여 정보가 어디에 어떻게 저장되는지 정리합니다.

---

## 1. 저장 구조 (DB)

- **모델**: `TripMember` (Prisma `schema.prisma`)
  - `id`, `tripId`, `userId`(nullable), `guestId`(nullable), `displayName`, `colorHex`, `role`("owner"|"member"), `joinedAt`
  - 회원 참여: `userId`에 값, `guestId`는 null
  - 비회원(게스트) 참여: `guestId`에 값, `userId`는 null
  - `@@unique([tripId, userId, guestId])`, `@@index([tripId])`, `@@index([userId])`

- **회원 참여 시 저장** (`backend/src/routes/trips.ts`):
  - `POST /trips/join` (body: `tripId`, `password`), **JWT 필요** (`request.userId`)
  - 여행 비밀번호 검증 후:
    - `prisma.tripMember.findFirst({ where: { tripId, userId } })` → 이미 있으면 `{ joined: true, memberId, tripId }` 반환
    - 없으면 `prisma.tripMember.create({ data: { tripId, userId, displayName, role: 'member' } })` 로 **한 번만** 생성

- **멤버 여부 조회** (`backend/src/lib/trip-member.ts`):
  - `getTripMemberByUserId(tripId, userId)` → `prisma.tripMember.findFirst({ where: { tripId, userId } })` → 있으면 `{ memberId, role }`, 없으면 null
  - `GET /trips/:id`, `GET /trips/:tripId/members`, entries 등은 모두 `requireAuth` + `requireTripMember` 사용 → 위 함수로 **같은 tripId + userId** 레코드가 있으면 통과

참여 정보는 **TripMember 테이블에 (tripId, userId) 또는 (tripId, guestId)로 잘 저장**되며, 회원은 `userId` 기준으로만 조회합니다.

---

## 2. 왜 “이미 참여한데 비밀번호 창이 나오는가”

- **저장/조회 자체는 정상**입니다. 이미 멤버면 `GET /trips/:id`는 200을 반환합니다.
- 문제가 되는 경우는 **진입 경로**입니다:
  - 사용자가 **초대 링크 `/join/:tripId`** 로 들어온 경우, 현재는 **“이미 참여한 회원인지”를 조회하지 않고** 무조건 “여행 비밀번호 입력” 단계부터 보여줍니다.
  - 따라서 “로그인된 사용자가 이미 포함된 여행임에도 비밀번호를 입력하는 창이 나온다”는 현상이 발생합니다.

---

## 3. 대응 (구현)

- **참여 플로우 첫 단계**에서, **로그인된 사용자**일 때 한 번 **이미 해당 트립 멤버인지** 확인:
  - 클라이언트에서 `GET /trips/:tripId`(credentials 포함) 호출
  - **200**이면 이미 참여 중 → **`/trips/:tripId`로 리다이렉트** (비밀번호 입력 화면을 건너뜀)
  - 401/403이면 비회원 또는 미참여 → 기존처럼 여행 비밀번호 입력 화면 표시

이렇게 하면 참여 정보가 서버에 잘 저장돼 있는 경우, 로그인된 멤버가 `/join/:tripId`로 들어와도 비밀번호 창 없이 곧바로 여행 상세로 이동합니다.
