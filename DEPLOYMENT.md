# 배포 가이드 - Vercel & Supabase

## 1. Supabase 설정

### 1.1 Supabase 프로젝트 생성
1. [Supabase](https://supabase.com) 접속 후 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Project name: `pdf-study-app`
   - Database Password: 강력한 비밀번호 설정
   - Region: `Northeast Asia (Seoul)` 선택

### 1.2 데이터베이스 스키마 설정
1. Supabase 대시보드에서 "SQL Editor" 클릭
2. `/supabase/schema.sql` 파일 내용 복사하여 실행
3. `/supabase/storage.sql` 파일 내용 복사하여 실행

### 1.3 Storage 설정 확인
1. "Storage" 메뉴에서 `documents` 버킷 생성 확인
2. 버킷 설정에서 "Public" 옵션이 꺼져있는지 확인

### 1.4 환경 변수 복사
1. "Settings" > "API" 메뉴로 이동
2. 다음 값들을 복사:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Gemini API 키 발급
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. "Create API Key" 클릭
3. API 키 복사 → `GEMINI_API_KEY`

## 3. Vercel 배포

### 3.1 Vercel CLI 로그인
```bash
vercel login
```
- GitHub 계정으로 로그인 권장

### 3.2 프로젝트 초기화
```bash
vercel
```
다음 옵션 선택:
- Set up and deploy? `Y`
- Which scope? 본인 계정 선택
- Link to existing project? `N`
- Project name? `pdf-study-app` (또는 원하는 이름)
- Directory? `.` (현재 디렉토리)
- Override settings? `N`

### 3.3 환경 변수 설정
Vercel 대시보드에서 설정하거나 CLI로 설정:

```bash
# Vercel 대시보드에서 설정 (권장)
# Project Settings > Environment Variables

# 또는 CLI로 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add GEMINI_API_KEY
```

### 3.4 프로덕션 배포
```bash
vercel --prod
```

## 4. 배포 후 설정

### 4.1 Supabase Auth 설정
1. Supabase 대시보드 > "Authentication" > "URL Configuration"
2. "Site URL" 에 Vercel 도메인 추가: `https://your-app.vercel.app`
3. "Redirect URLs" 에 추가:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/login`

### 4.2 CORS 설정 (필요시)
Supabase Storage에서 CORS 오류 발생 시:
1. "Storage" > "Policies" 에서 정책 확인
2. Vercel 도메인이 허용되어 있는지 확인

## 5. 테스트 체크리스트
- [ ] 회원가입 및 로그인
- [ ] 과목 생성
- [ ] PDF 업로드
- [ ] AI 분석 (처리 시간 확인)
- [ ] 지식 트리 시각화
- [ ] PDF 뷰어
- [ ] 퀴즈 생성 및 풀이

## 6. 모니터링
- Vercel 대시보드에서 빌드 로그 확인
- Functions 탭에서 API 사용량 모니터링
- Analytics 탭에서 사용자 트래픽 확인

## 7. 문제 해결

### 빌드 실패
- 환경 변수가 모두 설정되었는지 확인
- `npm run build` 로컬에서 테스트

### API 오류
- Supabase URL과 키가 올바른지 확인
- Gemini API 키가 유효한지 확인
- API 사용량 한도 확인

### 인증 오류
- Supabase Auth 설정에서 도메인이 등록되었는지 확인
- 리다이렉트 URL이 올바른지 확인