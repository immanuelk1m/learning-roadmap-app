# 데이터베이스 스키마 문서

## 프로젝트 정보
- **프로젝트 ID**: tclwjtrrhnivskqhiokg
- **프로젝트 이름**: pdfs
- **데이터베이스 호스트**: db.tclwjtrrhnivskqhiokg.supabase.co
- **PostgreSQL 버전**: 17.4.1.064
- **생성일**: 2025-07-09

## 테이블 구조

### 1. subjects (과목)
과목 정보를 저장하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| user_id | uuid | ❌ | - | 사용자 ID |
| name | text | ❌ | - | 과목명 |
| description | text | ✅ | - | 과목 설명 |
| color | text | ✅ | '#3B82F6' | 과목 색상 |
| exam_date | date | ✅ | - | 시험 날짜 |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 생성 시간 |
| updated_at | timestamptz | ❌ | timezone('utc', now()) | 수정 시간 |

**인덱스:**
- `subjects_pkey`: id (PRIMARY KEY)
- `idx_subjects_user_id`: user_id

### 2. documents (문서)
PDF 문서 정보를 저장하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| subject_id | uuid | ❌ | - | 과목 ID (subjects 참조) |
| user_id | uuid | ❌ | - | 사용자 ID |
| title | text | ❌ | - | 문서 제목 |
| file_path | text | ❌ | - | 파일 경로 |
| file_size | integer | ✅ | - | 파일 크기 |
| page_count | integer | ✅ | - | 페이지 수 |
| status | text | ✅ | 'pending' | 처리 상태 (pending/processing/completed/failed) |
| gemini_file_uri | text | ✅ | - | Gemini API 파일 URI |
| quiz_generation_status | jsonb | ✅ | {"count": 0, "generated": false, "last_attempt": null} | 퀴즈 생성 상태 |
| assessment_completed | boolean | ✅ | false | 평가 완료 여부 |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 생성 시간 |
| updated_at | timestamptz | ❌ | timezone('utc', now()) | 수정 시간 |

**인덱스:**
- `documents_pkey`: id (PRIMARY KEY)
- `idx_documents_subject_id`: subject_id
- `idx_documents_user_id`: user_id
- `idx_documents_quiz_generation_status`: quiz_generation_status (GIN)

**외래 키:**
- `subject_id` → subjects(id)

### 3. knowledge_nodes (지식 노드)
문서의 지식 구조를 트리 형태로 관리하며, 사용자별 학습 상태를 통합 관리하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| document_id | uuid | ❌ | - | 문서 ID (documents 참조) |
| user_id | uuid | ❌ | - | 사용자 ID |
| parent_id | uuid | ✅ | - | 부모 노드 ID (자기 참조) |
| name | text | ❌ | - | 노드명 |
| description | text | ✅ | - | 노드 설명 |
| level | integer | ❌ | 0 | 계층 레벨 |
| position | integer | ❌ | 0 | 같은 레벨 내 위치 |
| prerequisites | text[] | ✅ | - | 선수 지식 목록 |
| understanding_level | integer | ✅ | 0 | 이해도 (0-100) |
| last_reviewed | timestamptz | ✅ | - | 마지막 복습 시간 |
| review_count | integer | ✅ | 0 | 복습 횟수 |
| assessment_method | text | ✅ | 'self_reported' | 평가 방법 (self_reported/quiz/test) |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 생성 시간 |
| updated_at | timestamptz | ❌ | timezone('utc', now()) | 수정 시간 |

**인덱스:**
- `knowledge_nodes_pkey`: id (PRIMARY KEY)
- `idx_knowledge_nodes_document_id`: document_id
- `idx_knowledge_nodes_parent_id`: parent_id
- `idx_knowledge_nodes_user_id`: user_id
- `idx_knowledge_nodes_user_document`: user_id, document_id
- `knowledge_nodes_unique_user_doc_name_parent`: user_id, document_id, name, COALESCE(parent_id) (UNIQUE)
- `idx_knowledge_nodes_understanding`: user_id, understanding_level
- `idx_knowledge_nodes_last_reviewed`: user_id, last_reviewed

