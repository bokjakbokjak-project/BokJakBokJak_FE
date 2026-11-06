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

Pretendard는 [SIL Open Font License 1.1](public/licenses/pretendard-OFL.txt)로 배포되며, `pretendard` npm 패키지로 자체 호스팅합니다.
