export const KNOWLEDGE_TREE_PROMPT = `대한민국 고등학교 1학년 학생을 위해 PDF를 분석하여 이해에 필수적인 개념만 추출하세요.

**매우 중요: 모든 name과 description은 반드시 한국어로 작성하세요. 영어 약어(예: GDP, PER)는 name에 포함할 수 있지만, description은 반드시 한국어로 설명해야 합니다.**

**대상 학습자: 대한민국 고등학교 1학년 학생**

**중요 규칙:**
1. 문서를 이해하는데 꼭 필요한 핵심 개념만 추출
2. 고1 학생이 이해할 수 있는 수준으로 설명
3. "~는 ~이다" 형식의 일반적 정의문 금지
4. 구체적인 전문 용어, 공식, 이론명 중심
5. 모든 설명은 한국어로 작성
6. 3단계 깊이의 계층 구조 유지

**📊 노드 생성 원칙:**
- Level 1: 문서의 핵심 주제 (대주제)
- Level 2: 주제를 구성하는 중요 개념들
- Level 3: 세부 이해에 필요한 구체적 내용

**💡 개념 선정 기준:**
문서를 읽고 이해하는데 반드시 알아야 할 개념만 포함:
- 핵심 용어와 정의
- 중요한 공식이나 계산 방법
- 필수 이론이나 법칙
- 문서에서 반복적으로 언급되는 개념
- 다른 개념의 기초가 되는 내용

**🚨 계층 구조 설정 규칙 - 절대적으로 반드시 준수 🚨**
이 규칙을 따르지 않으면 시스템이 작동하지 않습니다!

**중요: 실제 ID는 데이터베이스가 자동 생성합니다. temp_id와 parent_id로 계층 구조를 표현하세요.**

1. **Level 1 노드 (최상위 개념)**
   - parent_id: null (절대 다른 값 불가)
   - 예: {"temp_id": "node_1", "parent_id": null, "level": 1}

2. **Level 2 노드 (중간 개념)**
   - parent_id: 반드시 상위 Level 1 노드의 temp_id
   - ❌ 잘못된 예: {"temp_id": "node_5", "parent_id": null, "level": 2}
   - ✅ 올바른 예: {"temp_id": "node_5", "parent_id": "node_1", "level": 2}

3. **Level 3 노드 (세부 개념)**
   - parent_id: 반드시 상위 Level 2 노드의 temp_id
   - ❌ 잘못된 예: {"temp_id": "node_8", "parent_id": null, "level": 3}
   - ✅ 올바른 예: {"temp_id": "node_8", "parent_id": "node_5", "level": 3}

**⚠️ 경고: parent_id가 null인 노드는 Level 1만 가능합니다! ⚠️**
**⚠️ 경고: 실제 id 필드를 절대 생성하지 마세요! ⚠️**

**parent_id 작성 단계별 가이드:**
1단계: Level 1 노드들을 먼저 생성 (parent_id: null)
2단계: 각 Level 2 노드마다 어느 Level 1 노드의 하위인지 판단
3단계: Level 2 노드의 parent_id에 해당 Level 1 노드의 id 입력
4단계: 각 Level 3 노드마다 어느 Level 2 노드의 하위인지 판단
5단계: Level 3 노드의 parent_id에 해당 Level 2 노드의 id 입력

**좋은 예시 (반드시 한국어 사용, 고1 수준):**
- name: "GDP", description: "한 나라에서 1년간 생산한 모든 재화와 서비스의 시장가치 합계"
- name: "수요법칙", description: "가격이 오르면 수요량이 줄고, 가격이 내리면 수요량이 늘어나는 법칙"
- name: "광합성", description: "식물이 빛에너지를 이용해 이산화탄소와 물로 포도당을 만드는 과정"
- name: "등가속도운동", description: "가속도가 일정하게 유지되는 물체의 운동"

**나쁜 예시 (사용 금지):**
- "경제학 개론은 경제학의 기초를 다루는 학문"
- "생활경제는 일상생활 속 경제 현상"
- "투자의 이해는 투자를 이해하는 것"
- name: "Interest Rate", description: "The cost of borrowing money" (영어 사용 금지)

**올바른 계층 구조 JSON 예시 (이 형식을 정확히 따를 것):**
{
  "nodes": [
    {"id": "node_1", "parent_id": null, "name": "통계학", "description": "데이터를 수집, 분석, 해석하는 학문", "level": 1, "prerequisites": []},
    {"id": "node_2", "parent_id": null, "name": "확률론", "description": "불확실성을 수학적으로 다루는 이론", "level": 1, "prerequisites": []},
    {"id": "node_3", "parent_id": "node_1", "name": "기술통계", "description": "데이터의 특성을 요약하는 통계 방법", "level": 2, "prerequisites": ["통계학"]},
    {"id": "node_4", "parent_id": "node_1", "name": "추론통계", "description": "표본에서 모집단을 추정하는 통계 방법", "level": 2, "prerequisites": ["통계학"]},
    {"id": "node_5", "parent_id": "node_2", "name": "확률분포", "description": "확률변수가 가질 수 있는 값들의 확률", "level": 2, "prerequisites": ["확률론"]},
    {"id": "node_6", "parent_id": "node_3", "name": "평균", "description": "모든 값의 합을 개수로 나눈 값", "level": 3, "prerequisites": ["기술통계"]},
    {"id": "node_7", "parent_id": "node_3", "name": "중앙값", "description": "데이터를 크기순으로 정렬했을 때 중앙에 위치한 값", "level": 3, "prerequisites": ["기술통계"]},
    {"id": "node_8", "parent_id": "node_3", "name": "표준편차", "description": "데이터가 평균에서 떨어진 정도의 척도", "level": 3, "prerequisites": ["기술통계"]},
    {"id": "node_9", "parent_id": "node_3", "name": "사분위수", "description": "데이터를 4등분하는 값들 (Q1, Q2, Q3)", "level": 3, "prerequisites": ["기술통계"]},
    {"id": "node_10", "parent_id": "node_4", "name": "가설검정", "description": "통계적 유의성을 판단하는 방법", "level": 3, "prerequisites": ["추론통계"]},
    {"id": "node_11", "parent_id": "node_4", "name": "신뢰구간", "description": "모수의 참값이 포함될 구간의 추정", "level": 3, "prerequisites": ["추론통계"]},
    {"id": "node_12", "parent_id": "node_4", "name": "t-검정", "description": "두 집단의 평균 차이를 검정하는 방법", "level": 3, "prerequisites": ["추론통계"]},
    {"id": "node_13", "parent_id": "node_5", "name": "정규분포", "description": "종 모양의 대칭적인 확률분포", "level": 3, "prerequisites": ["확률분포"]},
    {"id": "node_14", "parent_id": "node_5", "name": "이항분포", "description": "n번 시행에서 성공 횟수의 확률분포", "level": 3, "prerequisites": ["확률분포"]},
    {"id": "node_15", "parent_id": "node_5", "name": "포아송분포", "description": "단위 시간당 발생 횟수의 확률분포", "level": 3, "prerequisites": ["확률분포"]}
  ]
}

**🔴 최종 체크리스트 - 반드시 검증하세요! 🔴**
□ Level 1 노드들의 parent_id가 모두 null인가?
□ Level 2 노드들의 parent_id가 모두 존재하는 Level 1 노드의 id인가?
□ Level 3 노드들의 parent_id가 모두 존재하는 Level 2 노드의 id인가?
□ parent_id가 null인 노드 중 Level 2나 3인 것이 없는가?
□ 모든 개념이 고1 학생이 이해할 수 있는 수준인가?
□ 문서 이해에 불필요한 개념은 제외했는가?

**절대 규칙: Level 2, 3 노드의 parent_id는 null이 될 수 없습니다!**

**📚 고1 학생이 문서를 완전히 이해하는데 필요한 개념만 포함하세요. 너무 많거나 적지 않게 적절한 수준으로.**`


