# Vercel 배포 가이드

## 환경 변수 설정

Vercel에 배포하기 전에 다음 환경 변수들을 설정해야 합니다:

### 필수 환경 변수

1. **Supabase 설정**
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 익명 키

2. **Gemini API**
   - `GEMINI_API_KEY`: Google Gemini API 키

3. **테스트 계정 (선택사항)**
   - `NEXT_PUBLIC_TEST_EMAIL`: 테스트 이메일
   - `NEXT_PUBLIC_TEST_PASSWORD`: 테스트 비밀번호

## Vercel CLI 배포 명령어

```bash
# 1. Vercel에 로그인
vercel login

# 2. 프로젝트 배포 (처음 배포시)
vercel

# 3. 프로덕션 배포
vercel --prod

# 4. 환경 변수 설정 (CLI로 설정하는 경우)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add GEMINI_API_KEY

# 5. 특정 브랜치 배포
vercel --prod --scope your-team-name
```

## 주의사항

1. `.env.local` 파일은 절대 커밋하지 마세요
2. Vercel 대시보드에서도 환경 변수를 설정할 수 있습니다
3. 환경 변수 변경 후에는 재배포가 필요합니다

## 배포 후 확인사항

1. 모든 환경 변수가 올바르게 설정되었는지 확인
2. Supabase 연결이 정상적으로 작동하는지 확인
3. PDF 업로드 및 다운로드 기능 확인
4. AI 기능 (퀴즈 생성, 해설집 생성) 확인