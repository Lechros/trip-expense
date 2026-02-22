# 인증 상태 Persist 전략 — JWT 백엔드 + Next.js

JWT를 쓰는 **별도 백엔드**가 있을 때, 클라이언트에서 토큰을 어디에 두고 어떻게 쓰는지에 따른 전략과, **Next.js SSR**·**보안** 관점 비교.

---

## 1. 전략 요약

| 전략                         | 토큰 보관 위치                     | SSR에서 인증 인식 | XSS  | CSRF      | 구현 난이도                |
| ---------------------------- | ---------------------------------- | ----------------- | ---- | --------- | -------------------------- |
| **A. localStorage + Bearer** | localStorage                       | ❌ 불가           | 취약 | 안전      | 낮음                       |
| **B. httpOnly Cookie**       | Cookie (백엔드 Set-Cookie)         | ✅ 가능           | 안전 | 대응 필요 | 높음                       |
| **C. 메모리만**              | React state/Zustand (persist 없음) | ❌ 불가           | 안전 | 안전      | 낮음, 새로고침 시 로그아웃 |

---

## 2. 전략 A: localStorage + Bearer (현재 방식)

### 동작

- 로그인/콜백에서 백엔드가 JWT를 **응답 body 또는 URL fragment**로 주면, 프론트가 `localStorage`에 저장.
- API 요청 시 `Authorization: Bearer <accessToken>` 헤더에 붙여서 별도 백엔드로 전송.

### Next.js SSR

- **서버에는 localStorage가 없음.**  
  따라서:
  - 서버 렌더 시점에는 “로그인 여부”를 알 수 없음.
  - 인증이 필요한 페이지는 **클라이언트에서만** 판단 가능 → `AuthGuard` 같은 클라이언트 컴포넌트에서 `accessToken` 확인 후 리다이렉트.
  - “로그인된 사용자만 보는 내용”을 **서버에서 미리 채워서** 렌더하는 것은 불가. (데이터는 클라이언트에서 fetch 후 표시.)

### 보안

- **XSS**: `localStorage`는 JS로 읽을 수 있으므로, 스크립트 삽입 시 토큰 탈취 가능.  
  → XSS 방지(이스케이프, CSP, 신뢰 라이브러리 사용)가 중요.
- **CSRF**: 매 요청에 토큰을 **헤더**로 넣기 때문에, “다른 사이트에서 우리 도메인으로 폼 제출”만으로는 토큰이 전달되지 않음.  
  → CSRF에 비교적 안전.

### Persist 타이밍 (현재 수정 사항)

- Zustand `persist`는 **비동기 rehydration**.
- rehydration 전에 `accessToken`을 읽으면 아직 복원 전이라 `null` → 로그인 페이지로 보내버리는 문제가 있음.
- **대응**: `_hydrated` 플래그를 두고, `onRehydrateStorage` 콜백에서 복원이 끝난 뒤에만 `_hydrated = true`로 두고, **이후에만** “토큰 없음 → 로그인으로 리다이렉트” 하도록 함.  
  → 새로고침/재접속 후에도 로그인 상태가 유지됨.

---

## 3. 전략 B: httpOnly Cookie

### 동작

- 로그인/콜백을 **백엔드가 처리**하고, 응답에 `Set-Cookie` (access/refresh 토큰, `HttpOnly`, `Secure`, `SameSite`)로 설정.
- 브라우저가 이후 같은 도메인(또는 CORS 설정에 맞는 도메인) 요청에 **자동으로** 쿠키를 붙여 줌.
- 프론트는 **토큰을 직접 읽거나 저장하지 않음.**

### Next.js SSR

- **서버에서 쿠키를 읽을 수 있음** (같은 도메인일 때).
  - Next.js API Route / Server Component / Server Action에서 `cookies()`로 접근.
  - “이 사용자 로그인됨” 여부를 서버에서 판단하고, **인증된 사용자용 데이터를 서버에서 fetch**한 뒤 HTML에 넣어서 보낼 수 있음 (진짜 SSR).
- 단, **토큰을 가진 건 백엔드(API 서버)**가 아니라 Next 서버이므로, Next 서버가 “프록시”처럼 백엔드 API를 호출할 때 **쿠키를 그대로 전달**하거나, **세션/백엔드 세션**을 Next와 API 서버가 공유하는 구조가 필요함.  
  → 아키텍처가 “프론트 → Next → API”일 때, API가 쿠키를 받도록 하거나, Next가 세션을 관리하고 API는 Next가 넘긴 토큰/세션 ID를 받는 식으로 설계해야 함.

### 보안

- **XSS**: `HttpOnly`이면 JS에서 쿠키에 접근 불가 → 토큰 탈취 어렵다.
- **CSRF**: 쿠키는 요청에 자동으로 붙기 때문에, 악성 사이트에서 우리 사이트로 요청을 유도하면 쿠키가 같이 전송될 수 있음.  
  → **CSRF 토큰**, **SameSite=Strict/Lax**, **Double Submit Cookie** 등으로 보완 필요.

---

## 4. 전략 C: 메모리만 (persist 없음)

### 동작

- 로그인 후 토큰을 **메모리(React state / Zustand 비-persist)**에만 둠.
- 새로고침/탭 닫기 시 상태 소실 → 다시 로그인.

### Next.js SSR / 보안

- SSR: A와 동일하게 서버는 토큰을 모름.
- XSS: 탭 내 메모리는 탈취 가능하지만, 디스크에 남지 않음.
- CSRF: A와 동일하게 헤더 기반이면 상대적으로 안전.

---

## 5. 현재 구조 정리

- **저장**: 백엔드가 JWT를 httpOnly 쿠키로 설정.  
  → **전략 B** (현재 적용됨).
- **SSR**: API를 Next와 **같은 오리진**으로 프록시(`/api/*` → 백엔드). 로그인 콜백을 프론트 URL(`FRONTEND_URL/api/auth/google/callback`)로 두어 쿠키가 **프론트 도메인**에 저장되도록 함.  
  → `/trips` 레이아웃에서 서버가 `cookies()`로 쿠키를 읽어 백엔드 `GET /me`에 넘기고, 401이면 `redirect('/login')`.  
  → **“로그인 확인 중…” 플래시 없이** 서버에서 인증 여부를 결정해 리다이렉트 또는 컨텐츠 렌더.
- **클라이언트**: 헤더 등에 user 표시를 위해 `AuthHydrate`가 마운트 시 `checkAuth()`로 스토어만 채움(로딩 UI 없음).
- **Google OAuth**: Google Cloud Console의 “승인된 리디렉션 URI”에 **프론트 오리진 + `/api/auth/google/callback`** 을 등록해야 함.  
  예: 개발 `http://localhost:3000/api/auth/google/callback`, 프로덕션 `https://<도메인>/api/auth/google/callback`.
- **환경 변수**: 프론트 서버(Next)에서 `BACKEND_URL`로 백엔드 주소 지정(rewrites·서버 인증 fetch용). 클라이언트는 `NEXT_PUBLIC_API_URL` 미설정 시 `/api`(같은 오리진) 사용.
