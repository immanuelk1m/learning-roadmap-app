친구 초대 코드(중복 없는 8자리) 생성 및 온보딩에서 프로 1개월 자동 등록 계획

개요
- 목표: 네비게이션 드로어의 계정 정보 영역에 "친구 초대" 버튼 추가. 초대자는 고유 8자리 코드 부여(중복 없이 랜덤). 신규 유저가 회원가입 후 온보딩 페이지에서 코드 입력 시, 신규 유저에게 프로 1개월을 자동 부여.
- 추가 정책: 유저당 초대 코드는 최대 5개까지만 생성 가능. 생성 가능한 잔여 수가 0이면 친구 초대 화면에 "사용 불가능"(빨간불), 1 이상이면 "사용 가능"(초록불) 상태를 시각적으로 표시.
- 사용 리소스: Supabase(Postgres + Auth + RLS), Next.js App Router, 기존 `subscriptions` 테이블/로직 재사용.
- 프로젝트: `tclwjtrrhnivskqhiokg` (frontend에서 사용 중: documents/subjects/onboarding_responses/subscriptions 존재), 확장: `uuid-ossp`, `pgcrypto` 설치되어 랜덤/UUID 함수 사용 가능.

데이터베이스 변경 (DDL)
1) 초대 코드 테이블 생성: `invite_codes`
   - 컬럼
     - `code` text PRIMARY KEY (8자, 대문자+숫자) — 유니크 보장
     - `inviter_user_id` uuid NOT NULL REFERENCES auth.users(id)
     - `created_at` timestamptz DEFAULT timezone('utc', now())
     - `expires_at` timestamptz NULL (선택: 기본 6개월 등)
     - `max_uses` integer DEFAULT 1 (인당 최대 발급/사용 정책과 분리, 기본 1회용)
     - `use_count` integer DEFAULT 0
     - `active` boolean DEFAULT true
   - 인덱스
     - PRIMARY KEY(code)
     - BTREE(inviter_user_id)
   - 제약
     - `use_count <= max_uses`
     - 만료/비활성/초과 사용 방지 트리거는 애플리케이션/SQL 함수에서 검사

2) 초대 사용 로그 테이블: `invite_redemptions`
   - 컬럼
     - `id` uuid PRIMARY KEY DEFAULT uuid_generate_v4()
     - `code` text REFERENCES invite_codes(code)
     - `invited_user_id` uuid NOT NULL REFERENCES auth.users(id)
     - `created_at` timestamptz DEFAULT timezone('utc', now())
   - 인덱스/제약
     - 유저당 최초 1회만 유효하게 만들 경우: UNIQUE(invited_user_id)
     - 동일 코드에 대해 중복 사용 허용 여부는 invite_codes.max_uses로 제어

3) 랜덤 코드 생성 함수(중복 방지)
   - 함수: `generate_unique_invite_code(len int default 8) returns text`
   - 구현 아이디어: `encode(gen_random_bytes(6), 'base64')` → 대문자/숫자만 필터 → 길이 8자 추출 → 존재 검사 → 충돌 시 재시도 (최대 N회)
   - 대안: `pgcrypto`의 `gen_random_uuid()`를 hashids로 변환하는 확장 사용 가능하나, 단순 필터 방식이 충분

4) RLS 정책
   - `invite_codes`
     - INSERT: 사용자 본인(`auth.uid()`)만 자신의 코드 생성 가능
     - SELECT: 기본은 본인 소유 코드만 조회 허용. 관리자/서버는 service key 사용
     - UPDATE: 서버 로직(Cloud Function/서버 API)만 허용 또는 본인 코드 비활성화만 허용
   - `invite_redemptions`
     - INSERT: 서버 API에서만 수행 (서비스 롤)
     - SELECT: 본인 기록만 조회 가능

5) 인당 코드 생성 제한(최대 5개)
- DB 트리거 함수(권장): `prevent_more_than_5_codes_per_user()`
  - NEW.inviter_user_id 기준 `SELECT COUNT(*) FROM invite_codes WHERE inviter_user_id = NEW.inviter_user_id`
  - 결과가 5 이상이면 예외 발생: `RAISE EXCEPTION 'invite code limit reached (5)'`
