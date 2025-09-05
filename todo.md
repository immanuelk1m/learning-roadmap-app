## 과금/사용량 한도 개편 계획 (Starter/Pro)

### 요구사항
- Starter: 월간 PDF 80페이지, 퀴즈 생성 8회
- Pro: 월간 PDF 800페이지, 퀴즈 생성 80회
- Pricing 화면(`/pricing`)에 해당 한도 안내 표시, 현재 플랜에 맞는 버튼 상태/라벨 반영
- 백엔드 한도 체크는 페이지 기반으로 동작해야 함 (현재는 업로드 횟수 기반)

---

### 현재 상태 분석 요약
- 테이블: `public.user_usage_limits`
  - 컬럼 기본값: `pdf_upload_limit=5`, `quiz_set_creation_limit=10`
  - 월별 리셋 컬럼 존재: `period_start`, `period_end`
  - 트리거: `update_user_usage_limits_updated_at` (공통 함수 `update_updated_at_column()`)

- RPC 함수 (보안: SECURITY DEFINER)
  - `check_and_increment_pdf_upload(p_user_id uuid)`
    - 레코드 없으면 `pdf_upload_limit=5`, `quiz_set_creation_limit=10`로 생성 후 업로드 “횟수” +1
  - `check_and_increment_quiz_creation(p_user_id uuid)`
    - 레코드 없으면 동일 기본값으로 생성 후 퀴즈 생성 “횟수” +1

- 구독 테이블
  - 앱 사용: `public.subscriptions` (webhook/polar 연동)
  - 마이그레이션 파일에는 별도의 `public.user_subscriptions` + 트리거(`on_subscription_changed`) 있으나, 현재 앱 로직은 `subscriptions`를 사용 중
  - NavigationBar에서 PRO 여부 판단은 `subscriptions`의 `status`, `cancel_at_period_end`, `current_period_end` 기반

- 프런트엔드 사용량 체크 경로
  - PDF 업로드: `/api/usage/check-upload` → `check_and_increment_pdf_upload` 호출 (페이지 수 정보 미전달)
  - 퀴즈 생성: `/api/quiz/generate*` → `check_and_increment_quiz_creation` 호출

---

### 변경 설계
1) 스키마 확장 (페이지 기반)
- `user_usage_limits`에 “페이지 단위” 카운터/한도를 추가
  - 추가 컬럼: `pdf_pages_count integer not null default 0`, `pdf_pages_limit integer not null default 80`
  - 기존 컬럼(`pdf_upload_count`, `pdf_upload_limit`)은 하위호환 위해 유지, 더 이상 증가시키지 않음
  - 인덱스/트리거는 기존과 동일 (updated_at 갱신 트리거 유지)

2) Starter/Pro 한도 기본값 재정의
- Starter(기본): `pdf_pages_limit=80`, `quiz_set_creation_limit=8`
- Pro: `pdf_pages_limit=800`, `quiz_set_creation_limit=80`
- 신규 사용자 초기화 함수(`initialize_new_user`) 수정: 위 한도로 생성
- 구독 변경 트리거: 현재 `user_subscriptions` 기준으로 작성되어 있으므로, 실제 사용 중인 `subscriptions` 테이블에도 동등한 트리거 추가
  - 조건: 활성(`status='active'`), 기간 유효, `cancel_at_period_end=false`
  - Pro → 800/80, Free(혹은 비활성) → 80/8

3) RPC 함수 개편
- `check_and_increment_pdf_upload` → 페이지 기반으로 변경
  - 새 시그니처: `check_and_increment_pdf_pages(p_user_id uuid, p_pages integer)`
  - 동작: 기간 만료 시 리셋 → `pdf_pages_count + p_pages`가 `pdf_pages_limit` 이하일 때 허용 후 증가
  - 반환: `{ allowed, current_count, limit_count, message }` (current/limit는 “페이지” 단위)
- `check_and_increment_quiz_creation` 기본값/문구 조정
  - 레코드 없을 때 생성 기본값을 8/80 체계로 반영

4) API 레이어 수정
- `/api/usage/check-upload`
  - 요청 바디로 `pages` 전달 (선택된 페이지 수 또는 전체 페이지 수)
  - 서버에서 `check_and_increment_pdf_pages(p_user_id, pages)` 호출로 변경
- 퀴즈 생성 API는 기존 호출 유지 (한도만 8/80으로 적용됨)

5) 프런트엔드 반영
- `UploadPDFButton.tsx`
  - 업로드 전 체크 호출 시 `pages` 계산:
    - `selectedPages.length > 0 ? selectedPages.length : (file as any).pageCount || pageCount`
  - 제한 초과 시 토스트 메시지에 남은 페이지 수 표기
- `/pricing` 화면
  - Starter 카드: “월 80페이지 / 문제 생성 8회”
  - Pro 카드: “월 800페이지 / 문제 생성 80회”
  - 현재 플랜에 따라 버튼 라벨/비활성 처리 유지

6) 데이터 마이그레이션/백필
- 과거 업로드 이력으로 `pdf_pages_count` 백필 (가능 시):
  - `documents`에 페이지 수(`page_count`)가 있다면, 당월 범위에서 합산해 사용자별로 업데이트
  - 불가능하면 0으로 두고 차등 적용 시작

7) 테스트 계획
- 단위: RPC에 대해 Starter/Pro 케이스별 경계값 테스트 (79/80/81, 799/800/801)
- 통합: 업로드 UI에서 선택 페이지 수를 달리하여 제한 동작 확인
- 구독 전환: `subscriptions` 레코드 상태 변경에 따른 한도 자동 전환 확인

8) 롤백 계획
- 새 컬럼/함수 추가는 역호환성 유지
- 문제가 있으면 API에서 기존 함수(`check_and_increment_pdf_upload`)로 빠르게 스위치 가능

---

### 작업 순서 (체크리스트)
1. DB 마이그레이션 작성/적용
   - `user_usage_limits` 컬럼 추가(`pdf_pages_count`, `pdf_pages_limit`), 기본값 설정
   - `initialize_new_user` 함수의 기본 한도 80/8로 변경
   - `check_and_increment_pdf_pages` 신규 함수 추가 (기존 함수는 남김)
   - `check_and_increment_quiz_creation` 내 기본값 8/80로 조정
   - `subscriptions` 테이블용 한도 동기화 트리거 추가 (Pro=800/80, Free=80/8)
   - 백필 쿼리(당월 `documents.page_count` 합산) 작성

2. 서버 API 변경
   - `/api/usage/check-upload`가 `pages` 인자를 받아 새 RPC 호출하도록 수정

3. 프런트엔드 변경
   - `UploadPDFButton.tsx`에서 `pages` 계산 및 API 전송
   - `/pricing` UI 문구/라벨 업데이트

4. 테스트 & 검증
   - Starter/Pro 케이스 경계 테스트
   - 구독 상태 전환에 따른 한도 전환 확인

5. 배포 및 모니터링
   - 에러 로그/한도 초과 응답 비율 모니터링


