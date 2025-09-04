-- ============================================
-- 사용자 사용량 제한 및 구독 관리 스키마
-- Created: 2025-09-04
-- Purpose: PDF 업로드 및 퀴즈 생성 제한 관리
-- ============================================

-- 1. 사용자 사용량 제한 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_usage_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 현재 기간 사용량
  pdf_upload_count INTEGER NOT NULL DEFAULT 0,
  quiz_set_creation_count INTEGER NOT NULL DEFAULT 0,
  -- 제한 설정 (무료: 5/10, 프로: 50/100)
  pdf_upload_limit INTEGER NOT NULL DEFAULT 5,
  quiz_set_creation_limit INTEGER NOT NULL DEFAULT 10,
  -- 기간 관리 (월별 리셋)
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', CURRENT_TIMESTAMP),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'),
  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_usage_limits_period ON public.user_usage_limits(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_user_usage_limits_updated_at ON public.user_usage_limits(updated_at);

-- RLS 활성화
ALTER TABLE public.user_usage_limits ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 레코드만 조회 가능
DROP POLICY IF EXISTS "Users can view own usage limits" ON public.user_usage_limits;
CREATE POLICY "Users can view own usage limits"
  ON public.user_usage_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 사용자는 자신의 레코드만 삽입 가능 (초기 생성 시)
DROP POLICY IF EXISTS "Users can insert own usage limits" ON public.user_usage_limits;
CREATE POLICY "Users can insert own usage limits"
  ON public.user_usage_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 레코드만 업데이트 가능
DROP POLICY IF EXISTS "Users can update own usage limits" ON public.user_usage_limits;
CREATE POLICY "Users can update own usage limits"
  ON public.user_usage_limits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. 사용자 구독 정보 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Polar 구독 정보
  polar_subscription_id TEXT UNIQUE,
  polar_product_id TEXT,
  polar_customer_id TEXT,
  -- 구독 상태
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'trialing', 'canceled', 'past_due')),
  subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro')),
  -- 구독 기간
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  -- 메타데이터
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 사용자당 하나의 활성 구독만 허용하는 unique 제약 추가
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_subscription_per_user 
  ON public.user_subscriptions(user_id, status) 
  WHERE status = 'active';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_polar_subscription_id ON public.user_subscriptions(polar_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_current_period ON public.user_subscriptions(current_period_end);

-- RLS 활성화
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독 정보만 조회 가능
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 서비스 역할은 모든 작업 가능 (webhook 처리용)
DROP POLICY IF EXISTS "Service role full access" ON public.user_subscriptions;
CREATE POLICY "Service role full access"
  ON public.user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. 공통 트리거 함수
-- ============================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 트리거들
DROP TRIGGER IF EXISTS update_user_usage_limits_updated_at ON public.user_usage_limits;
CREATE TRIGGER update_user_usage_limits_updated_at
    BEFORE UPDATE ON public.user_usage_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. 사용자 초기화 트리거
-- ============================================

-- 신규 사용자 초기화 함수
CREATE OR REPLACE FUNCTION initialize_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 사용량 제한 레코드 생성 (무료 플랜 기본값)
  INSERT INTO public.user_usage_limits (
    user_id,
    pdf_upload_count,
    quiz_set_creation_count,
    pdf_upload_limit,
    quiz_set_creation_limit,
    period_start,
    period_end
  ) VALUES (
    NEW.id,
    0,
    0,
    5,  -- 무료 플랜 PDF 업로드 제한
    10, -- 무료 플랜 퀴즈 생성 제한
    date_trunc('month', CURRENT_TIMESTAMP),
    date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
  ) ON CONFLICT (user_id) DO NOTHING;
  
  -- 기본 구독 레코드 생성 (무료)
  INSERT INTO public.user_subscriptions (
    user_id,
    status,
    subscription_type,
    metadata
  ) VALUES (
    NEW.id,
    'active',
    'free',
    jsonb_build_object('initialized_at', timezone('utc', now()))
  ) ON CONFLICT (user_id, status) WHERE status = 'active' DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 신규 사용자 생성 트리거
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_new_user();

-- 5. 구독 변경 시 사용량 제한 업데이트
-- ============================================

-- 구독 상태에 따른 사용량 제한 업데이트 함수
CREATE OR REPLACE FUNCTION update_usage_limits_for_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- 구독 상태가 변경될 때 사용량 제한 업데이트
  IF NEW.status = 'active' AND NEW.subscription_type = 'pro' THEN
    -- 프로 플랜 제한으로 업데이트
    UPDATE public.user_usage_limits
    SET 
      pdf_upload_limit = 50,
      quiz_set_creation_limit = 100,
      updated_at = timezone('utc', now())
    WHERE user_id = NEW.user_id;
  ELSIF NEW.status IN ('canceled', 'past_due', 'inactive') OR NEW.subscription_type = 'free' THEN
    -- 무료 플랜 제한으로 되돌리기
    UPDATE public.user_usage_limits
    SET 
      pdf_upload_limit = 5,
      quiz_set_creation_limit = 10,
      updated_at = timezone('utc', now())
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 구독 변경 시 사용량 제한 업데이트 트리거
DROP TRIGGER IF EXISTS on_subscription_changed ON public.user_subscriptions;
CREATE TRIGGER on_subscription_changed
  AFTER INSERT OR UPDATE OF status, subscription_type ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_limits_for_subscription();

-- 6. 헬퍼 함수들
-- ============================================

-- 월별 사용량 리셋 함수
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.user_usage_limits
  SET 
    pdf_upload_count = 0,
    quiz_set_creation_count = 0,
    period_start = date_trunc('month', CURRENT_TIMESTAMP),
    period_end = date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month',
    updated_at = timezone('utc', now())
  WHERE period_end <= CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 사용자의 현재 사용량 및 제한 정보를 가져오는 함수
CREATE OR REPLACE FUNCTION get_user_usage_info(p_user_id UUID)
RETURNS TABLE (
  pdf_upload_count INTEGER,
  pdf_upload_limit INTEGER,
  pdf_uploads_remaining INTEGER,
  quiz_set_creation_count INTEGER,
  quiz_set_creation_limit INTEGER,
  quiz_sets_remaining INTEGER,
  subscription_type TEXT,
  period_end TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.pdf_upload_count,
    ul.pdf_upload_limit,
    ul.pdf_upload_limit - ul.pdf_upload_count AS pdf_uploads_remaining,
    ul.quiz_set_creation_count,
    ul.quiz_set_creation_limit,
    ul.quiz_set_creation_limit - ul.quiz_set_creation_count AS quiz_sets_remaining,
    COALESCE(s.subscription_type, 'free') AS subscription_type,
    ul.period_end
  FROM public.user_usage_limits ul
  LEFT JOIN public.user_subscriptions s 
    ON ul.user_id = s.user_id 
    AND s.status = 'active'
  WHERE ul.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PDF 업로드 가능 여부 확인 및 카운트 증가 함수
CREATE OR REPLACE FUNCTION check_and_increment_pdf_upload(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  limit_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- 현재 사용량 및 제한 확인
  SELECT pdf_upload_count, pdf_upload_limit, period_end
  INTO v_current_count, v_limit, v_period_end
  FROM public.user_usage_limits
  WHERE user_id = p_user_id;
  
  -- 레코드가 없는 경우 생성
  IF NOT FOUND THEN
    INSERT INTO public.user_usage_limits (
      user_id,
      pdf_upload_count,
      quiz_set_creation_count,
      pdf_upload_limit,
      quiz_set_creation_limit
    ) VALUES (
      p_user_id,
      0,
      0,
      5,
      10
    )
    RETURNING pdf_upload_count, pdf_upload_limit, period_end
    INTO v_current_count, v_limit, v_period_end;
  END IF;
  
  -- 기간이 지났으면 리셋
  IF v_period_end <= CURRENT_TIMESTAMP THEN
    UPDATE public.user_usage_limits
    SET 
      pdf_upload_count = 0,
      quiz_set_creation_count = 0,
      period_start = date_trunc('month', CURRENT_TIMESTAMP),
      period_end = date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
    WHERE user_id = p_user_id
    RETURNING pdf_upload_count, pdf_upload_limit
    INTO v_current_count, v_limit;
  END IF;
  
  -- 제한 확인
  IF v_current_count < v_limit THEN
    -- 카운트 증가
    UPDATE public.user_usage_limits
    SET 
      pdf_upload_count = pdf_upload_count + 1,
      updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT 
      true AS allowed,
      v_current_count + 1 AS current_count,
      v_limit AS limit_count,
      'PDF upload allowed' AS message;
  ELSE
    RETURN QUERY SELECT 
      false AS allowed,
      v_current_count AS current_count,
      v_limit AS limit_count,
      'PDF upload limit reached for this month' AS message;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 퀴즈 생성 가능 여부 확인 및 카운트 증가 함수
CREATE OR REPLACE FUNCTION check_and_increment_quiz_creation(p_user_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  current_count INTEGER,
  limit_count INTEGER,
  message TEXT
) AS $$
DECLARE
  v_current_count INTEGER;
  v_limit INTEGER;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- 현재 사용량 및 제한 확인
  SELECT quiz_set_creation_count, quiz_set_creation_limit, period_end
  INTO v_current_count, v_limit, v_period_end
  FROM public.user_usage_limits
  WHERE user_id = p_user_id;
  
  -- 레코드가 없는 경우 생성
  IF NOT FOUND THEN
    INSERT INTO public.user_usage_limits (
      user_id,
      pdf_upload_count,
      quiz_set_creation_count,
      pdf_upload_limit,
      quiz_set_creation_limit
    ) VALUES (
      p_user_id,
      0,
      0,
      5,
      10
    )
    RETURNING quiz_set_creation_count, quiz_set_creation_limit, period_end
    INTO v_current_count, v_limit, v_period_end;
  END IF;
  
  -- 기간이 지났으면 리셋
  IF v_period_end <= CURRENT_TIMESTAMP THEN
    UPDATE public.user_usage_limits
    SET 
      pdf_upload_count = 0,
      quiz_set_creation_count = 0,
      period_start = date_trunc('month', CURRENT_TIMESTAMP),
      period_end = date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
    WHERE user_id = p_user_id
    RETURNING quiz_set_creation_count, quiz_set_creation_limit
    INTO v_current_count, v_limit;
  END IF;
  
  -- 제한 확인
  IF v_current_count < v_limit THEN
    -- 카운트 증가
    UPDATE public.user_usage_limits
    SET 
      quiz_set_creation_count = quiz_set_creation_count + 1,
      updated_at = timezone('utc', now())
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT 
      true AS allowed,
      v_current_count + 1 AS current_count,
      v_limit AS limit_count,
      'Quiz creation allowed' AS message;
  ELSE
    RETURN QUERY SELECT 
      false AS allowed,
      v_current_count AS current_count,
      v_limit AS limit_count,
      'Quiz creation limit reached for this month' AS message;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 관리자용: 특정 사용자의 구독을 프로로 업그레이드하는 함수
CREATE OR REPLACE FUNCTION upgrade_user_to_pro(
  p_user_id UUID,
  p_polar_subscription_id TEXT DEFAULT NULL,
  p_polar_customer_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 기존 활성 구독을 비활성화
  UPDATE public.user_subscriptions
  SET 
    status = 'inactive',
    updated_at = timezone('utc', now())
  WHERE user_id = p_user_id AND status = 'active';
  
  -- 새로운 프로 구독 생성
  INSERT INTO public.user_subscriptions (
    user_id,
    polar_subscription_id,
    polar_customer_id,
    status,
    subscription_type,
    current_period_start,
    current_period_end,
    metadata
  ) VALUES (
    p_user_id,
    p_polar_subscription_id,
    p_polar_customer_id,
    'active',
    'pro',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '1 month',
    jsonb_build_object(
      'upgraded_at', timezone('utc', now()),
      'source', 'manual_upgrade'
    )
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 기존 사용자 데이터 마이그레이션
-- ============================================

-- 기존 사용자들에 대한 사용량 제한 레코드 생성
INSERT INTO public.user_usage_limits (
  user_id,
  pdf_upload_count,
  quiz_set_creation_count,
  pdf_upload_limit,
  quiz_set_creation_limit,
  period_start,
  period_end
)
SELECT 
  u.id,
  0,  -- 초기 사용량 0
  0,  -- 초기 사용량 0
  5,  -- 무료 플랜 PDF 업로드 제한
  10, -- 무료 플랜 퀴즈 생성 제한
  date_trunc('month', CURRENT_TIMESTAMP),
  date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_usage_limits ul WHERE ul.user_id = u.id
);

-- 기존 사용자들에 대한 무료 구독 레코드 생성
INSERT INTO public.user_subscriptions (
  user_id,
  status,
  subscription_type,
  metadata
)
SELECT 
  u.id,
  'active',
  'free',
  jsonb_build_object(
    'migrated_at', timezone('utc', now()),
    'source', 'initial_migration'
  )
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_subscriptions s 
  WHERE s.user_id = u.id AND s.status = 'active'
);

-- 현재 기간의 실제 사용량 계산 및 업데이트 (documents 테이블 기준)
WITH usage_counts AS (
  SELECT 
    d.user_id,
    COUNT(*) as upload_count
  FROM documents d
  WHERE d.created_at >= date_trunc('month', CURRENT_TIMESTAMP)
  GROUP BY d.user_id
)
UPDATE public.user_usage_limits ul
SET 
  pdf_upload_count = COALESCE(uc.upload_count, 0),
  updated_at = timezone('utc', now())
FROM usage_counts uc
WHERE ul.user_id = uc.user_id;

-- 현재 기간의 퀴즈 생성 횟수 계산 및 업데이트 (quiz_sets 테이블 기준)
WITH quiz_counts AS (
  SELECT 
    qs.user_id,
    COUNT(*) as quiz_count
  FROM quiz_sets qs
  WHERE qs.created_at >= date_trunc('month', CURRENT_TIMESTAMP)
  GROUP BY qs.user_id
)
UPDATE public.user_usage_limits ul
SET 
  quiz_set_creation_count = COALESCE(qc.quiz_count, 0),
  updated_at = timezone('utc', now())
FROM quiz_counts qc
WHERE ul.user_id = qc.user_id;
