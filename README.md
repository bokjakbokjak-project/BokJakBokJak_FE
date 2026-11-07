# BokJakBokJak_FE

복작복작 - 대학생 기숙사 룸메이트 매칭 서비스 Frontend

## 시작하기

### 요구 환경

- Node.js `^22.22.2`, `^24.15.0` 또는 `>=26.0.0`
- npm

### 설치 및 실행

```bash
npm ci
npm run dev
```

터미널에 표시되는 주소(기본값 `http://localhost:5173`)를 브라우저에서 엽니다.

### 주요 명령어

| 명령어                  | 설명                       |
| ----------------------- | -------------------------- |
| `npm run dev`           | 개발 서버 실행             |
| `npm run build`         | 타입 검사 및 프로덕션 빌드 |
| `npm run preview`       | 빌드 결과 미리보기         |
| `npm run lint`          | ESLint 검사                |
| `npm run format`        | Prettier 포맷 적용         |
| `npm run format:check`  | Prettier 포맷 검사         |
| `npm run test`          | Vitest 감시 모드 실행      |
| `npm run test -- --run` | Vitest 1회 실행            |

## 기술 스택

- React + TypeScript + Vite
- React Router (Declarative 방식)
- Tailwind CSS v4
- CSS Variables (`@theme` 디자인 토큰)
- npm
- ESLint + Prettier
- Vitest + React Testing Library

React, TypeScript, Vite는 프론트엔드 팀에서 합의한 스택이고, 나머지는 초기 설정 담당자가 선택한 현재 프로젝트의 기본 개발 환경입니다.

## 폴더 구조

```text
src/
  app/         앱 구조와 라우팅
  pages/       각 화면
  components/  공통 컴포넌트
  styles/      전역 CSS와 디자인 토큰
  assets/      로고 및 이미지
  lib/         공통 유틸리티
  test/        테스트 환경 설정
```

## 스타일 규칙

- 화면과 컴포넌트 스타일은 JSX의 Tailwind 유틸리티 클래스로 작성합니다.
- 공통 색상은 `src/styles/tokens.css`의 `@theme` 토큰으로 정의하며, `bg-brand-brown1`, `text-gray-400`처럼 클래스로 사용합니다.
- Tailwind 기본 색상 팔레트는 비활성화되어 있으므로, 토큰에 정의된 색상만 클래스로 사용할 수 있습니다.
- `tokens.css`에는 Figma에서 확인한 값만 추가합니다.

## 폰트 라이선스

Pretendard와 Inter는 SIL Open Font License 1.1로 배포되며, npm 패키지(`pretendard`, `@fontsource/inter`)로 자체 호스팅합니다. 라이선스 전문은 [Pretendard](public/licenses/pretendard-OFL.txt), [Inter](public/licenses/inter-OFL.txt)에 있습니다.

## 온보딩 화면 경로

| 경로                    | 화면                       |
| ----------------------- | -------------------------- |
| `/login`                | 로그인                     |
| `/onboarding/school`    | 학교 정보 (1/4)            |
| `/onboarding/profile`   | 사용자 정보 (2/4)          |
| `/onboarding/dormitory` | 기숙사 정보 (3/4)          |
| `/onboarding/priority`  | 생활습관 우선순위 (4/4)    |
| `/onboarding/complete`  | 온보딩 완료                |
| `/dev/onboarding`       | 화면 목록 (개발 서버 전용) |

입력값은 메모리에만 유지되므로 새로고침하면 초기화됩니다. 인증과 저장 API는 아직 연결되지 않았습니다.

이전 단계의 필수 입력이 비어 있으면 가장 먼저 작성할 단계로 이동합니다. 새로고침이나 주소 직접 입력은 입력값을 초기화하므로 학교 정보 화면으로 돌아갑니다. 개별 화면은 `/dev/onboarding`에서 샘플 값으로 열 수 있습니다.

백엔드 인증이 연결되기 전까지 Google 버튼은 모든 환경에서 인증 없이 학교 정보 화면으로 이동합니다. 로그인 상태나 토큰은 만들지 않습니다.

768px 이상 화면에서는 390×844 프레임을 가운데 배치하고 창 높이에 맞춰 내용까지 통째로 확대/축소하며, 긴 화면은 프레임 안에서 스크롤합니다. 그보다 좁은 화면에서는 실제 화면 크기를 그대로 사용합니다. 자세한 내용은 [데스크톱 화면 비율 설정](docs/desktop-frame-scaling.md)을 참고합니다.

방 인원은 2인실로 시작하고, 4인실과 6인실을 누르면 선택은 그대로 두고 안내를 약 3초 동안 표시합니다.

## 시연 모드 (Vercel Preview)

팀 체험용 Preview 링크에서만 켜는 임시 모드입니다.

- **켜는 조건:** Vercel 환경 변수 `VITE_DEMO_MODE=true`와 Vercel이 제공하는 `VITE_VERCEL_ENV=preview`가 모두 있어야 합니다. 기본값과 Production에서는 꺼져 있습니다.
- **동작:** 기숙사 자동완성에 샘플 데이터를 쓰고, 테스트 데이터 입력 안내를 상단에 표시합니다.
- **유지되는 것:** 단계별 필수 입력 검증을 그대로 거칩니다. 로그인 상태나 토큰은 만들지 않고, 입력값은 저장하지 않습니다.
- **변수 범위:** `VITE_DEMO_MODE`는 Preview 환경의 시연 브랜치에만 설정하고, Production에는 설정하지 않습니다.

`vercel.json`은 하위 경로 접속과 새로고침을 위한 SPA rewrite만 담고 있습니다. 새로고침하면 입력값이 초기화되어 학교 정보 화면으로 돌아갑니다.

## 룸메이트 화면 경로

| 경로                    | 화면               |
| ----------------------- | ------------------ |
| `/roommate`             | 룸메이트 추천 목록 |
| `/roommate/:id`         | 매칭 분석          |
| `/roommate/:id/profile` | 상세 프로필        |

후보와 매칭률은 시연용 데이터이며, 추천 API와 대화 요청은 연결되지 않았습니다. 미결정 사항은 [룸메이트 문서](src/pages/roommate/OPEN_QUESTIONS.md)에 있습니다.
