# 온보딩 설문 → 과목 생성 → PDF 업로드 플로우 구현 TODO

본 문서는 “첫 회원가입 완료 시 메인으로 이동하지 않고, 개념 트리 로딩 제거 + 3단계 설문 → 과목 생성 → PDF 업로드 → 업로드 완료 시 평가 페이지로 이동” 흐름을 구현하기 위한 세분화된 작업 단계를 정의합니다.

## 목표
- 첫 로그인/회원가입 직후 메인 대신 온보딩 설문 화면으로 이동
- 설문 3단계 UI 구현(질문/선택지 고정)
- 설문 완료 후 과목 생성 단계로 자연스럽게 연결
- 과목 생성 직후 해당 과목 상세에서 PDF 업로드 유도(또는 위저드 내 업로드)
- 업로드 완료 시 `/subjects/[id]/study/assessment?doc=[documentId]`로 이동
- 초기 온보딩 흐름에서 “개념 트리 생성 중” 로딩 UX 제거

## 사용자 흐름 요약
1) 사용자 회원가입(OAuth) 완료 → 리다이렉트: `/onboarding`
2) 온보딩 설문(3단계)
   - [step1] 어떤 과목을 주로 공부하시나요?
   - [step2] Commit을 어떤 용도로 사용하시나요? (시험 대비 공부 / 개념 이해 / 과제 도움)
   - [step3] 주로 어떠한 형태의 자료를 업로드하시나요? (PDF / PPT / 유튜브 영상)
3) 설문 완료 → 과목 생성 단계(제목 입력 → 생성)
4) 과목 생성 완료 → PDF 업로드(선택 페이지 업로드 UI 재사용)
5) 업로드 완료 → 자동 이동: `/subjects/[subjectId]/study/assessment?doc=[documentId]`

---

## Phase 0. 현재 구조 파악 및 진입점 정의
- [ ] 현재 OAuth 리다이렉트 진입점 확인: `components/NavigationBar.tsx`의 `handleGoogleSignup()`
- [ ] 홈 초기 진입 컴포넌트 확인: `app/page.tsx`
- [ ] 업로드 후 리다이렉트 확인: `components/documents/UploadPDFButton.tsx` (이미 assessment로 push 함)

산출물/변경점
- 없음 (레퍼런스만 고정)

## Phase 1. 온보딩 라우트 및 UI 스캐폴딩
- [x] 라우트 생성: `app/onboarding/page.tsx` (Client Component)
- [x] 위저드 컨테이너 컴포넌트 생성: `components/onboarding/OnboardingWizard.tsx`
- [x] 3단계 설문 스텝 컴포넌트(위저드 내부 상태 기반)
  - [x] Step 1: “어떤 과목을 주로 공부하시나요?”
  - [x] Step 2: “Commit을 어떤 용도로 사용하시나요?” (시험 대비 공부 / 개념 이해 / 과제 도움)
  - [x] Step 3: “주로 어떠한 형태의 자료를 업로드하시나요?” (PDF / PPT / 유튜브 영상)
- [x] 각 단계 이전/다음 이동, 마지막 단계에서 “계속”으로 진행
- [x] 설문 응답 저장: `onboarding_responses` upsert

산출물/변경점
- `frontend/app/onboarding/page.tsx`
- `frontend/components/onboarding/OnboardingWizard.tsx`

### 설문 문항 상세(서비스 맞춤)
- Step 1: 주요 학습 과목
  - 질문: 어떤 과목을 주로 공부하시나요?
  - 보조문구: 관심 분야를 알려주시면 추천과 화면 구성을 맞춰드려요.
  - 입력형식: 단일 선택 칩 + “직접 입력”
  - 기본 옵션: 수학, 컴퓨터공학, 통계, 경영/경제, 의학, 법학, 외국어, 인문/사회, 공학, 자연과학, 기타(직접 입력)
  - 유효성: 선택 1개 또는 직접 입력 1개(둘 중 하나), 건너뛰기 가능
  - 저장 매핑: `preferred_subject` = 사용자가 선택/입력한 텍스트(null 허용)