export const QUIZ_GENERATION_PROMPT = `당신은 모든 문제의 근거를 명확히 제시하는 꼼꼼한 대학교 시험 출제위원입니다.

**중요: 모든 문제, 선택지, 해설은 한국어로 작성하세요.**

## 작업 지시사항

사용자가 모르는 개념들을 중심으로 다음 단계에 따라 문제를 생성하세요:

1. **PDF 내용 분석**: 해당 개념이 설명된 부분 확인
2. **핵심 원리 파악**: 개념의 핵심 원리와 응용 방법 이해
3. **문제 설계**: 단순 암기가 아닌 이해도를 평가하는 문제 구성
4. **선택지 구성**: 일반적인 오개념을 반영한 오답 선택지 작성
5. **근거 확보**: PDF의 정확한 원문을 인용하여 근거 제시

## 난이도 기준

- **easy**: 개념의 기본 정의나 직접적 적용
- **medium**: 여러 개념을 연결하거나 간단한 응용
- **hard**: 복잡한 상황에서의 응용이나 심화 이해 필요

## 출력 형식

반드시 다음 JSON 형식으로 5개의 문제를 출력하세요:

{
  "questions": [
    {
      "question": "구체적이고 명확한 문제",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correct_answer": "정답 선택지 (options 중 하나와 정확히 일치)",
      "explanation": "왜 이것이 정답인지 개념적으로 설명",
      "source_quote": "PDF에서 발췌한 관련 원문",
      "difficulty": "easy|medium|hard"
    }
  ]
}

## 구체적 예시

예를 들어, "극한" 개념에 대한 문제:

{
  "questions": [
    {
      "question": "함수 f(x) = (x²-4)/(x-2)에서 x가 2에 가까워질 때의 극한값은?",
      "options": ["2", "4", "0", "정의되지 않음"],
      "correct_answer": "4",
      "explanation": "x≠2일 때 f(x) = (x²-4)/(x-2) = (x+2)(x-2)/(x-2) = x+2이므로, x→2일 때 극한값은 2+2=4입니다. 이는 함수의 불연속점에서도 극한이 존재할 수 있음을 보여줍니다.",
      "source_quote": "함수 f(x)가 x=a에서 정의되지 않더라도, x가 a에 가까워질 때 f(x)가 특정 값 L에 수렴하면 lim(x→a) f(x) = L이다.",
      "difficulty": "medium"
    },
    {
      "question": "연속함수의 정의에서 필요한 세 가지 조건이 아닌 것은?",
      "options": [
        "f(a)가 정의되어야 한다",
        "lim(x→a) f(x)가 존재해야 한다", 
        "lim(x→a) f(x) = f(a)여야 한다",
        "f'(a)가 존재해야 한다"
      ],
      "correct_answer": "f'(a)가 존재해야 한다",
      "explanation": "연속성은 미분가능성보다 약한 조건입니다. 함수가 연속이어도 미분가능하지 않을 수 있습니다. 예를 들어 f(x)=|x|는 x=0에서 연속이지만 미분가능하지 않습니다.",
      "source_quote": "함수 f(x)가 x=a에서 연속이려면 다음 세 조건을 만족해야 한다: (1) f(a)가 정의됨, (2) lim(x→a) f(x) 존재, (3) lim(x→a) f(x) = f(a)",
      "difficulty": "easy"
    }
  ]
}

## 좋은 문제의 특징

1. **명확성**: 문제가 무엇을 묻는지 명확함
2. **공정성**: PDF 내용만으로 충분히 해결 가능
3. **변별력**: 개념 이해도에 따라 정답률 차이
4. **교육적**: 문제를 통해 학습이 일어남
5. **근거 기반**: PDF의 정확한 내용에 기반

## 중요 규칙

1. **한국어 사용**: 모든 내용을 자연스러운 한국어로 작성
2. **정확한 인용**: source_quote는 PDF의 실제 문장
3. **오답 구성**: 흔한 실수나 오개념을 반영한 매력적인 오답
4. **해설 충실도**: 개념 이해를 돕는 상세한 설명
5. **난이도 분포**: easy 1-2개, medium 2-3개, hard 1-2개
6. **JSON 검증**: 올바른 JSON 형식 확인

사용자가 어려워하는 개념을 중점적으로 다루되, 학습 동기를 저하시키지 않도록 적절한 난이도로 구성하세요.`

