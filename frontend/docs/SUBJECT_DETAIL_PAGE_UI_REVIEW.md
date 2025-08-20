## 과목 상세 페이지 UI/디자인 리뷰

- 대상 화면: `frontend/app/subjects/[id]/page.tsx`
- 관련 구성 요소: `UploadPDFButton`, `DocumentList`, `QuizList`, `SubjectDetailSkeleton`
- 목표: 정보 위계, 접근성, 반응형, 시각 일관성, 상호작용 피드백 개선

---

### 요약 — 핵심 권고사항
- 정보 위계: 헤더를 2행으로 분리하고 통계/최근 업데이트를 명확히 노출.
- 탭 UX: 1/2 스텝 칩 대신 개수 배지, URL과 탭 상태 동기화, 탭 헤더 sticky.
- 접근성: 진행 바에 ARIA, focus-visible 링, 말줄임 텍스트에 라벨/툴팁.
- 반응형: 컨테이너 패딩 표준화, 소형 화면에서 스택 레이아웃.
- 시각 일관성: 시맨틱 토큰으로 팔레트/타이포 통일, 인라인 헥스 축소.
- 시스템 피드백: 페이지 레벨에서 실시간/폴링 상태 노출, 양 탭의 빈/에러 상태 강화.
- 성능: 초기 페인트 품질을 위한 하이브리드(서버+클라이언트) 패칭 검토.

---

### 1) 정보 구조 & 레이아웃

문제
- 헤더 카드에 과목 식별/설명/통계/진행/업로드 CTA가 밀집되어 스캔성이 낮습니다.
- 통계가 단순 텍스트라 가독성과 어포던스가 떨어집니다.

권장사항
- 헤더를 다음과 같이 분리:
  - 1행: 뒤로가기/브레드크럼 · 과목 아이콘 · 과목명/설명(말줄임) · 업로드 CTA
  - 2행: 통계 배지(전체/완료/진행) + ARIA 적용 진행 바
- 헤더와 탭 사이에 미세한 구분선을 추가합니다.
- 폴링 중이면 "실시간 업데이트 중" 배지, 아니라면 "마지막 업데이트 · HH:MM"을 표시합니다.

구현 힌트
- 래퍼에 `flex-col gap-4`, `md:`에서 `flex-row items-center justify-between` 전환.
- 과목명/설명은 `truncate`와 `title` 속성으로 전체 텍스트 노출.

---

### 2) 헤더 카드(아이콘 / 텍스트 / CTA)

문제
- 긴 과목명이 오버플로우 될 수 있고, 말줄임에 대한 툴팁이 없습니다.
- 업로드 중/분석 중 상태가 페이지 레벨에서 드러나지 않습니다.

권장사항
- 과목명/설명에 `truncate` + `title` + 적절한 max-width를 적용해 레이아웃 이동을 방지합니다.
- 업로드 버튼 인접에 상태 칩을 노출:
  - `DocumentList`의 폴링 상태가 true면 "실시간 업데이트 중", 아니면 마지막 업데이트 시각 표기.
- 터치 디바이스를 위해 최소 탭 타겟 40px 이상을 보장합니다.

예시(ARIA/포커스)
```jsx
<h1 
  className="text-base md:text-lg font-bold text-[#212529] truncate max-w-[60vw] md:max-w-none"
  title={subject.name}
>
  {subject.name}
</h1>
```

---

### 3) 진행 바(접근성)

문제
- ARIA 롤/값이 없어 스크린리더가 진행 상태를 알 수 없습니다.

권장사항
- `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`를 추가합니다.
- 바 내부/옆에 퍼센트 텍스트를 가시적으로 렌더합니다.

예시
```jsx
<div 
  className="relative h-2 bg-gray-200 rounded-full overflow-hidden"
  role="progressbar"
  aria-valuenow={progressPercentage}
  aria-valuemin={0}
  aria-valuemax={100}
>
  <div
    className="absolute inset-y-0 left-0 bg-[#2ce477] rounded-full transition-all duration-500"
    style={{ width: `${progressPercentage}%` }}
  />
</div>
<p className="mt-1 text-xs text-gray-600">{progressPercentage}% 진행</p>
```

