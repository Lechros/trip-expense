# 프로젝트 생성 명령어 (sandbox 외부 실행)

SPEC 기준 모노레포(frontend + backend) 프로젝트를 생성하기 위해 **사용자 터미널(sandbox 외부)**에서 실행할 명령어 목록이다.  
네트워크 접근·pnpm 실행이 필요하므로 샌드박스가 아닌 로컬 환경에서 순서대로 실행한다.

**Context7**: 라이브러리별 상세 설정·API 문서가 필요하면 Cursor에서 Context7 MCP를 사용해 "Next.js 설치", "Fastify TypeScript", "Prisma init", "shadcn/ui init" 등으로 문서를 조회하면 된다.

---

## 사전 요구사항

- **Node.js** 18.x 이상 (권장 20.x)
- **pnpm** 8+

---

## 1. 루트(모노레포) 준비

프로젝트 루트가 이미 `trip-expense`라면, 해당 디렉터리에서 실행.

```bash
cd d:\source\web\trip-expense
```

모노레포로 관리할 경우 루트에 `package.json` workspaces 설정. (이미 다른 구조라면 2·3만 진행.)

```bash
pnpm init
```

루트 `package.json`에 workspaces 추가(수동 편집):

```json
{
  "name": "trip-expense",
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "workspaces": ["frontend", "backend"]
}
```

---

## 2. 프론트엔드(Next.js) 생성

Next.js 14+ (App Router), TypeScript, Tailwind, ESLint, `src/` 디렉터리 사용.  
**한 번에 비대화형으로 생성:**

```bash
pnpm create next-app@latest frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --yes
```

또는 **대화형**(프롬프트에서 선택):

```bash
pnpm create next-app@latest frontend
```

- 프로젝트 이름: `frontend` (또는 원하는 이름)
- TypeScript: Yes  
- ESLint: Yes  
- Tailwind CSS: Yes  
- `src/` directory: Yes  
- App Router: Yes  
- import alias: `@/*` (기본값)

생성 후 추가 패키지(Zustand, TanStack Query, Zod, React Hook Form, shadcn 의존성):

```bash
cd frontend
pnpm add zustand @tanstack/react-query zod react-hook-form @hookform/resolvers
pnpm add -D @types/node
```

shadcn/ui 초기화(대화형):

```bash
pnpm dlx shadcn@latest init
```

- style: Default 또는 원하는 스타일  
- base color: Slate 등  
- CSS variables: Yes  
- Tailwind config 경로·components 경로는 기본값 권장

필요 시 컴포넌트 추가:

```bash
pnpm dlx shadcn@latest add button card input label
```

다시 루트로:

```bash
cd ..
```

---

## 3. 백엔드(Fastify + Prisma) 생성

```bash
mkdir backend
cd backend
pnpm init
```

Fastify·CORS·Prisma·JWT·Zod·bcrypt(비밀번호 해시)·개발 도구:

```bash
pnpm add fastify @fastify/cors @prisma/client zod jsonwebtoken bcrypt
pnpm add -D typescript @types/node @types/jsonwebtoken @types/bcrypt tsx prisma
```

TypeScript 초기화:

```bash
pnpm exec tsc --init
```

Prisma 초기화:

```bash
pnpm exec prisma init
```

`package.json`에 스크립트 추가(수동 편집 예시):

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

루트로 복귀:

```bash
cd ..
```

---

## 4. 환경 변수·설정 요약

- **frontend**: `.env.local`에 `NEXT_PUBLIC_API_URL=http://localhost:3001` (백엔드 주소)
- **backend**: `.env`에 `DATABASE_URL="..."`, `JWT_SECRET="..."`, `CORS_ORIGIN="http://localhost:3000"` (프론트 주소)
- PostgreSQL은 로컬 설치 또는 Docker·Railway 등에서 준비 후 `DATABASE_URL` 연결

---

## 5. 실행 순서(로컬 개발)

1. 백엔드: `cd backend && pnpm run dev` (예: 포트 3001)
2. 프론트: `cd frontend && pnpm run dev` (예: 포트 3000)

---

## 참고: Context7로 확인할 수 있는 내용

- **Next.js**: [create-next-app 옵션](https://nextjs.org/docs/app/api-reference/cli/create-next-app), App Router 라우팅
- **Fastify**: TypeScript 설정, 플러그인(@fastify/cors 등)
- **Prisma**: schema 작성, migrate, generate
- **shadcn/ui**: `pnpm dlx shadcn@latest init` 옵션, 컴포넌트 추가

위 명령어 실행 후, 실제 스키마·라우트·인증 구현은 SPEC과 이 레포의 코드를 기준으로 진행하면 된다.