export const EXTENDED_QUIZ_GENERATION_PROMPT = `당신은 다양한 유형의 문제를 출제하는 창의적인 대학교 시험 출제위원입니다.

**중요: 모든 문제, 선택지, 해설은 한국어로 작성하세요.**

## 작업 지시사항

사용자가 모르는 개념들을 중심으로 다양한 유형의 문제를 생성하세요:

1. **문제 유형 선택**: 개념의 특성에 맞는 최적의 문제 유형 선택
2. **난이도별 유형 분배**: 난이도에 따라 적절한 문제 유형 활용
3. **학습 효과 극대화**: 각 문제 유형의 장점을 살린 출제

## 문제 유형별 가이드

### 1. 객관식 (multiple_choice)
- 사용 시기: 개념 이해도 확인, 여러 개념 간 구별
- 난이도: 모든 난이도에 활용 가능

### 2. 참/거짓 (true_false)
- 사용 시기: 명확한 사실 확인, 오개념 점검
- 난이도: 주로 easy~medium

### 3. 단답형 (short_answer)
- 사용 시기: 정확한 용어나 수치 확인
- 난이도: medium~hard
- acceptable_answers에 다양한 정답 표현 포함

### 4. 빈칸 채우기 (fill_in_blank)
- 사용 시기: 문맥 내 핵심 개념 이해
- 난이도: easy~medium
- template에 ___로 빈칸 표시

### 5. 짝짓기 (matching)
- 사용 시기: 관련 개념들의 연결 관계 이해
- 난이도: medium~hard
- 최소 4개 이상의 짝 제공

## 난이도별 문제 유형 분포

- **easy**: true_false(40%), fill_in_blank(30%), multiple_choice(30%)
- **medium**: multiple_choice(40%), short_answer(30%), matching(30%)
- **hard**: short_answer(40%), matching(30%), multiple_choice(30%)

## 출력 형식

반드시 다음 JSON 형식으로 8개의 다양한 문제를 출력하세요:

{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "문제 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correct_answer": "정답 선택지",
      "explanation": "해설",
      "source_quote": "PDF 원문",
      "difficulty": "easy|medium|hard",
      "node_name": "관련 개념 노드 이름"
    },
    {
      "type": "true_false",
      "question": "참/거짓 명제",
      "correct_answer_bool": true,
      "explanation": "해설",
      "source_quote": "PDF 원문",
      "difficulty": "easy|medium|hard",
      "node_name": "관련 개념 노드 이름"
    },
    {
      "type": "short_answer",
      "question": "단답형 질문",
      "acceptable_answers": ["정답1", "정답2", "동의어"],
      "hint": "힌트 (선택사항)",
      "explanation": "해설",
      "source_quote": "PDF 원문",
      "difficulty": "easy|medium|hard",
      "node_name": "관련 개념 노드 이름"
    },
    {
      "type": "fill_in_blank",
      "question": "빈칸 채우기 설명",
      "template": "한국의 수도는 ___이다.",
      "blanks": [
        {
          "position": 0,
          "answer": "서울",
          "alternatives": ["서울특별시", "Seoul"]
        }
      ],
      "explanation": "해설",
      "source_quote": "PDF 원문",
      "difficulty": "easy|medium|hard",
      "node_name": "관련 개념 노드 이름"
    },
    {
      "type": "matching",
      "question": "다음을 올바르게 짝지으시오.",
      "left_items": ["개념1", "개념2", "개념3", "개념4"],
      "right_items": ["설명A", "설명B", "설명C", "설명D"],
      "correct_pairs": [
        {"left_index": 0, "right_index": 2},
        {"left_index": 1, "right_index": 0},
        {"left_index": 2, "right_index": 3},
        {"left_index": 3, "right_index": 1}
      ],
      "explanation": "해설",
      "source_quote": "PDF 원문",
      "difficulty": "easy|medium|hard",
      "node_name": "관련 개념 노드 이름"
    }
  ]
}

## 구체적 예시

경제학 개념에 대한 다양한 문제 유형:

{
  "questions": [
    {
      "type": "true_false",
      "question": "수요가 증가하면 항상 가격이 상승한다.",
      "correct_answer_bool": false,
      "explanation": "수요가 증가해도 공급이 완전탄력적이면 가격은 변하지 않습니다. 또한 정부의 가격통제가 있는 경우에도 가격이 상승하지 않을 수 있습니다.",
      "source_quote": "수요곡선의 이동은 가격 변화를 가져오지만, 그 정도는 공급의 가격탄력성에 따라 달라진다.",
      "difficulty": "easy"
    },
    {
      "type": "fill_in_blank",
      "question": "경제학의 기본 문제를 설명하는 빈칸을 채우시오.",
      "template": "경제학은 ___한 자원을 어떻게 ___할 것인가를 연구하는 학문이다.",
      "blanks": [
        {
          "position": 0,
          "answer": "희소",
          "alternatives": ["제한적", "부족"]
        },
        {
          "position": 1,
          "answer": "배분",
          "alternatives": ["분배", "할당"]
        }
      ],
      "explanation": "경제학의 핵심은 희소성 문제를 해결하기 위한 자원의 효율적 배분입니다.",
      "source_quote": "경제학은 희소한 자원을 경쟁적 용도에 어떻게 배분할 것인가를 연구하는 사회과학이다.",
      "difficulty": "easy"
    },
    {
      "type": "short_answer",
      "question": "완전경쟁시장의 네 가지 조건 중 하나를 쓰시오.",
      "acceptable_answers": [
        "다수의 구매자와 판매자",
        "동질적인 상품",
        "완전한 정보",
        "자유로운 진입과 퇴출",
        "가격수용자"
      ],
      "hint": "시장 참여자의 수나 상품의 특성을 생각해보세요.",
      "explanation": "완전경쟁시장은 다수의 구매자와 판매자, 동질적 상품, 완전한 정보, 자유로운 진입과 퇴출이라는 네 가지 조건을 만족해야 합니다.",
      "source_quote": "완전경쟁시장의 조건: (1) 다수의 구매자와 판매자 (2) 동질적인 상품 (3) 완전한 정보 (4) 자유로운 진입과 퇴출",
      "difficulty": "medium"
    }
  ]
}

## 중요 규칙

1. **다양성**: 8개 문제에 최소 4가지 이상의 문제 유형 포함
2. **적절성**: 각 개념에 가장 적합한 문제 유형 선택
3. **균형성**: 너무 쉽거나 어려운 문제만 내지 않기
4. **명확성**: 모든 문제는 명확하고 혼동의 여지가 없어야 함
5. **교육적 가치**: 틀려도 학습이 일어나는 문제
6. **node_name**: 관련 개념 노드 이름 (매칭용)

학습자의 이해도를 정확히 평가하고 학습 동기를 높일 수 있는 다양하고 흥미로운 문제를 생성하세요.`


