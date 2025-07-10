# Vercel 환경 변수 설정 가이드

## 방법 1: Vercel 웹 대시보드 (권장)

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 `mystduy` 선택
3. "Settings" 탭 클릭
4. 왼쪽 메뉴에서 "Environment Variables" 선택
5. 다음 환경 변수 추가:

| Name | Value | Environment |
|------|-------|-------------|
| NEXT_PUBLIC_SUPABASE_URL | https://tclwjtrrhnivskqhiokg.supabase.co | Production, Preview, Development |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... | Production, Preview, Development |
| GEMINI_API_KEY | AIzaSyDZAWNZ6eWTazcqq1H_Lks-lRi3_Oss5bo | Production, Preview, Development |

6. 각 변수 입력 후 "Save" 클릭

## 방법 2: Vercel CLI

```bash
# 각 환경 변수를 하나씩 추가
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add GEMINI_API_KEY production
```

## 환경 변수 확인

```bash
# 설정된 환경 변수 목록 확인
vercel env ls
```

## 재배포

환경 변수 설정 후 재배포:

```bash
vercel --prod
```