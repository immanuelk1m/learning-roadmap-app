-- Onboarding survey responses table
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  -- step1: free text or later link to subjects
  preferred_subject TEXT NULL,
  -- step2: usage purpose constrained to known values
  usage_purpose TEXT NOT NULL,
  -- step3: preferred material type constrained to known values
  preferred_material TEXT NOT NULL,
  survey_version INTEGER NOT NULL DEFAULT 1,
  raw_answers JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT onboarding_responses_user_unique UNIQUE (user_id)
);

-- Optional: reference profiles(id) if available
-- ALTER TABLE onboarding_responses
--   ADD CONSTRAINT onboarding_responses_user_fkey
--   FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user_id
  ON onboarding_responses(user_id);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION trg_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_onboarding_responses ON onboarding_responses;
CREATE TRIGGER set_timestamp_onboarding_responses
BEFORE UPDATE ON onboarding_responses
FOR EACH ROW EXECUTE FUNCTION trg_set_timestamp();

-- RLS: Only owner can access their record
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_responses_select_own ON onboarding_responses;
CREATE POLICY onboarding_responses_select_own
  ON onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS onboarding_responses_insert_own ON onboarding_responses;
CREATE POLICY onboarding_responses_insert_own
  ON onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS onboarding_responses_update_own ON onboarding_responses;
CREATE POLICY onboarding_responses_update_own
  ON onboarding_responses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE onboarding_responses IS 'Stores first-time onboarding survey responses per user (one row per user).';
COMMENT ON COLUMN onboarding_responses.preferred_subject IS 'Free text or suggestion; step1 (nullable).';
COMMENT ON COLUMN onboarding_responses.usage_purpose IS 'Step2 (required) — label mapping: "시험 대비 공부"→exam_preparation, "개념 이해"→concept_understanding, "과제 도움"→assignment_help';
COMMENT ON COLUMN onboarding_responses.preferred_material IS 'Step3 (required) — label mapping: PDF→pdf, PPT→ppt, 유튜브 영상→youtube';
