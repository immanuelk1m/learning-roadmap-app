# 🚀 PDF Study App: 기술 문서

안녕하세요! `pdf-study-app` 프로젝트에 오신 것을 환영합니다. 이 문서는 새로운 팀원이 프로젝트의 기술 스택, 아키텍처, 그리고 개발 워크플로우를 신속하게 파악하여 **입사 첫날 코드 기여를 시작할 수 있도록 돕는 단 하나의 진실의 원천(Single Source of Truth)**입니다.

---

### **목차**
1.  **개요 (Overview)**
2.  **주요 페이지 및 기능 (Key Pages & Features)**
3.  **시작하기 (Getting Started)**
4.  **프로젝트 구조 (Project Structure)**
5.  **핵심 아키텍처 및 컨셉 (Core Architecture & Concepts)**
6.  **개발 가이드 (Development Guide)**
7.  **환경 변수 (Environment Variables)**
8.  **배포 (Deployment)**

---

## 1. 개요 (Overview)

### 1.1. 프로젝트 소개
`pdf-study-app`은 사용자가 PDF 문서를 업로드하면, Google의 Gemini AI 모델을 활용하여 해당 문서 기반의 맞춤형 학습 가이드와 퀴즈를 생성해주는 지능형 학습 보조 애플리케이션입니다. 사용자는 복잡한 자료를 체계적으로 학습하고, 지식을 효과적으로 평가할 수 있습니다.

이 프로젝트는 **Supabase**를 백엔드 서비스(BaaS, Backend as a Service)로 활용하여 데이터베이스, 사용자 인증, 파일 스토리지 기능을 구현하며, 프론트엔드는 **Next.js**와 **React**를 기반으로 구축되었습니다.

### 1.2. 시스템 아키텍처
본 프로젝트의 전체적인 시스템 아키텍처는 아래와 같습니다. 사용자의 요청부터 데이터베이스와의 상호작용까지의 흐름을 보여줍니다.

```mermaid
graph TD
    subgraph "유저"
        A[User]
    end

    subgraph "프론트엔드 (Vercel)"
        B{Next.js App}
        B -- "Server/Client Components" --> D[React UI]
        B -- "Route Handlers" --> E{API Routes}
    end

    subgraph "백엔드 서비스 (Supabase)"
        F[Supabase Auth]
        G[Supabase DB (PostgreSQL)]
        H[Supabase Storage]
    end

    subgraph "외부 AI 서비스"
        I[Google Gemini API]
    end

    A --> B;
    B -- "인증 요청" --> F;
    D -- "PDF 업로드/학습 요청" --> E;
    E -- "DB 쿼리" --> G;
    E -- "파일 저장/조회" --> H;
    E -- "학습자료 생성 요청" --> I;
```

---

## 2. 주요 페이지 및 기능 (Key Pages & Features)

이 애플리케이션은 사용자의 학습 흐름에 따라 다음과 같은 주요 페이지로 구성됩니다. 각 페이지는 `app` 디렉토리 구조와 직접적으로 매핑됩니다.

*   **`app/page.tsx` - 메인 페이지 (과목 목록)**
    *   **역할**: 사용자가 생성한 모든 학습 과목의 목록을 보여주는 대시보드입니다.
    *   **주요 기능**:
        *   전체 과목 리스트 조회
        *   새로운 학습 과목 생성
        *   각 과목의 상세 페이지로 이동

*   **`app/subjects/[id]/page.tsx` - 과목 상세 및 문서 관리**
    *   **역할**: 특정 과목에 대한 학습 자료(PDF)를 관리하는 페이지입니다.
    *   **주요 기능**:
        *   학습할 PDF 문서 업로드
        *   업로드된 문서 목록 확인 및 상태(분석 중, 분석 완료) 추적
        *   문서 삭제 및 학습 가이드/퀴즈 생성 요청
        *   학습 페이지로 이동

*   **`app/subjects/[id]/study/page.tsx` - 학습 페이지**
    *   **역할**: AI가 생성한 학습 콘텐츠를 통해 본격적으로 학습을 진행하는 공간입니다.
    *   **주요 기능**:
        *   AI가 생성한 구조화된 학습 가이드 조회
        *   업로드한 원본 PDF 문서 확인
        *   지식 평가 페이지로 이동

*   **`app/subjects/[id]/study/assessment/page.tsx` - 지식 평가 페이지**
    *   **역할**: 문서 내용을 기반으로 생성된 AI 퀴즈를 풀며 학습 성취도를 스스로 평가하는 페이지입니다.
    *   **주요 기능**:
        *   객관식 또는 단답형 퀴즈 풀이
        *   퀴즈 결과 확인 및 피드백

---

## 3. 시작하기 (Getting Started)

로컬 개발 환경을 설정하고 프로젝트를 실행하기 위한 단계별 가이드입니다.

