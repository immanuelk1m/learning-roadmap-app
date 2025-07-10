# AI PDF 학습 서비스

대학생을 위한 AI 기반 PDF 학습 플랫폼

## 🚀 빠른 시작

```bash
# 의존성 설치
npm install

# 환경 변수 설정 (대화형)
node scripts/setup-env.js

# 개발 서버 실행
npm run dev
```

## 📋 설정 방법

1. **환경 변수 설정**
   `.env.local` 파일을 열고 다음 값들을 입력하세요:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

2. **Supabase 설정**
   - Supabase 대시보드에서 새 프로젝트 생성
   - SQL Editor에서 `/supabase/schema.sql` 실행
   - Storage에서 `/supabase/storage.sql` 실행

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```

## 🎯 주요 기능

1. **과목 관리**: 과목별로 PDF 자료 정리
2. **PDF 업로드**: 학습 자료 업로드 및 자동 분석
3. **지식 트리**: AI가 생성한 개념 계층 구조 시각화
4. **자가 진단**: 각 개념에 대한 이해도 체크
5. **맞춤형 퀴즈**: 취약점 중심의 문제 생성
6. **학습 피드백**: 학습 진도 추적 및 개선

## 🚀 Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel --prod
```

자세한 배포 가이드는 [DEPLOYMENT.md](./DEPLOYMENT.md) 참조

## 📚 기술 스택

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Google Gemini 2.5 Pro
- **Visualization**: React Flow
- **PDF**: PDF.js
- **Deployment**: Vercel