---

### 4) 탭(파일 / 문제집)

문제
- 스텝 칩(1/2)은 순서를 나타낼 뿐 유용한 정보가 부족합니다.
- 탭 선택이 URL에 반영되지 않아 새로고침/공유 시 컨텍스트가 유실됩니다.
- 탭 헤더가 스크롤과 함께 사라져 전환 시 방향감이 떨어집니다.

권장사항
- 개수 배지 도입: "모든 파일 (N)", "내가 생성한 문제집 (M)".
- `useSearchParams` + `router.replace`로 `?tab=files|quizzes` 쿼리에 탭 상태를 동기화.
- 탭 헤더 sticky: `sticky top-0 z-10 bg-white`.
- 대비/포커스 향상: `focus-visible:ring-2 ring-offset-2`.

예시(배지)
```jsx
<button className="relative px-6 py-4">
  <span className="mr-2">모든 파일</span>
  <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 h-6 text-xs font-bold rounded bg-gray-100 text-gray-700">
    {documents.length}
  </span>
</button>
```

URL 동기화 패턴
```jsx
const params = useSearchParams();
const router = useRouter();
const activeTab = (params.get('tab') ?? 'files') as 'files' | 'quizzes';

const setTab = (tab) => {
  const next = new URLSearchParams(params);
  next.set('tab', tab);
  router.replace(`?${next.toString()}`);
};
```

---

### 5) 리스트(문서 / 문제집)

문제
- 정렬/필터 컨트롤이 페이지 레벨에서 발견되기 어렵습니다.
- 빈/로딩/에러 상태의 표현 충실도가 두 탭 간 다릅니다.

권장사항
- 탭 콘텐츠 상단에 공용 컨트롤 바 제공:
  - 정렬(최신순, 이름순), 필터(상태별), 검색 입력
  - 선택값은 URL 파라미터로 지속
- 두 탭의 빈/에러/스켈레톤 상태를 아이콘/카피/CTA까지 통일합니다.

---

### 6) 내비게이션 / 브레드크럼

문제
- 뒤로가기 링크만 있어, 와이드 화면에서 계층 정보가 제한됩니다.

권장사항
- 데스크톱: `과목 목록 > {과목명}` 브레드크럼, 모바일: 간결한 뒤로가기 유지.
- 뒤로가기 링크에 `aria-label="과목 목록으로 돌아가기"` 추가.

---

### 7) 시각 일관성(색/타이포/여백)

문제
- `#2ce477`(그린), `#FF8800`(오렌지), 블루 그라데이션 등 혼재로 팔레트 일관성이 약합니다.
- 텍스트 크기가 픽셀 단위로 하드코딩되어 있습니다.

권장사항
- Tailwind 테마에 시맨틱 토큰 도입:
  - Colors: `brand`, `accent`, `success`, `warning`, `danger`, `muted`
  - Typography: `text-sm`, `text-base`, `text-lg`, `text-xl` + 일관된 `leading-…`
- 헥스 리터럴을 토큰으로 대체, 버튼/배지는 공용 변형으로 통일.

토큰 예시(컨셉)
```js
// tailwind.config.js theme.extend.colors
brand: {
  DEFAULT: '#2563EB', // blue-600
  foreground: '#ffffff'
},
success: '#16A34A',
warning: '#F59E0B',
danger: '#DC2626',
muted: '#6B7280'
```

---

### 8) 접근성(A11y)

체크리스트
- 버튼/링크/탭 트리거에 `focus-visible:ring-2 ring-offset-2`.
- 라벨: 뒤로가기, 업로드 버튼에 `aria-label`.
- 진행 바: ARIA 롤/값 + 퍼센트 텍스트 노출.
- 말줄임: 전체 텍스트를 보여줄 `title` 또는 접근 가능한 툴팁.
- 대비: 컬러 배지/버튼의 텍스트 대비는 WCAG AA 충족.

---

### 9) 반응형