### 3.1. 사전 요구사항
*   **Node.js**: `v20.x` 또는 그 이상 버전을 권장합니다.
*   **pnpm**: `npm install -g pnpm` 명령어로 설치할 수 있습니다.
*   **Supabase Account**: 데이터베이스와 인증을 위해 [Supabase](https://supabase.com/) 계정이 필요합니다.
*   **Google AI Account**: AI 기능을 위해 [Google AI Studio](https://aistudio.google.com/)에서 API 키를 발급받아야 합니다.

### 3.2. 설치 및 설정
1.  **저장소 복제 (Clone)**
    ```bash
    git clone [여기에 소스 코드 저장소 URL을 입력하세요]
    cd pdf-study-app
    ```

2.  **종속성 설치 (Install Dependencies)**
    ```bash
    pnpm install
    ```

3.  **환경 변수 설정 (Environment Variables)**
    ```bash
    node scripts/setup-env.js
    ```
    터미널의 안내에 따라 `Supabase URL`, `Supabase Anon Key`, `Gemini API Key`를 입력하세요.

4.  **데이터베이스 설정 (Database Setup)**
    > **[TODO]**
    > `supabase/schema.sql` 또는 유사한 스키마 파일의 내용을 Supabase 대시보드의 `SQL Editor`에 붙여넣고 실행하도록 안내해야 합니다.

5.  **개발 서버 실행 (Run Development Server)**
    ```bash
    pnpm dev
    ```
    `http://localhost:3000`으로 접속하여 애플리케이션을 확인합니다.

---

## 4. 프로젝트 구조 (Project Structure)

이 프로젝트는 Next.js App Router의 컨벤션을 기반으로 하며, 기능별 모듈화를 지향하는 구조를 가집니다.

```
.
├── app/                  # 라우팅, 페이지, 레이아웃
├── components/           # 재사용 가능한 React 컴포넌트
├── lib/                  # 공통 라이브러리, 헬퍼, 클라이언트 설정
├── public/               # 정적 에셋 (이미지, 폰트 등)
├── scripts/              # 프로젝트 설정 및 자동화 스크립트
└── types/                # 전역 TypeScript 타입 정의
```

*   **`app/`**: 폴더 구조가 URL 경로가 됩니다. `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` 등 파일 컨벤션을 사용합니다. `api/` 폴더는 백엔드 API 엔드포인트 역할을 합니다.
*   **`components/`**: `ui/`(원자적), `features/`(기능별), `layouts/`(구조)로 나누어 컴포넌트를 관리합니다.
*   **`lib/`**: `supabase/` 클라이언트, `gemini/` 클라이언트 등 외부 서비스 연동 코드와 `utils.ts` 같은 공통 함수가 위치합니다.
*   **`types/`**: `database.ts` 등 프로젝트 전반에서 사용되는 TypeScript 타입을 정의합니다.

---

## 5. 핵심 아키텍처 및 컨셉 (Core Architecture & Concepts)

### 5.1. 렌더링 전략: 서버 컴포넌트 vs. 클라이언트 컴포넌트
*   **서버 컴포넌트 (기본)**: 데이터 페칭, 백엔드 리소스 직접 접근에 사용. `async/await` 직접 사용 가능.
*   **클라이언트 컴포넌트 (`'use client'`)**: 사용자 상호작용, `useState`/`useEffect` 등 훅 사용 시 파일 상단에 지시어 추가.

### 5.2. 데이터 페칭 (Data Fetching)
*   **클라이언트**: `useEffect`와 Supabase 클라이언트를 사용. 실시간 동기화는 Supabase Realtime 구독.
*   **서버 (권장)**: `async/await`를 사용하여 컴포넌트 렌더링 과정에서 직접 데이터 조회.

### 5.3. API (Route Handlers)
`app/api` 내 `route.ts` 파일이 백엔드 API 엔드포인트 역할을 합니다. `NextRequest`를 받아 `NextResponse`를 반환합니다.

### 5.4. 상태 관리 (State Management)
> **[TODO]**
> 현재는 React 훅 중심으로 상태를 관리. 전역 상태 관리가 필요할 경우 **Zustand** 도입 고려.

### 5.5. 인증 (Authentication)
**Supabase Auth**와 `@supabase/ssr`을 사용한 쿠키 기반 세션 관리를 구현합니다. `middleware.ts`가 모든 요청에서 세션을 갱신하여 서버/클라이언트 간 인증 상태를 동기화합니다.

---

## 6. 개발 가이드 (Development Guide)

### 6.1. Git 브랜치 전략 및 커밋 컨벤션
*   **브랜치**: `main`(운영), `develop`(개발), `feature/이슈번호-기능명`(기능)
*   **커밋**: Conventional Commits 규칙 준수 (예: `feat(auth): Add Google login`)

### 6.2. 코딩 스타일
ESLint, Prettier, husky, lint-staged를 통해 커밋 시 코드 스타일을 자동으로 검사하고 교정합니다.

### 6.3. API 응답 형식
*   **성공**: `{ "status": "success", "data": { ... } }`
*   **실패**: `{ "status": "error", "message": "Error message" }`

---

## 7. 환경 변수 (Environment Variables)

`.env.local` 파일에 아래 변수들을 설정해야 합니다. (`scripts/setup-env.js` 사용 권장)

| 변수명 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase `anon` public 키 |
| `GEMINI_API_KEY` | Google AI Studio API 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | (선택) Supabase 서비스 역할 키 |

---

## 8. 배포 (Deployment)

**Vercel**을 통해 Git 브랜치와 연동하여 자동 배포됩니다.
*   **Production**: `main` 브랜치에 병합 시 배포
*   **Preview**: `develop` 또는 `feature` 브랜치에 푸시/PR 시 배포