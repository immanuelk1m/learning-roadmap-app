# Google OAuth 설정 가이드

## 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 선택
3. **APIs & Services** > **Credentials** 이동
4. **CREATE CREDENTIALS** > **OAuth client ID** 클릭
5. Application type: **Web application** 선택
6. 설정:
   - Name: `AI PDF Study App`
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     https://mystduy.vercel.app
     ```
   - Authorized redirect URIs:
     ```
     https://tclwjtrrhnivskqhiokg.supabase.co/auth/v1/callback
     ```
7. **CREATE** 클릭
8. Client ID와 Client Secret 복사

## 2. Supabase 설정

1. [Supabase Dashboard](https://supabase.com/dashboard/project/tclwjtrrhnivskqhiokg) 접속
2. **Authentication** > **Providers** 이동
3. **Google** 찾아서 활성화
4. 설정 입력:
   - **Client ID**: Google Cloud Console에서 복사한 값
   - **Client Secret**: Google Cloud Console에서 복사한 값
5. **Save** 클릭

## 3. SQL 업데이트 실행

Supabase SQL Editor에서 실행:
```sql
-- Update the handle_new_user function to work with Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 4. Vercel 환경 설정 업데이트

1. [Vercel Dashboard](https://vercel.com/immanuelk1ms-projects/mystduy/settings/environment-variables) 접속
2. 다음 Redirect URLs 확인:
   - Site URL: `https://mystduy.vercel.app`
   - Redirect URLs에 추가:
     ```
     https://mystduy.vercel.app/auth/callback
     ```

## 5. 테스트

1. https://mystduy.vercel.app 접속
2. "시작하기" 클릭
3. "Google로 로그인" 클릭
4. Google 계정 선택
5. 권한 승인
6. `/subjects` 페이지로 리다이렉트 확인

## 문제 해결

### "Redirect URI mismatch" 오류
- Google Cloud Console에서 Authorized redirect URIs 확인
- Supabase Dashboard URL 형식 확인: `https://[project-ref].supabase.co/auth/v1/callback`

### 로그인 후 리다이렉트 안 됨
- `/app/auth/callback/route.ts` 파일 확인
- Vercel 로그에서 오류 확인

### 프로필 생성 안 됨
- SQL Editor에서 `handle_new_user` 함수 업데이트 확인
- `profiles` 테이블에 `name` 컬럼 있는지 확인