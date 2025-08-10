# 화면 정의서 - AI PDF 학습 서비스

## 1. 메인 홈페이지 (`/`)
**파일 위치**: `app/page.tsx`

### 화면 구성
- **네비게이션 바**: 상단 고정 네비게이션
- **학습 추천 섹션**: 우선순위 높은 학습 추천 표시
- **과목 진행 상황**: 
  - 등록된 과목 목록과 진행률
  - 새로운 과목 추가 기능
- **학습 활동 기록**:
  - 최근 2년간의 학습 활동 그래프 (CommitGraph)
  - 기간 필터: 1개월/3개월/6개월/1년

### 주요 컴포넌트
- `NavigationBar`: 상단 네비게이션
- `LearningRecommendation`: 학습 추천
- `SubjectProgress`: 과목별 진행 상황
- `CommitGraph`: 학습 활동 시각화

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
- **히어로 헤더**:
  - 과목 아이콘 (색상 커스터마이징)
  - 과목명과 설명
  - 문서 통계 (전체/미완료/완료)
  - PDF 업로드 버튼
  - 학습 진행률 바

- **탭 컨텐츠**:
  1. **모든 파일 탭**:
     - 업로드된 PDF 문서 목록
     - 문서별 상태 표시
     - 문서 삭제 기능
     - 학습/퀴즈 버튼
  
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

### 화면 구성
- **좌측 영역 (50%)**:
  - PDF 뷰어
  - 페이지 네비게이션
  - 줌 기능

- **우측 영역 (50%)**:
  - 탭 형식 컨텐츠
  
  **지식 트리 탭**:
  - 계층적 지식 구조 시각화
  - 아는/모르는 개념 구분
  - 개념별 이해도 표시
  
  **학습 가이드 탭**:
  - AI 생성 학습 가이드
  - 맞춤형 학습 내용

### 주요 컴포넌트
- `PDFViewer`: PDF 문서 뷰어
- `StudyTabs`: 탭 네비게이션
- `KnowledgeTreeView`: 지식 트리 시각화
- `StudyGuide`: 학습 가이드 표시

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
  - 과목명과 문서 정보
  - 뒤로가기 네비게이션

- **평가 영역**:
  - 제목: "학습 전 지식 평가"
  - 설명: O/X 퀴즈 안내
  - 순차적 O/X 문제 출제
  - 진행률 표시

### 주요 컴포넌트
- `OXKnowledgeAssessment`: O/X 평가 진행

### 기능
- PDF 업로드 후 초기 지식 평가
- 개념별 O/X 퀴즈
- 지식 상태 자동 업데이트
- 평가 완료 후 학습 페이지 이동

---

## 6. 퀴즈 페이지 (`/subjects/[id]/quiz`)
**파일 위치**: `app/subjects/[id]/quiz/page.tsx`

### 화면 구성
- **헤더**:
  - 과목명과 문서 정보
  - 학습 페이지로 돌아가기

- **퀴즈 영역**:
  - 전체 문제 목록 표시
  - 문제 유형별 구분
  - 답변 입력 및 체크

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
- `DocumentList`: 문서 목록 관리
- `DocumentStatus`: 문서 상태 표시
- `UploadPDFButton`: PDF 업로드 버튼
- `DeleteDocumentButton`: 문서 삭제 버튼
- `DocumentItemSkeleton`: 문서 아이템 스켈레톤

### 퀴즈 관련
- `MultipleChoiceQuestion`: 객관식 문제
- `TrueFalseQuestion`: 참/거짓 문제
- `FillInTheBlankQuestion`: 빈칸 채우기 문제
- `MatchingQuestion`: 짝맞추기 문제
- `ShortAnswerQuestion`: 단답형 문제
- `ExtendedQuizView`: 확장 퀴즈 뷰
- `DeleteQuizButton`: 퀴즈 삭제 버튼

### 학습 관련
- `KnowledgeTreeView`: 지식 트리 시각화
- `OXKnowledgeAssessment`: O/X 지식 평가
- `PDFViewer`: PDF 문서 뷰어
- `StudyGuide`: 학습 가이드
- `StudyTabs`: 학습 탭 네비게이션
- 각종 스켈레톤 컴포넌트

### 과목 관련
- `CreateSubjectButton`: 과목 생성 버튼
- `DeleteSubjectButton`: 과목 삭제 버튼
- `SubjectList`: 과목 목록
- `SubjectListSkeleton`: 과목 목록 스켈레톤
- `SubjectDetailSkeleton`: 과목 상세 스켈레톤

---

## 주요 사용자 플로우

### 1. 신규 사용자 플로우
1. 메인 홈페이지 접속
2. 과목 생성
3. PDF 문서 업로드
4. AI 분석 대기
5. O/X 지식 평가
6. 학습 페이지에서 지식 트리 확인
7. 연습문제 풀이
8. 결과 확인 및 개선

### 2. 학습 플로우
1. 과목 상세 페이지 접속
2. 문서 선택
3. 학습 페이지에서 PDF와 지식 트리 동시 확인
4. 학습 가이드 참고
5. 연습문제로 지식 강화
6. 결과 확인 및 반복 학습

### 3. 평가 플로우
1. PDF 업로드 완료
2. 자동으로 O/X 평가 페이지 이동
3. 순차적 O/X 퀴즈 진행
4. 평가 완료 후 학습 페이지 이동
5. 지식 상태 확인

---

## 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **UI**: React, Tailwind CSS
- **상태 관리**: React Hooks
- **데이터베이스**: Supabase
- **AI 서비스**: Google Gemini API
- **파일 처리**: PDF.js
- **인증**: 고정 사용자 ID (인증 없음)

---

## 반응형 디자인
- 모든 페이지는 반응형 레이아웃 적용
- 모바일/태블릿/데스크톱 대응
- 그리드 시스템과 Flexbox 활용
- 화면 크기별 최적화된 UI 제공