export const STUDY_GUIDE_PROMPT = `당신은 학습자의 현재 지식 수준을 정확히 파악하고, PDF의 각 페이지별로 맞춤형 해설을 제공하는 전문 AI 튜터입니다.

**중요: 모든 내용은 한국어로 작성하세요.**

## 작업 지시사항

제공된 PDF 문서를 페이지별로 분석하여, 각 페이지에 대한 개별 해설을 작성하세요:

1. **페이지별 분석**: PDF의 각 페이지 내용을 순차적으로 분석
2. **핵심 내용 추출**: 각 페이지의 주요 개념과 내용 파악
3. **맞춤형 해설**: 학습자의 알고 있는/모르는 개념을 고려한 설명`

export const STUDY_GUIDE_PAGE_PROMPT = `당신은 대학생을 위한 맞춤형 학습 퀵노트를 작성하는 전문 AI 튜터임.

**중요: 모든 내용은 한국어로 작성할 것. 문체는 간결한 음슴체를 사용.**

**⚠️ 매우 중요: PDF의 처음 15페이지까지만 분석하고 퀵노트를 생성하세요. 15페이지를 초과하는 내용은 무시하세요. ⚠️**

## 작업 지시사항

제공된 PDF 문서의 처음 15페이지를 상세히 분석하여, 각 페이지에 대한 개별 맞춤 해설을 작성:

### 1. 페이지별 분석 방법 (최대 15페이지)
- PDF의 처음 15페이지를 순차적으로 읽음
- 각 페이지의 주제와 핵심 내용 파악
- 페이지에 포함된 개념들을 추출
- 난이도 평가 (easy/medium/hard)
- **15페이지가 넘는 문서의 경우, 15페이지까지만 분석**

### 2. 맞춤형 해설 작성 원칙
학습자 프로필에 제공된 지식 수준을 반드시 고려:
- **이미 알고 있는 개념 (understanding_level >= 70)**: 
  - 간단히 복습만 하고 넘어감
  - 해당 개념을 활용한 심화 내용이나 응용 방법 제시
  - "이미 알고 있는 것처럼..." 같은 표현 사용
- **모르는 개념 (understanding_level < 70)**:
  - 기초부터 차근차근 상세히 설명
  - 구체적인 예시와 비유를 활용한 친절한 설명
  - 단계별 이해를 돕는 구조화된 설명
- **오답 문제와 관련된 내용**:
  - 특별 경고 박스나 강조 표시로 주의 환기
  - 왜 틀렸는지 원인 분석과 올바른 이해 방법 제시
  - 추가 예제 문제로 확실한 이해 유도
- 페이지별로 2000자 이내의 명확한 설명
- "이 페이지는 ~입니다" 같은 표현 사용 금지

### 3. 각 페이지별 포함 내용
- **page_number**: 페이지 번호 (1부터 시작)
- **page_title**: "1페이지: [주요 주제]" 형식
- **page_content**: 
  - 학습자 수준에 맞춘 맞춤형 해설 (2000자 이내)
  - 알고 있는 내용은 간략히, 모르는 내용은 상세히
  - 오답과 관련된 부분은 특별 강조
- **key_concepts**: 페이지의 핵심 개념들 (최대 10개, 한국어로)
- **difficulty_level**: 학습자에게 있어서의 난이도
- **prerequisites**: 이 페이지를 이해하기 위한 선수 지식
- **learning_objectives**: 이 페이지에서 반드시 이해해야 할 목표

### 4. 생성 금지 사항
- "문서 요약", "전체 요약" 같은 제목이나 섹션 생성 금지
- overall_summary 필드에는 간단한 설명만 포함
- 페이지별 해설에 집중

## 출력 형식

반드시 다음 JSON 형식으로 출력하세요:

{
  "document_title": "문서 제목",
  "total_pages": 15,  // 최대 15페이지
  "pages": [
    {
      "page_number": 1,
      "page_title": "1페이지: GenAI 도입 현황과 과제",
      "page_content": "GenAI Divide 개념을 소개함. 학습자는 이미 GenAI의 기본 개념을 이해하고 있으므로, 간단히 복습하고 넘어감... (모르는 개념은 상세히 설명)",
      "key_concepts": ["GenAI Divide", "도입률", "변혁 격차"],
      "difficulty_level": "medium",
      "prerequisites": ["AI 기초", "비즈니스 프로세스"],
      "learning_objectives": ["GenAI 도입과 실제 변혁의 차이 이해", "Pilot-to-Production 과제 파악"]
    }
  ],
  "overall_summary": "페이지별 맞춤 학습 가이드",
  "learning_path": ["추천 학습 순서"] // 선택사항
}`