- Step 2: Commit 사용 목적
  - 질문: Commit을 어떤 용도로 사용하시나요?
  - 보조문구: 목적에 맞춰 평가/가이드를 최적화해 드립니다.
  - 입력형식: 단일 선택 라디오/칩
  - 옵션(라벨 → 저장값):
    - 시험 대비 공부 → `exam_preparation`
    - 개념 이해 → `concept_understanding`
    - 과제 도움 → `assignment_help`
  - 유효성: 필수 1개 선택
  - 저장 매핑: `usage_purpose` = 위 저장값(enum-like, NOT NULL)

- Step 3: 주로 업로드할 자료 형태
  - 질문: 주로 어떠한 형태의 자료를 업로드하시나요?
  - 보조문구: 첫 업로드를 빠르게 시작할 수 있도록 준비할게요.
  - 입력형식: 단일 선택 카드/칩(아이콘 포함 권장)
  - 옵션(라벨 → 저장값):
    - PDF → `pdf`
    - PPT → `ppt`
    - 유튜브 영상 → `youtube`
  - 유효성: 필수 1개 선택
  - 저장 매핑: `preferred_material` = 위 저장값(enum-like, NOT NULL)

개발용 상수 예시
- `USAGE_PURPOSE_OPTIONS`:
  - [{ label: '시험 대비 공부', value: 'exam_preparation' }, { label: '개념 이해', value: 'concept_understanding' }, { label: '과제 도움', value: 'assignment_help' }]
- `MATERIAL_OPTIONS`:
  - [{ label: 'PDF', value: 'pdf' }, { label: 'PPT', value: 'ppt' }, { label: '유튜브 영상', value: 'youtube' }]
- `SUBJECT_SUGGESTIONS`:
  - ['수학','컴퓨터공학','통계','경영/경제','의학','법학','외국어','인문/사회','공학','자연과학']

## Phase 2. 첫 회원가입 시 온보딩으로 이동
- [x] 회원가입 버튼의 OAuth 리다이렉트 대상 수정: 회원가입 시 `/onboarding`으로 이동
  - 수정 파일: `components/NavigationBar.tsx` (`handleGoogleSignup`)
- [x] 홈 페이지에서 온보딩 미완료 시 `/onboarding`으로 리다이렉트
  - `app/page.tsx`에 `onboarding_responses` 존재 확인 후 미존재 시 push

산출물/변경점
- `frontend/components/NavigationBar.tsx`
- `frontend/app/page.tsx` (간단한 온보딩 완료 체크 로직)

## Phase 3. 과목 생성 단계 연결
- [x] 설문 위저드 마지막 단계에서 “계속” 클릭 시 과목 생성 화면으로 전환
  - 채택: 옵션 A(위저드 내 간단 폼)
- [x] 과목 생성 시 Supabase `subjects` INSERT
- [x] 성공 시 `subjectId`를 보관하고 업로드 단계로 전진

산출물/변경점
- `frontend/components/onboarding/OnboardingWizard.tsx` (과목 생성 단계 추가/호출)
- (선택) `frontend/components/home/CreateSubjectModal.tsx` 재사용

## Phase 4. PDF 업로드 단계 연결
- [x] 과목 생성 성공 후 “문서 업로드” 단계 노출
  - `UploadPDFButton` 재사용(`subjectId` 전달)
  - 업로드 완료 시 자동 이동 동작 확인
- [x] 온보딩 위저드 내 업로드 UI 임베드

산출물/변경점
- `frontend/components/onboarding/OnboardingWizard.tsx` (업로드 섹션 임베드)
- 기존 업로드 컴포넌트 재사용으로 코드 최소화

## Phase 5. 온보딩 완료 처리 및 재방문 시 동작
- [ ] (선택) `profiles.onboarding_completed` 마킹
- [x] 홈 진입 시 온보딩 미완료자는 `/onboarding`으로 유도

산출물/변경점
- `frontend/app/page.tsx` 온보딩 완료 여부 체크 로직 (Phase 2와 동일 위치)