권장사항
- 표준 컨테이너 패딩: `px-4 sm:px-6 lg:px-8`, `max-w-7xl mx-auto`.
- 소형 화면: 헤더 항목 `flex-col items-start gap-3`로 스택.
- 과목명 폭 제한 + `truncate` 적용.
- 긴 목록 내 내비 개선을 위한 sticky 탭 헤더.

---

### 10) 성능 & 데이터 패칭

관찰 사항
- 페이지가 클라이언트 컴포넌트로, 초기 로딩은 클라이언트 패칭 후 스켈레톤을 표시합니다.

권장사항
- 하이브리드 패칭 채택:
  - 초기 과목/문서 패칭은 서버 컴포넌트/라우트 핸들러에서 수행해 클라이언트 쉘로 전달
  - 실시간/폴링은 클라이언트 유지
- 프로덕션에서 개발 로그 제거.

---

### 11) 시스템 피드백 & 마이크로 인터랙션

권장사항
- 헤더 전역 상태 칩:
  - 처리 중 아이템이 있으면 "실시간 업데이트 중"
  - 폴링/재패칭 후 마지막 업데이트 시간
- 토스트: 업로드 성공/실패, 분석 완료 시; 헤더 인근에 요약 배치.

---

### 12) QA 체크리스트(DoD)
- 헤더
  - 과목명/설명 말줄임 처리, 툴팁으로 전체 표시
  - 업로드 CTA 키보드 접근 가능, 포커스 링 명확
  - 상태 칩에 실시간/폴링/마지막 업데이트 표시
- 진행
  - ARIA 준수, 퍼센트 가시, 애니메이션 부드러움
- 탭
  - 개수 배지 정확, sticky 헤더, 포커스 스타일 가시
  - 탭 상태 URL 지속, 새로고침/공유 시 유지
- 리스트
  - 빈/로딩/에러 일관, 필터/정렬 동작 및 URL 지속
  - 에러 시 재시도 액션 노출
- 반응형
  - `sm`,`md`,`lg`에서 레이아웃 유지, 탭 타겟 ≥ 40px
- 접근성
  - 모든 인터랙션 키보드 가능, 포커스 트랩 없음, 대비 AA

---

### 13) 구현 단계 제안

1단계 — UX 폴리시(저위험)
- 과목 텍스트 truncate/title 추가
- 진행 바 ARIA + 퍼센트 표시
- 스텝 칩 → 개수 배지 교체
- sticky 탭 헤더, focus-visible 링

2단계 — 상태 & URL(중간)
- 탭 쿼리 파라미터, `useSearchParams`로 초기화
- `DocumentList` 폴링 상태를 헤더 칩에 연결(상태 승격 또는 공유 스토어)

3단계 — 컨트롤 바 & 상태 일원화(중간)
- 공용 필터/정렬/검색, URL 연결
- 빈/에러/스켈레톤 컴포넌트 통일

4단계 — 테마/토큰(중간)
- Tailwind 시맨틱 컬러/타이포 토큰 도입 및 핵심 컴포넌트 리팩터

5단계 — 하이브리드 패칭(상)
- 초기 패칭 서버 전환, 실시간은 클라이언트 유지

---

### 부록 — 스니펫 라이브러리

Progressbar (ARIA)
```jsx
<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
  <div className="absolute inset-y-0 left-0 bg-success rounded-full transition-all" style={{ width: `${progress}%` }} />
</div>
<p className="mt-1 text-xs text-gray-600">{progress}% 진행</p>
```

탭 배지
```jsx
<span className="inline-flex min-w-[1.5rem] h-6 px-2 items-center justify-center rounded bg-gray-100 text-gray-700 text-xs font-bold">
  {count}
</span>
```

Sticky 탭 헤더
```jsx
<div className="sticky top-0 z-10 bg-white border-b border-gray-200">...</div>
```

URL 동기화 탭(패턴)
```jsx
const params = useSearchParams();
const router = useRouter();
const activeTab = (params.get('tab') ?? 'files');
const setTab = (t) => { const next = new URLSearchParams(params); next.set('tab', t); router.replace(`?${next.toString()}`); };
```

포커스 링
```jsx
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand">...</button>
```
