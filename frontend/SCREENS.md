# 화면 정의서 - AI PDF 학습 서비스

## 1. 메인 홈페이지 (`/`)
**파일 위치**: `app/page.tsx`

### 화면 구성
- **좌측 영역**:
  - **오늘의 추천**: 우선순위 높은 학습 추천 표시 (`TodayRecommendation`)
  - **문서별 진행 상황**: 최근 업로드된 문서와 학습 진행률 표시 (`DocumentProgressList`)
- **우측 영역**:
  - **내 과목 카드**: 등록된 과목 목록과 진행률, 새로운 과목 추가 기능 (`MyCourseCards`)
  - **학습 활동 그래프**: 최근 1년간의 학습 활동 히트맵 (`ActivityGraph`)

### 주요 컴포넌트
- `TodayRecommendation`: 학습 추천
- `DocumentProgressList`: 문서별 진행 상황 
- `MyCourseCards`: 과목 카드 목록
- `ActivityGraph`: 학습 활동 시각화

---

## 2. 과목 목록 페이지 (`/subjects`)
**파일 위치**: `app/subjects/page.tsx`

### 화면 구성
- **헤더 영역**:
  - 페이지 제목: "내 과목"
  - 부제목: "AI와 함께하는 스마트 학습 여정"
  - 과목 추가 버튼
- **과목 목록**:
  - 앨범형 카드 레이아웃
  - 과목별 아이콘과 색상
  - 생성일 기준 정렬
- **빈 상태**:
  - 과목이 없을 때 안내 메시지
  - 첫 과목 추가 유도

### 주요 컴포넌트
- `SubjectList`: 과목 목록 표시
- `CreateSubjectButton`: 과목 생성 버튼
- `SubjectListSkeleton`: 로딩 스켈레톤

### 기능
- 과목 생성
- 과목 삭제
- 과목 상세 페이지 이동


---

## 3. 과목 상세 페이지 (`/subjects/[id]`)
**파일 위치**: `app/subjects/[id]/page.tsx`

### 화면 구성
- **네비게이션**: 과목 목록으로 돌아가기 링크
- **과목 헤더 카드**:
  - 과목 아이콘 (색상 커스터마이징)
  - 과목명과 설명
  - 문서 통계 (전체/완료/진행률)
  - PDF 업로드 버튼
  - 학습 진행률 바

- **탭 컨텐츠**:
  1. **모든 파일 탭** (기본 활성):
     - 업로드된 PDF 문서 목록
     - 문서별 상태 표시 (대기중/분석중/완료)
     - 문서 삭제 기능
     - 학습/퀴즈/배경지식 체크 버튼
  
  2. **내가 생성한 문제집 탭**:
     - 생성된 퀴즈 목록
     - 문제 유형별 통계
     - 퀴즈 삭제 기능

### 주요 컴포넌트
- `UploadPDFButton`: PDF 업로드
- `DocumentList`: 문서 목록 관리
- `QuizList`: 퀴즈 목록 관리
- `SubjectDetailSkeleton`: 로딩 스켈레톤

### 기능
- PDF 업로드 및 분석
- 문서별 학습 페이지 이동
- 퀴즈 생성 및 관리
- 학습 진행률 추적

---

## 4. 학습 페이지 (`/subjects/[id]/study`)
**파일 위치**: `app/subjects/[id]/study/page.tsx`
**클라이언트 컴포넌트**: `components/study/StudyPageClient.tsx`

### 화면 구성
- **헤더**: 과목명, 문서 제목, 퀴즈/PDF 다운로드 버튼
- **좌측 영역 (50%)**:
  - PDF 뷰어 (`PDFViewer`)
  - 페이지 네비게이션
  - 줌 기능

- **우측 영역 (50%)**:
  - 탭 형식 컨텐츠 (`StudyTabs`)
  
  **지식 트리 탭**:
  - 계층적 지식 구조 시각화 (`KnowledgeTreeView`)
  - 아는/모르는 개념 구분 (녹색/빨간색)
  - 개념별 이해도 표시
  
  **학습 가이드 탭**:
  - AI 생성 학습 가이드 (`StudyGuide`)
  - 페이지별 학습 내용
  - PDF 페이지와 연동된 가이드

### 주요 컴포넌트
- `StudyPageClient`: 메인 클라이언트 컴포넌트
- `PDFViewer`: PDF 문서 뷰어 (react-pdf 사용)
- `StudyTabs`: 탭 네비게이션
- `KnowledgeTreeView`: 지식 트리 시각화 (Mermaid 다이어그램)
- `StudyGuide`: 학습 가이드 표시
- `StudyGuideEnhanced`: 향상된 학습 가이드 (페이지별)