**외래 키:**
- `document_id` → documents(id)
- `parent_id` → knowledge_nodes(id) (자기 참조)

### 4. quiz_items (퀴즈 문항)
퀴즈 문제를 저장하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| document_id | uuid | ❌ | - | 문서 ID (documents 참조) |
| node_id | uuid | ✅ | - | 지식 노드 ID (knowledge_nodes 참조) |
| question | text | ❌ | - | 문제 |
| question_type | text | ❌ | - | 문제 유형 (multiple_choice/true_false/short_answer/fill_in_blank/matching/ox) |
| options | jsonb | ✅ | - | 선택지 (객관식) |
| correct_answer | text | ❌ | - | 정답 |
| explanation | text | ✅ | - | 해설 |
| difficulty | text | ✅ | 'medium' | 난이도 (easy/medium/hard) |
| page_reference | integer | ✅ | - | 참조 페이지 |
| is_assessment | boolean | ✅ | false | 평가용 문제 여부 |
| source_quote | text | ✅ | - | 원문 인용 |
| hint | text | ✅ | - | 힌트 |
| acceptable_answers | jsonb | ✅ | - | 허용 가능한 답변들 |
| template | text | ✅ | - | 문제 템플릿 |
| blanks | jsonb | ✅ | - | 빈칸 정보 (빈칸 채우기) |
| left_items | jsonb | ✅ | - | 왼쪽 항목 (매칭) |
| right_items | jsonb | ✅ | - | 오른쪽 항목 (매칭) |
| correct_pairs | jsonb | ✅ | - | 정답 쌍 (매칭) |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 생성 시간 |

**인덱스:**
- `quiz_items_pkey`: id (PRIMARY KEY)
- `idx_quiz_items_document_id`: document_id
- `idx_quiz_items_node_id`: node_id
- `idx_quiz_items_assessment`: is_assessment, node_id (WHERE is_assessment = true)

**외래 키:**
- `document_id` → documents(id)
- `node_id` → knowledge_nodes(id)

### 5. quiz_sessions (퀴즈 세션)
퀴즈 진행 세션을 관리하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | gen_random_uuid() | 기본 키 |
| user_id | uuid | ❌ | - | 사용자 ID |
| document_id | uuid | ✅ | - | 문서 ID (documents 참조) |
| quiz_type | text | ✅ | 'practice' | 퀴즈 유형 (practice/assessment/missed_questions) |
| status | text | ✅ | 'in_progress' | 상태 (in_progress/completed/abandoned) |
| current_question_index | integer | ✅ | 0 | 현재 문제 인덱스 |
| total_questions | integer | ✅ | 0 | 전체 문제 수 |
| user_answers | jsonb | ✅ | {} | 사용자 답변 |
| question_results | jsonb | ✅ | {} | 문제별 결과 |
| show_results | boolean | ✅ | false | 결과 표시 여부 |
| time_started | timestamptz | ✅ | now() | 시작 시간 |
| time_completed | timestamptz | ✅ | - | 완료 시간 |
| last_updated | timestamptz | ✅ | now() | 마지막 수정 시간 |
| created_at | timestamptz | ✅ | now() | 생성 시간 |

**인덱스:**
- `quiz_sessions_pkey`: id (PRIMARY KEY)

**외래 키:**
- `document_id` → documents(id)

### 6. quiz_attempts (퀴즈 시도)
개별 퀴즈 문제 시도 기록을 저장하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| user_id | uuid | ❌ | - | 사용자 ID |
| quiz_item_id | uuid | ❌ | - | 퀴즈 문항 ID (quiz_items 참조) |
| user_answer | text | ❌ | - | 사용자 답변 |
| is_correct | boolean | ❌ | - | 정답 여부 |
| time_spent | integer | ✅ | - | 소요 시간 (초) |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 시도 시간 |

**인덱스:**
- `quiz_attempts_pkey`: id (PRIMARY KEY)
- `idx_quiz_attempts_user_id`: user_id

**외래 키:**
- `quiz_item_id` → quiz_items(id)

