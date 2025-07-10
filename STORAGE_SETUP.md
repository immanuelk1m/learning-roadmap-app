# Supabase Storage 설정 가이드

## 1. Supabase 대시보드에서 Storage 버킷 생성

1. [Supabase Dashboard](https://app.supabase.com)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **Storage** 클릭
4. **New bucket** 버튼 클릭
5. 다음 설정으로 버킷 생성:
   - Name: `documents`
   - Public bucket: ✅ 체크
   - File size limit: 50MB
   - Allowed MIME types: `application/pdf`

## 2. Storage 정책(Policies) 설정

Storage > Policies 탭에서 다음 정책들을 추가:

### 정책 1: Public Read Access
```sql
-- 모든 사용자가 파일을 읽을 수 있도록 허용
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'documents');
```

### 정책 2: Public Upload Access
```sql
-- 모든 사용자가 파일을 업로드할 수 있도록 허용
CREATE POLICY "Public Upload Access" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'documents');
```

### 정책 3: Public Update Access
```sql
-- 모든 사용자가 파일을 수정할 수 있도록 허용
CREATE POLICY "Public Update Access" ON storage.objects
FOR UPDATE TO public
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
```

### 정책 4: Public Delete Access
```sql
-- 모든 사용자가 파일을 삭제할 수 있도록 허용
CREATE POLICY "Public Delete Access" ON storage.objects
FOR DELETE TO public
USING (bucket_id = 'documents');
```

## 3. RLS 설정 확인

1. Storage > Configuration 탭으로 이동
2. RLS가 활성화되어 있는지 확인
3. 위의 정책들이 모두 적용되었는지 확인

## 4. CORS 설정 (필요한 경우)

Storage > Configuration > CORS에서:
```json
[
  {
    "origin": ["*"],
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "headers": ["*"],
    "maxAge": 3600
  }
]
```

## 5. 테스트

1. 애플리케이션에서 PDF 업로드 시도
2. 업로드된 파일이 Storage > documents 버킷에 표시되는지 확인
3. 파일 URL로 직접 접근 가능한지 확인

## 문제 해결

400 에러가 계속 발생하는 경우:

1. **버킷 이름 확인**: `documents` 버킷이 정확히 생성되었는지 확인
2. **파일 크기**: 업로드하는 PDF가 50MB 이하인지 확인
3. **MIME 타입**: 파일이 실제 PDF 파일인지 확인
4. **네트워크**: Supabase 프로젝트가 일시정지되지 않았는지 확인
5. **API 키**: 환경변수의 Supabase URL과 ANON KEY가 올바른지 확인