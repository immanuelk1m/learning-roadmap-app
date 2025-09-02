AI SDK Gemini 리팩토링 TODO

목표
- PDF 업로드 시 Vercel AI SDK의 Google Gemini(`@ai-sdk/google`)를 사용해 개념 트리(knowledge tree) 생성.
- 스트리밍 미사용(단건 응답). `generateObject` 응답 형태 채택.
- `KNOWLEDGE_TREE_PROMPT` 적용 및 결과를 Supabase `knowledge_nodes` 스키마에 맞춰 저장.

현 이슈 요약
- `lib/gemini/client.ts` 구문 오류(약 204행)로 모듈 파싱 실패 → 모든 export 인식 불가.
- `app/api/documents/[id]/analyze/route.ts`가 `geminiCombinedModel`, `uploadFileToGemini`를 import하나, 상기 파싱 오류로 컴파일 에러 발생.

의존성/환경 정리
- 패키지: `ai`, `@ai-sdk/google` 설치 필요.
- 환경변수: `GOOGLE_GENERATIVE_AI_API_KEY`(기존 `GEMINI_API_KEY`와 동일 값 사용 또는 마이그레이션).

데이터 스키마 확인 사항
- 대상 테이블: `knowledge_nodes`.
  - 주요 컬럼: `id(uuid, default)`, `user_id`, `subject_id`, `document_id`, `parent_id`, `name`, `description`, `level`, `position`, `prerequisites(text[])`, `assessment_method`, `understanding_level`, `review_count`, `last_reviewed`, `created_at`, `updated_at`.
- 출력 스키마 설계(Zod):
  - 트리형 구조를 수신: `{ nodes: Array<{ name, description?, prerequisites?: string[], children?: Node[] }>} `
  - 서버에서 flatten 하여 `level`, `position`, `parent_id` 계산 후 insert.

리팩토링 계획(비침투적 → 점진적)
1) 컴파일러 차단 제거(최소 수정)
   - `lib/gemini/client.ts`의 구문 오류를 우선 복구해 기존 라우트들이 빌드되도록 함(임시).
   - 단, 신규 구현은 Vercel AI SDK로 진행하고, 구(클라이언트) 의존 제거를 병행.

2) Analyze 라우트 전면 교체(비스트리밍, AI SDK)
   - 파일: `app/api/documents/[id]/analyze/route.ts`.
   - 변경점:
     - `@ai-sdk/google`의 `google()` + `ai`의 `generateObject` 사용.
     - `KNOWLEDGE_TREE_PROMPT` + 업로드된 PDF를 `messages`에 `[text, file]`로 전달.
     - Zod 스키마로 구조 보장, `result.object`만 사용(스트리밍 금지).
     - 파싱/검증(`parseGeminiResponse`, `validateResponseStructure`)은 AI SDK 출력 기준으로 단순화 또는 교체.

3) 결과 변환 + DB 반영
   - 트리 → 평탄화(flatten)하면서:
     - `level`: 깊이, `position`: 형제 내 순번.
     - `parent_id`: 상위 노드 삽입 결과의 `id` 참조(삽입 순서 보장).
     - `prerequisites`: 문자열 배열 유지.
   - 중복 방지 전략:
     - 동일 `document_id` + `user_id` 범위의 기존 노드 삭제 또는 soft-reset 후 재삽입(선택지 결정).
   - Supabase insert 배치 처리 및 오류 로깅 보강.

4) 업로드 처리 전환
   - 기존 `uploadFileToGemini` 폐기 예정.
   - AI SDK는 `messages: [{ type: 'file', data, mediaType: 'application/pdf' }]`로 직접 전달.
   - PDF 소스: Supabase Storage URL → `fetch()` → `File/Blob` 변환.

5) 로깅/에러 핸들링 정리
   - `geminiLogger` 재사용 가능하나, 메시지/메타데이터를 AI SDK 기준으로 갱신.
   - 응답·DB 단계별 상세 로깅 + 사용자 친화적 에러 응답.

6) 점진적 마이그레이션(후속)
   - `quiz`, `study-guide` 등 기존 Gemini 클라이언트 의존 라우트도 AI SDK로 순차 전환.
   - 구 클라이언트(`lib/gemini/client.ts`)는 최종 제거.

구현 단계별 체크리스트
- [ ] 패키지 추가: `ai`, `@ai-sdk/google`.
- [ ] `.env.local`에 `GOOGLE_GENERATIVE_AI_API_KEY` 구성(또는 기존 키 매핑).
- [ ] `lib/gemini/client.ts` 구문 오류 핫픽스(컴파일 언블락).
- [ ] `KNOWLEDGE_TREE_PROMPT` 기반 Zod 스키마 정의(knowledge tree 구조).
- [ ] PDF 로딩 로직(Subject/Document → Storage) 구현 및 `File` 변환.
- [ ] `generateObject()` 호출(비스트리밍)로 트리 수신.
- [ ] 트리 → `knowledge_nodes` 평탄화/매핑 유틸 구현.
- [ ] 기존 노드 정리 전략 적용(삭제/업서트 중 택1) 후 배치 insert.
- [ ] 상세 로깅/에러 응답 정비.
- [ ] `/subjects/:id` 플로우에서 업로드-생성-반영까지 수동 검증.

수용 기준(Acceptance Criteria)
- PDF 업로드 후 분석 요청 시 스트리밍 없이 단건 응답으로 완료된다.
- AI SDK(`@ai-sdk/google`) 사용, 모델은 Gemini 2.5 계열로 동작한다.
- 결과 트리는 `knowledge_nodes`에 계층/순서/참조가 올바르게 저장된다.
- 기존 컴파일 에러 없이 빌드/실행된다.

참고(문서/패턴)
- 설치: `pnpm add ai @ai-sdk/google`
- Non-Streaming 객체 생성:
  - `import { generateObject } from 'ai'`
  - `import { google } from '@ai-sdk/google'`
  - `await generateObject({ model: google('gemini-2.5-flash'), messages: [...], schema })`
- 파일 입력: `messages: [{ type: 'file', data: <Buffer|DataURL|Blob>, mediaType: 'application/pdf' }]`