### 7. missed_questions (오답 문제)
사용자가 틀린 문제를 관리하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| user_id | uuid | ❌ | - | 사용자 ID |
| quiz_item_id | uuid | ❌ | - | 퀴즈 문항 ID (quiz_items 참조) |
| document_id | uuid | ❌ | - | 문서 ID (documents 참조) |
| node_id | uuid | ✅ | - | 지식 노드 ID (knowledge_nodes 참조) |
| source_quote | text | ❌ | - | 원문 인용 |
| review_count | integer | ✅ | 0 | 복습 횟수 |
| last_reviewed | timestamptz | ✅ | - | 마지막 복습 시간 |
| mastered | boolean | ✅ | false | 숙달 여부 |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 생성 시간 |

**인덱스:**
- `missed_questions_pkey`: id (PRIMARY KEY)
- `missed_questions_user_id_quiz_item_id_key`: user_id, quiz_item_id (UNIQUE)
- `idx_missed_questions_user_id`: user_id
- `idx_missed_questions_document_id`: document_id

**외래 키:**
- `quiz_item_id` → quiz_items(id)
- `document_id` → documents(id)
- `node_id` → knowledge_nodes(id)


### 8. study_guides (학습 가이드)
사용자별 문서 학습 가이드를 저장하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| user_id | uuid | ❌ | - | 사용자 ID |
| document_id | uuid | ❌ | - | 문서 ID (documents 참조) |
| content | text | ❌ | - | 가이드 내용 |
| known_concepts | uuid[] | ✅ | {} | 이해한 개념 ID 목록 |
| unknown_concepts | uuid[] | ✅ | {} | 모르는 개념 ID 목록 |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 생성 시간 |
| updated_at | timestamptz | ❌ | timezone('utc', now()) | 수정 시간 |

**인덱스:**
- `study_guides_pkey`: id (PRIMARY KEY)
- `study_guides_user_id_document_id_key`: user_id, document_id (UNIQUE)

**외래 키:**
- `document_id` → documents(id)

### 9. knowledge_assessment_quizzes (지식 평가 퀴즈)
지식 노드 평가용 퀴즈를 저장하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| node_id | uuid | ❌ | - | 지식 노드 ID (knowledge_nodes 참조) |
| question | text | ❌ | - | 문제 |
| correct_answer | boolean | ❌ | - | 정답 (참/거짓) |
| explanation | text | ✅ | - | 해설 |
| created_at | timestamptz | ✅ | now() | 생성 시간 |

**인덱스:**
- `knowledge_assessment_quizzes_pkey`: id (PRIMARY KEY)
- `idx_knowledge_assessment_node`: node_id

**외래 키:**
- `node_id` → knowledge_nodes(id)

### 10. ai_analysis_cache (AI 분석 캐시)
AI 분석 결과를 캐싱하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| document_id | uuid | ❌ | - | 문서 ID (documents 참조) |
| analysis_type | text | ❌ | - | 분석 유형 |
| result | jsonb | ❌ | - | 분석 결과 |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 생성 시간 |

**인덱스:**
- `ai_analysis_cache_pkey`: id (PRIMARY KEY)

**외래 키:**
- `document_id` → documents(id)

### 11. profiles (프로필)
사용자 프로필 정보를 저장하는 테이블임.

| 컬럼명 | 데이터 타입 | NULL 허용 | 기본값 | 설명 |
|--------|------------|-----------|--------|------|
| id | uuid | ❌ | uuid_generate_v4() | 기본 키 |
| email | text | ✅ | - | 이메일 |
| name | text | ✅ | - | 이름 |
| created_at | timestamptz | ❌ | timezone('utc', now()) | 생성 시간 |
| updated_at | timestamptz | ❌ | timezone('utc', now()) | 수정 시간 |

**인덱스:**
- `profiles_pkey`: id (PRIMARY KEY)

## 데이터베이스 확장 기능

### 설치된 확장 기능
1. **uuid-ossp** (v1.1) - UUID 생성 기능
2. **pgcrypto** (v1.3) - 암호화 함수
3. **pg_stat_statements** (v1.11) - SQL 문 실행 통계 추적
4. **pg_graphql** (v1.5.11) - GraphQL 지원
5. **supabase_vault** (v0.3.1) - Supabase Vault 확장
6. **plpgsql** (v1.0) - PL/pgSQL 프로시저 언어