## Phase 6. “개념 트리 생성 중” 로딩 제거(온보딩 초기 UX)
- [x] 온보딩 경로(`/onboarding`)는 별도 화면으로 분리(개념 트리 로딩 미노출)
- [ ] (필요 시) 기존 로딩 문구 개선

산출물/변경점
- 필요 시 관련 컴포넌트의 조건부 렌더링 보완

---

## DB/타입 추가(필수: 설문 응답 저장용 테이블)
- [x] 온보딩 설문 응답 테이블 추가: `onboarding_responses`
  - 마이그레이션: `frontend/migrations/002_create_onboarding_responses.sql`
  - 컬럼 스펙
    - `id uuid pk default uuid_generate_v4()`
    - `user_id uuid not null` (1인 1행 고정, UNIQUE)
    - `preferred_subject text` (자유 입력)
    - `usage_purpose text not null check in ('exam_preparation','concept_understanding','assignment_help')`
    - `preferred_material text not null check in ('pdf','ppt','youtube')`
    - `survey_version int default 1`
    - `raw_answers jsonb` (확장용)
    - `created_at timestamptz default now()`, `updated_at timestamptz default now()`
  - 인덱스: `idx_onboarding_responses_user_id (user_id)`
  - RLS: 소유자만 SELECT/INSERT/UPDATE 가능하도록 정책 포함
- [ ] 타입 업데이트
  - `types/database.ts` 재생성 필요(Supabase 타입 생성 스크립트 사용 시)

### Supabase MCP로 적용하기
1) 프로젝트 선택 및 비용 확인(필요 시): `get_cost` → `confirm_cost`
2) 마이그레이션 적용: `apply_migration`에 아래 파일을 전달
   - 파일: `frontend/migrations/002_create_onboarding_responses.sql`
3) 타입 재생성: `generate_typescript_types` 실행 → `frontend/types/database.ts` 갱신
4) 검증: `onboarding_responses`에 RLS가 활성화되어 있고 정책이 기대대로 동작하는지 확인

비고: 현재 마이그레이션은 `profiles(id)` FK를 주석 처리했습니다. 운영 환경에서 `profiles`가 보장된다면 FK 활성화를 권장합니다.

---

## 파일/변경 포인트 요약
- 추가
  - `app/onboarding/page.tsx`
  - `components/onboarding/OnboardingWizard.tsx`
  - `migrations/002_create_onboarding_responses.sql`
  - (선택) `migrations/00xx_onboarding_profiles.sql`
- 수정
  - `components/NavigationBar.tsx` → 회원가입 redirectTo: `/onboarding`
  - `app/page.tsx` → 온보딩 완료 전이면 `/onboarding`으로 라우팅
  - (필요시) `components/documents/DocumentList.tsx`, `components/study/AssessmentWaiter.tsx`의 초기 로딩 문구 가드

---

## QA 체크리스트
- [ ] 구글 OAuth 회원가입 후 즉시 `/onboarding`으로 이동하는지
- [ ] 온보딩 3단계 설문 동작, 선택/해제, 이전/다음 이동이 정상인지
- [ ] 설문 완료 후 과목 생성 단계가 자연스럽게 이어지는지
- [ ] 과목 생성 성공 시 업로드 단계로 전환되는지
- [ ] 업로드 성공 시 자동으로 `/subjects/[id]/study/assessment?doc=[documentId]`로 이동하는지
- [ ] 온보딩 완료 후 `/` 재방문 시 홈으로 바로 뜨는지(온보딩 재노출 안됨)
- [ ] 온보딩 경로에서 개념 트리 생성 관련 로딩/스켈레톤이 보이지 않는지

---

## 구현 팁
- 설문/과목 생성/업로드를 하나의 위저드로 묶되, 실제 기능은 기존 컴포넌트 재사용으로 구현 비용을 최소화합니다.
- 이미 `UploadPDFButton`이 업로드 완료 후 평가 페이지로 이동을 처리하고 있으므로, 위저드에서는 업로드 버튼만 노출하면 됩니다.
- 온보딩 완료 시 `onboarding_responses`에 한 번 INSERT하고, 필요 시 `profiles.onboarding_completed`를 true로 마킹하여 홈 진입 가드를 간단히 처리하세요.
