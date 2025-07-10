# Supabase 이메일 인증 활성화 가이드

## 🔧 설정 방법

1. [Supabase Dashboard](https://supabase.com/dashboard/project/tclwjtrrhnivskqhiokg) 접속
2. **Authentication** > **Providers** 이동
3. **Email** 찾아서 활성화
4. 설정 확인:
   - **Enable email confirmations**: OFF (테스트용)
   - **Enable email change confirmations**: OFF (테스트용)
   - **Enable secure email change**: OFF (테스트용)

## ⚠️ 주의사항

- 이메일 확인을 비활성화하면 테스트 계정이 즉시 사용 가능해집니다
- 프로덕션에서는 이메일 확인을 활성화하는 것이 좋습니다

## 🧪 테스트 확인

설정 완료 후:
1. https://mystduy.vercel.app/login 접속
2. "테스트 계정으로 로그인" 클릭
3. 정상 로그인 확인