### 기능
- PDF 문서 보기
- 지식 구조 파악
- 맞춤형 학습 가이드 생성
- 연습문제 페이지 이동

---

## 5. 지식 평가 페이지 (`/subjects/[id]/study/assessment`)
**파일 위치**: `app/subjects/[id]/study/assessment/page.tsx`

### 화면 구성
- **헤더**:
  - 과목명과 "학습 전 배경지식 체크" 부제목
  - 과목으로 돌아가기 네비게이션

- **평가 영역**:
  - 제목: "학습 전 배경지식 체크"
  - 설명: 각 개념을 알고 있는지 선택하여 지식 평가
  - 순차적 개념별 평가 (알고 있음/모름 선택)
  - 진행률 표시

### 주요 컴포넌트
- `OXKnowledgeAssessment`: 지식 평가 진행 컴포넌트

### 기능
- PDF 분석 완료 후 최초 1회 지식 평가
- 개념별 사전 지식 체크 (dependency 순서로 정렬)
- 지식 상태 자동 업데이트 (understanding_level)
- 평가 완료 후 학습 페이지로 자동 이동

---

## 6. 퀴즈 페이지 (`/subjects/[id]/quiz`)
**파일 위치**: `app/subjects/[id]/quiz/page.tsx`

### 화면 구성
- **헤더**:
  - 과목명과 문서 정보 ("연습문제 - 문서명")
  - 학습으로 돌아가기 네비게이션

- **퀴즈 영역**:
  - 전체 문제 목록 표시
  - 문제 유형별 구분 및 답변 입력
  - 실시간 답변 저장
  - 채점 및 결과 확인 버튼

- **빈 상태**:
  - 분석된 문서가 없을 때 안내 메시지
  - 문서 업로드 유도

### 주요 컴포넌트
- `AllQuestionsView`: 전체 문제 표시 및 관리

### 기능
- 다양한 문제 유형 지원:
  - 객관식 (Multiple Choice)
  - 참/거짓 (True/False)
  - 빈칸 채우기 (Fill in the Blank)
  - 짝맞추기 (Matching)
  - 단답형 (Short Answer)
- 답변 저장
- 채점 및 결과 페이지 이동

---

## 7. 퀴즈 결과 페이지 (`/subjects/[id]/quiz/result`)
**파일 위치**: `app/subjects/[id]/quiz/result/page.tsx`

### 화면 구성
- **결과 요약**:
  - 완료 축하 메시지
  - 트로피 아이콘

- **통계 카드** (3개):
  1. **문제 점수**: 맞춘 문제/전체 문제
  2. **지식 트리 완성도**: 아는 개념/전체 개념
  3. **개선된 개념**: 퀴즈로 학습 완료된 개념 수

- **액션 버튼**:
  - 학습으로 돌아가기
  - 다시 풀어보기

- **업데이트된 지식 트리**:
  - 퀴즈 후 변경된 지식 상태
  - 시각적 개선 표시

### 주요 컴포넌트
- `KnowledgeTreeView`: 업데이트된 지식 트리

### 기능
- 퀴즈 결과 통계 표시
- 지식 개선 현황 확인
- 학습 경로 안내

---

## 공통 컴포넌트

### UI 컴포넌트
- `ToastProvider`: 토스트 메시지 관리
- `ConfirmModal`: 확인 모달 다이얼로그
- `MermaidDiagram`: Mermaid 다이어그램 렌더링

### 문서 관련
- `DocumentList`: 문서 목록 관리 및 상태 표시
- `DocumentStatus`: 문서 상태 표시 (대기중/분석중/완료)
- `UploadPDFButton`: PDF 업로드 버튼
- `DeleteDocumentButton`: 문서 삭제 버튼
- `DocumentItemSkeleton`: 문서 아이템 로딩 스켈레톤

### 퀴즈 관련
- `AllQuestionsView`: 전체 퀴즈 문제 표시 및 관리
- `MultipleChoiceQuestion`: 객관식 문제
- `TrueFalseQuestion`: 참/거짓 문제
- `FillInTheBlankQuestion`: 빈칸 채우기 문제
- `MatchingQuestion`: 짝맞추기 문제
- `ShortAnswerQuestion`: 단답형 문제
- `ExtendedQuizView`: 확장 퀴즈 뷰
- `DeleteQuizButton`: 퀴즈 삭제 버튼
- `QuizList`: 과목별 퀴즈 목록