- API 레벨 사전 체크로 사용자 친화적 에러 메시지 제공

백엔드 API 설계 (Next.js API Routes)
1) POST /api/invite/create
- auth 필요. 유저당 최대 5개 생성 가능
- 동작: 현재 보유 코드 수가 5 미만이면 새 코드 생성, 5 이상이면 409 반환
- 응답: { code } 또는 { error: 'LIMIT_REACHED', limitReached: true, currentCount: number }

2) GET /api/invite/my
- 본인 코드 목록 + 잔여 생성 가능 수 반환
- 응답: { codes: Array<{ code, use_count, max_uses, active, created_at }>, availableSlots: number } // availableSlots = max(5 - codes.length, 0)

3) POST /api/invite/redeem
   - Body: { code }
   - 조건 체크
     - 코드 존재/active 여부
     - 만료 여부(expires_at)
     - 사용 가능 횟수(use_count < max_uses)
     - 초대 대상: 신규 유저 첫 온보딩 시점에만 허용(예: `onboarding_responses` 미존재 또는 가입 후 N시간 이내 등 비즈니스 규칙)
   - 처리
     - `invite_redemptions`에 기록 삽입 (유일 제약 위반 시 409)
     - `invite_codes.use_count` 증가
     - 구독 1개월 부여: `subscriptions`에 1개월 active 레코드 upsert
       - provider = 'referral'
       - product_id = 'referral_pro_1m'
       - status = 'active'
       - current_period_start = now(), current_period_end = now() + interval '1 month'
       - cancel_at_period_end = true
     - 성공 응답: { success: true, pro_until: date }

4) POST /api/invite/validate
- Body: { code }
- 동작: 코드 존재/active/만료/사용 가능 여부를 검증만 수행(부여/소비 없음)
- 응답: { valid: boolean, reason?: 'NOT_FOUND'|'INACTIVE'|'EXPIRED'|'LIMIT_REACHED'|'ALREADY_USED' }
- 메모: 온보딩 첫 화면의 "확인" 버튼이 이 API를 사용하여 실시간 피드백 제공

프론트엔드 변경
1) 드로어(UI) - `components/NavigationBar.tsx`
   - 계정 정보 섹션에 "친구 초대" 버튼 추가
   - 클릭 시 모달/드로어 오픈: 
     - 내 초대코드 표시 + 복사 버튼
     - 초대 링크: `${origin}/onboarding?ref=${code}` 제공 (선택)
     - 코드가 없다면 생성 API 호출 후 표시
     - 생성 가능 여부 상태등: `availableSlots > 0`이면 초록불(사용 가능), 0이면 빨간불(사용 불가능) 표시 및 생성 버튼 비활성화

2) 온보딩 - `components/onboarding/OnboardingWizard.tsx`
- 초대 코드 입력란 추가: 설문 첫 화면에 배치
- URL 쿼리 파라미터 `ref`가 존재하면 자동으로 입력란에 채움
- 입력 형식 검증: 8자리, 대문자/숫자만 허용. 유효/무효 실시간 표시
- 유효성 확인 버튼: 입력란 옆 "확인" 버튼을 제공하고 `/api/invite/validate` 호출로 즉시 검증
  - 성공 시 초록 상태/체크 아이콘 표시 및 내부 상태 `isInviteCodeValid = true`
  - 실패 시 에러 메시지(존재하지 않음/만료/비활성/사용 한도 초과)를 표시하고 `isInviteCodeValid = false`
- 적용 타이밍: 설문 저장(`handleSaveAnswers`) 성공 직후 `POST /api/invite/redeem` 호출
  - 이미 PRO 활성 사용자면 호출 스킵
  - 성공 시 토스트: "초대 코드 적용 완료 — 프로 1개월 활성화"
  - 실패 시 케이스별 에러: 존재하지 않음/만료/비활성/사용 한도 초과/중복 사용
- 상태 관리: 적용 중 로딩, 버튼 비활성화, 중복 제출 방지
- 보안: 실제 유효성/한도/부여는 서버에서 검증. 클라이언트는 입력/호출만 수행