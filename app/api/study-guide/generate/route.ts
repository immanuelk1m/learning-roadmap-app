import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenAI } from '@google/genai'

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const { documentId, userId } = await request.json()

    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Document ID and User ID are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get knowledge nodes for the document
    const { data: knowledgeNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('document_id', documentId)
      .order('level')

    if (nodesError || !knowledgeNodes || knowledgeNodes.length === 0) {
      return NextResponse.json(
        { error: 'No knowledge nodes found for this document' },
        { status: 404 }
      )
    }

    // Get user's knowledge status
    const { data: userStatus, error: statusError } = await supabase
      .from('user_knowledge_status')
      .select('*')
      .eq('user_id', userId)
      .in('node_id', knowledgeNodes.map(n => n.id))

    if (statusError) {
      return NextResponse.json(
        { error: 'Failed to fetch user knowledge status' },
        { status: 500 }
      )
    }

    // Check assessment completion
    const totalNodes = knowledgeNodes.length
    const assessedNodes = userStatus?.length || 0

    if (assessedNodes === 0) {
      return NextResponse.json({
        error: 'Knowledge assessment not started',
        message: 'Please complete the knowledge assessment first',
        requiresAssessment: true
      }, { status: 400 })
    }

    if (assessedNodes < totalNodes) {
      return NextResponse.json({
        error: 'Knowledge assessment incomplete',
        message: `Please assess all ${totalNodes} concepts. Currently assessed: ${assessedNodes}`,
        requiresAssessment: true,
        progress: { assessed: assessedNodes, total: totalNodes }
      }, { status: 400 })
    }

    // Categorize concepts based on 50 threshold (matching the UI display logic)
    const levelMap = new Map(userStatus?.map(s => [s.node_id, s.understanding_level]) || [])
    const knownConcepts = knowledgeNodes.filter(node => {
      const level = levelMap.get(node.id)
      return level !== undefined && level >= 50
    })
    const unknownConcepts = knowledgeNodes.filter(node => {
      const level = levelMap.get(node.id)
      return level !== undefined && level < 50
    })

    if (unknownConcepts.length === 0) {
      // If all concepts are known, create a summary guide
      console.log('All concepts are known, creating summary guide')
    }

    // Get original document content for context
    const { data: fileData } = await supabase.storage
      .from('pdf-documents')
      .download(document.file_path)

    let documentContent = ''
    if (fileData) {
      documentContent = await fileData.text()
    }

    // Generate study guide using Gemini
    const prompt = unknownConcepts.length > 0 ? `
당신은 학습자의 현재 지식 수준을 정확히 파악하고, 맞춤형 학습 경로를 설계하는 전문 AI 튜터입니다.

**중요: 모든 내용은 한국어로 작성하세요.**

## 학습자 프로필 분석

**문서:** ${document.title}

**이미 알고 있는 개념 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

**학습이 필요한 개념 (${unknownConcepts.length}개):**
${unknownConcepts.map(c => `- ${c.name}: ${c.description}
  필요한 선수 지식: ${c.prerequisites.length > 0 ? c.prerequisites.join(', ') : '없음'}`).join('\n\n')}

## 작업 지시사항

다음 단계에 따라 개인 맞춤 학습 해설집을 작성하세요:

1. **지식 격차 분석**: 알고 있는 개념과 모르는 개념 사이의 연결고리 파악
2. **학습 경로 설계**: 선수 지식을 고려한 최적의 학습 순서 결정
3. **개념 설명 작성**: 이미 아는 개념을 활용한 새로운 개념 설명
4. **연결성 강화**: 개념 간 관계를 명확히 하여 통합적 이해 도모
5. **학습 전략 제시**: 효과적인 학습 방법과 주의사항 안내

## 해설집 형식

마크다운 형식으로 다음 구조를 따라 작성하세요:

# 🎯 개인 맞춤 학습 해설집

## 📊 학습 현황 분석
### 현재 지식 상태
- 잘 알고 있는 영역
- 보완이 필요한 영역
- 학습 우선순위

## 📚 핵심 개념 해설
### [개념명 1]
#### 핵심 내용
- 정의와 의미
- 왜 중요한가?

#### 이미 아는 개념과의 연결
- [알고 있는 개념]과의 관계
- 어떻게 확장되는가?

#### 실제 적용
- 이 개념이 사용되는 상황
- 주의할 점

### [개념명 2]
(위와 동일한 구조로 작성)

## 🔗 개념 네트워크
### 개념 간 관계도
- 상위 개념 → 하위 개념
- 선수 지식 → 후속 개념
- 유사 개념 간 비교

## 🛤️ 학습 로드맵
### 추천 학습 순서
1. 첫 번째 단계: [개념] - [이유]
2. 두 번째 단계: [개념] - [이유]
3. ...

### 학습 팁
- 효과적인 학습 방법
- 자주 하는 실수와 해결법
- 추가 학습 자료 추천

## ✅ 학습 점검 포인트
- 각 개념별 이해도 체크리스트
- 다음 단계로 넘어가기 전 확인사항

## 작성 원칙

1. **개인화**: 학습자가 이미 아는 내용을 적극 활용
2. **단계별**: 쉬운 개념에서 어려운 개념으로 진행
3. **구체성**: 추상적 설명보다 구체적 예시 활용
4. **연결성**: 개념 간 관계를 명확히 표현
5. **실용성**: 실제 적용 가능한 지식 중심
6. **명확성**: 전문 용어는 쉽게 풀어서 설명

학습자의 현재 수준에서 출발하여 목표 지식까지 도달할 수 있는 최적의 경로를 제시하세요.
` : `
당신은 이미 기초 지식을 갖춘 학습자를 위한 심화 학습 전문가입니다.

**중요: 모든 내용은 한국어로 작성하세요.**

## 학습자 프로필 분석

**문서:** ${document.title}

**완전히 이해하고 있는 개념들 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

축하합니다! 학습자는 이 문서의 모든 핵심 개념을 이미 숙지하고 있습니다.
이제 더 깊이 있는 이해와 실제 활용을 위한 심화 학습 가이드를 제공합니다.

## 작업 지시사항

다음 관점에서 심화 학습 해설집을 작성하세요:

1. **통합적 사고**: 개별 개념을 넘어 전체적인 맥락에서 이해
2. **비판적 분석**: 각 개념의 한계와 적용 범위 탐구
3. **창의적 적용**: 새로운 상황에서의 응용 방법 제시
4. **학제간 연결**: 다른 분야와의 연관성 발견
5. **최신 동향**: 해당 분야의 최근 발전 방향 소개

## 해설집 형식

마크다운 형식으로 다음 구조를 따라 작성하세요:

# 🚀 심화 학습 해설집

## 🎓 학습 성취 인정
### 현재 달성 수준
- 마스터한 개념들의 의의
- 이 지식이 열어주는 가능성
- 전문가 수준으로의 도약점

## 🔍 심층 분석
### 개념들의 숨겨진 연결고리
#### [개념 그룹 1] ↔ [개념 그룹 2]
- 표면적 관계를 넘어선 심층적 연관성
- 하나의 변화가 다른 것에 미치는 영향
- 실제 사례에서의 상호작용

### 패러다임과 사고의 틀
- 이 개념들이 형성하는 사고 체계
- 문제 해결 접근법의 변화
- 새로운 관점의 가능성

## 💡 고급 주제 탐구
### 경계를 넘어서
#### 주제 1: [심화 주제명]
- 기존 개념의 확장
- 최신 연구 동향
- 논쟁적 이슈와 다양한 관점

#### 주제 2: [심화 주제명]
- 실무에서의 고급 활용
- 흔한 함정과 해결책
- 전문가들의 접근 방식

## 🌐 학제간 통찰
### 다른 분야와의 융합
- [관련 분야 1]과의 연결점
- [관련 분야 2]에서의 응용
- 융합적 사고의 가치

## 🛠️ 실전 프로젝트 아이디어
### 지식을 행동으로
1. **프로젝트 1**: [구체적 설명]
   - 필요한 개념: [관련 개념들]
   - 예상 난이도와 학습 효과
   
2. **프로젝트 2**: [구체적 설명]
   - 창의적 응용 포인트
   - 확장 가능성

## 📚 다음 단계 학습 경로
### 전문가로 가는 길
#### 경로 1: [전문 분야]
- 추천 학습 자료
- 필요한 추가 역량
- 예상 소요 시간

#### 경로 2: [전문 분야]
- 관련 자격증이나 인증
- 실무 경험 쌓기
- 네트워킹 기회

## 🤔 성찰과 도전 과제
### 깊이 있는 사고를 위한 질문
1. 만약 [가정 상황]이라면, 어떻게 접근하시겠습니까?
2. [개념 A]와 [개념 B]를 결합하여 새로운 해결책을 만든다면?
3. 이 지식을 10년 후에는 어떻게 활용하고 있을까요?

## ⚡ 혁신적 사고
### 패러다임 전환
- 기존 접근법의 한계 극복
- 창의적 문제 해결 사례
- 미래 지향적 관점

## 작성 원칙

1. **도전적**: 안주하지 않고 계속 성장하도록 자극
2. **통찰력**: 표면적 이해를 넘어선 깊이 있는 분석
3. **실용적**: 이론과 실제의 균형
4. **영감**: 더 큰 목표를 향한 동기 부여
5. **연결성**: 다양한 관점과 분야를 아우르는 사고
6. **미래지향**: 변화하는 세상에서의 지식 활용

학습자가 전문가 수준으로 도약할 수 있는 구체적이고 실행 가능한 가이드를 제공하세요.
`

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })
    const studyGuideContent = result.text || ''

    // Save study guide to database
    const { data: studyGuide, error: saveError } = await supabase
      .from('study_guides')
      .upsert({
        user_id: userId,
        document_id: documentId,
        content: studyGuideContent,
        known_concepts: knownConcepts.map(c => c.id),
        unknown_concepts: unknownConcepts.map(c => c.id),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving study guide:', saveError)
      return NextResponse.json(
        { error: 'Failed to save study guide' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      studyGuide
    })

  } catch (error: any) {
    console.error('Study guide generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate study guide', details: error.message },
      { status: 500 }
    )
  }
}