### 학습 관련
- `StudyPageClient`: 학습 페이지 메인 클라이언트 컴포넌트
- `KnowledgeTreeView`: 지식 트리 Mermaid 다이어그램 시각화
- `OXKnowledgeAssessment`: 사전 지식 평가 (알고 있음/모름)
- `PDFViewer`: PDF 문서 뷰어 (react-pdf)
- `StudyGuide`: 기본 학습 가이드
- `StudyGuideEnhanced`: 향상된 페이지별 학습 가이드
- `StudyGuidePageCard`: 학습 가이드 페이지 카드
- `StudyGuidePageViewer`: 페이지별 가이드 뷰어
- `StudyGuideProgressTracker`: 학습 진행 추적
- `StudyTabs`: 학습 탭 네비게이션
- 각종 스켈레톤 컴포넌트 (`PDFViewerSkeleton`, `StudyGuideSkeleton`, `OXQuizSkeleton` 등)

### 과목 관련
- `CreateSubjectButton`: 과목 생성 버튼
- `DeleteSubjectButton`: 과목 삭제 버튼  
- `SubjectList`: 과목 목록 카드 레이아웃
- `SubjectListSkeleton`: 과목 목록 로딩 스켈레톤
- `SubjectDetailSkeleton`: 과목 상세 페이지 로딩 스켈레톤

### 홈 페이지 관련
- `TodayRecommendation`: 오늘의 학습 추천
- `DocumentProgressList`: 문서별 진행 상황 목록
- `MyCourseCards`: 내 과목 카드 목록
- `ActivityGraph`: 학습 활동 히트맵 그래프
- `SubjectProgressList`: 과목별 진행 상황 (사용되지 않음)
- `CreateSubjectModal`: 과목 생성 모달

### PDF 관련
- `StudyGuidePDF`: PDF 형태의 학습 가이드

### 레거시 컴포넌트 (사용되지 않음)
- `CommitGraph`: 학습 활동 시각화 (ActivityGraph로 대체)
- `LearningRecommendation`: 학습 추천 (TodayRecommendation으로 대체)
- `SubjectProgress`: 과목별 진행 상황 (SubjectProgressList로 대체)
- `CourseCard`: 과목 카드 (MyCourseCards 내부로 통합)
- `RecentDocuments`: 최근 문서 (DocumentProgressList로 대체)
- `NavigationBar`: 네비게이션 바 (현재 미사용)

---

## 주요 사용자 플로우

### 1. 신규 사용자 플로우
1. 메인 홈페이지 접속
2. 과목 생성 (모달 또는 과목 목록 페이지에서)
3. 과목 상세 페이지에서 PDF 문서 업로드
4. AI 분석 대기 (문서 상태: 대기중 → 분석중 → 완료)
5. 첫 학습 시 자동으로 사전 지식 평가 페이지 이동
6. 개념별 배경지식 체크 (알고 있음/모름)
7. 학습 페이지에서 PDF와 지식 트리 확인
8. 학습 가이드로 내용 학습
9. 연습문제 풀이
10. 결과 확인 및 지식 개선

### 2. 학습 플로우
1. 홈페이지 또는 과목 상세 페이지 접속
2. 학습할 문서 선택
3. 학습 페이지에서 PDF와 지식 트리 동시 확인
4. 학습 가이드 페이지별 참고
5. 연습문제로 지식 강화
6. 퀴즈 결과 페이지에서 개선 현황 확인
7. 반복 학습

### 3. 배경지식 평가 플로우
1. PDF 업로드 및 분석 완료
2. 첫 학습 접근 시 자동으로 배경지식 체크 페이지 이동
3. 의존성 순서로 정렬된 개념별 평가 진행
4. 알고 있음/모름 선택으로 사전 지식 상태 설정
5. 평가 완료 후 학습 페이지로 자동 이동
6. 평가 결과가 지식 트리에 반영

---

## 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **UI**: React, Tailwind CSS
- **상태 관리**: React Hooks
- **데이터베이스**: Supabase (PostgreSQL)
- **AI 서비스**: Google Gemini API
- **파일 처리**: react-pdf, PDF.js
- **다이어그램**: Mermaid.js (지식 트리 시각화)
- **마크다운**: 커스텀 MarkdownRenderer
- **인증**: 고정 사용자 ID (인증 없음)
- **로깅**: 커스텀 로거 시스템

---

## 반응형 디자인
- 모든 페이지는 반응형 레이아웃 적용
- 모바일/태블릿/데스크톱 대응
- 그리드 시스템과 Flexbox 활용
- 화면 크기별 최적화된 UI 제공