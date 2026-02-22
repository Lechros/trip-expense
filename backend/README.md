# Trip Expense — Backend API

Fastify + Prisma + PostgreSQL. 인증(JWT), 여행·정산·환전 API 제공.

## 요구 사항

- Node.js 20+
- pnpm
- PostgreSQL (로컬 또는 Railway 등)

Prisma 7에서는 런타임 DB 연결을 위해 **Driver Adapter**(`@prisma/adapter-pg` + `pg`)를 사용합니다. `package.json`에 이미 포함되어 있습니다.

## 설정

1. `.env.example`을 복사해 `.env` 생성 후 값 입력.
2. `DATABASE_URL`에 PostgreSQL 연결 문자열 설정.
3. `pnpm install`
4. Prisma 클라이언트 생성: `pnpm db:generate`
5. (최초 1회) DB 마이그레이션: `pnpm db:migrate`  
   - 로컬에서 실행 시 `DATABASE_URL`이 접근 가능한 Postgres여야 함 (Railway 내부 호스트는 로컬에서 접근 불가).

## 실행

- 개발: `pnpm run dev` (기본 포트 3001)
- 빌드: `pnpm run build`
- 프로덕션: `pnpm start`

## API (인증)

- `GET /health` — 헬스 체크
- `GET /auth/google` — Google 로그인 시작 (리다이렉트)
- `GET /auth/google/callback` — Google OAuth 콜백, JWT 발급 후 프론트 리다이렉트
- `POST /auth/refresh` — 토큰 갱신 (body: `refreshToken`)
- `GET /me` — 현재 사용자 (Header: `Authorization: Bearer <accessToken>`)
- `PATCH /me` — 프로필 수정 (추후 확장)

## 스키마

`prisma/schema.prisma` — User, Guest, Trip, TripMember, SettlementEntry, SettlementBeneficiary, ExchangeRecord.  
상세는 루트 `docs/SPEC.md` §9 참고.