### 사용 가능한 확장 기능 (미설치)
- **vector** - 벡터 데이터 타입 및 검색 (AI/ML용)
- **pg_trgm** - 텍스트 유사도 검색
- **fuzzystrmatch** - 문자열 유사도 측정
- **pg_cron** - 작업 스케줄러
- **postgis** - 지리공간 데이터 처리
- **pgroonga** - 다국어 전문 검색
- 기타 70개 이상의 확장 기능 사용 가능

## 보안 설정

### Row Level Security (RLS)
현재 모든 테이블에서 RLS가 비활성화되어 있음. 보안 강화를 위해 RLS 활성화 및 정책 설정이 필요함.

## 관계 다이어그램

```
subjects
  └── documents
        ├── knowledge_nodes (트리 구조, 사용자별 상태 포함)
        │     └── knowledge_assessment_quizzes
        ├── quiz_items
        │     ├── quiz_attempts
        │     └── missed_questions
        ├── quiz_sessions
        ├── study_guides
        └── ai_analysis_cache

profiles (독립적)
```

## 주요 기능별 테이블 그룹

### 1. 문서 관리
- subjects: 과목 분류
- documents: PDF 문서 메타데이터

### 2. 지식 구조화 및 학습 추적
- knowledge_nodes: 계층적 지식 트리 + 사용자별 학습 상태 통합 관리
- knowledge_assessment_quizzes: 지식 평가용 퀴즈

### 3. 퀴즈 시스템
- quiz_items: 퀴즈 문제 은행
- quiz_sessions: 퀴즈 진행 관리
- quiz_attempts: 개별 문제 시도 기록

### 4. 학습 추적
- missed_questions: 오답 관리 및 복습
- study_guides: 맞춤형 학습 가이드

### 5. 성능 최적화
- ai_analysis_cache: AI 분석 결과 캐싱

## 인덱스 최적화 전략

### 주요 인덱스
1. **사용자 기반 조회**: user_id 인덱스 (subjects, documents, quiz_attempts 등)
2. **문서 기반 조회**: document_id 인덱스 (모든 관련 테이블)
3. **계층 구조 탐색**: parent_id 인덱스 (knowledge_nodes)
4. **유니크 제약**: 복합 유니크 인덱스 (user_id + 엔티티_id)
5. **JSON 검색**: GIN 인덱스 (quiz_generation_status)
6. **조건부 인덱스**: is_assessment = true 조건 인덱스

## 최근 변경사항 (2025-08-10)

### 테이블 통합
- **user_knowledge_status 테이블 삭제**: knowledge_nodes 테이블로 통합
- **knowledge_nodes 테이블 확장**: 사용자별 학습 상태 관리 기능 추가
  - user_id, understanding_level, last_reviewed, review_count, assessment_method, updated_at 컬럼 추가
  - 지식 구조와 학습 상태를 하나의 테이블에서 통합 관리

### 인덱스 최적화
- 사용자별 조회 성능 향상을 위한 인덱스 추가
- 유니크 제약조건으로 데이터 무결성 강화

## 권장 개선 사항

### 1. 보안
- 모든 테이블에 RLS 활성화 필요
- 사용자별 데이터 접근 정책 설정 필요
- auth.users 연동 고려

### 2. 성능
- 대용량 텍스트 필드 (content, explanation 등)에 대한 전문 검색 인덱스 고려
- 자주 조회되는 JSON 필드의 특정 키에 대한 인덱스 추가 고려
- 파티셔닝 전략 검토 (documents, quiz_items 등)

### 3. 기능 확장
- 버전 관리 시스템 추가 고려
- 협업 기능을 위한 권한 관리 테이블 추가
- 학습 통계 및 분석용 집계 테이블 추가

### 4. 데이터 무결성
- 트리거를 통한 updated_at 자동 갱신
- 계층 구조 일관성 검증 트리거
- 소프트 삭제 기능 추가 (deleted_at 컬럼)