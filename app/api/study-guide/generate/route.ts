import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

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

    // Categorize concepts
    const statusMap = new Map(userStatus?.map(s => [s.node_id, s.status]) || [])
    const knownConcepts = knowledgeNodes.filter(node => statusMap.get(node.id) === 'known')
    const unknownConcepts = knowledgeNodes.filter(node => statusMap.get(node.id) === 'unknown')

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
당신은 개인 맞춤 학습 해설집을 만드는 AI 튜터입니다. 
다음 정보를 바탕으로 학습자에게 최적화된 해설집을 생성해주세요.

**문서 제목:** ${document.title}

**학습자가 이미 알고 있는 개념들:**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

**학습자가 모르는 개념들 (학습 필요):**
${unknownConcepts.map(c => `- ${c.name}: ${c.description}\n  선수 지식: ${c.prerequisites.join(', ')}`).join('\n\n')}

**해설집 작성 가이드라인:**
1. 학습자가 이미 알고 있는 개념들을 기반으로 설명하세요
2. 모르는 개념들을 난이도 순으로 정리하여 체계적으로 설명하세요
3. 각 개념의 핵심 내용, 실제 적용 예시, 연관 개념들을 포함하세요
4. 한국어로 작성하고, 이해하기 쉽게 설명하세요
5. 마크다운 형식으로 구조화하세요

**생성할 해설집 구조:**
# 개인 맞춤 학습 해설집

## 학습 개요
- 이미 알고 있는 개념들 활용 방법
- 학습해야 할 개념들의 전체적인 구조

## 핵심 개념 해설
(모르는 개념들을 쉬운 것부터 어려운 것 순으로 상세 설명)

## 학습 로드맵
(효율적인 학습 순서 제안)

## 연습 문제 및 적용
(개념 이해를 위한 실습 제안)

위 가이드라인에 따라 체계적이고 개인화된 해설집을 생성해주세요.
` : `
당신은 개인 맞춤 학습 해설집을 만드는 AI 튜터입니다. 
학습자가 모든 개념을 이미 알고 있다고 평가했습니다. 이런 경우를 위한 심화 학습 해설집을 생성해주세요.

**문서 제목:** ${document.title}

**학습자가 알고 있는 모든 개념들:**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

**해설집 작성 가이드라인:**
1. 기존 지식을 바탕으로 한 심화 학습 내용을 제공하세요
2. 개념들 간의 연관성과 상호작용을 설명하세요
3. 실무 적용 사례와 고급 활용법을 포함하세요
4. 추가 학습 방향과 발전된 주제들을 제안하세요
5. 한국어로 작성하고, 마크다운 형식으로 구조화하세요

**생성할 해설집 구조:**
# 심화 학습 해설집

## 개념 연관성 분석
- 각 개념들이 어떻게 연결되어 있는지 설명

## 실무 적용 및 사례
- 실제 상황에서의 적용 방법과 사례

## 심화 학습 주제
- 더 깊이 있는 학습을 위한 고급 주제들

## 추천 학습 방향
- 다음 단계 학습을 위한 방향 제시

위 가이드라인에 따라 심화 학습용 해설집을 생성해주세요.
`

    const result = await model.generateContent(prompt)
    const studyGuideContent = result.response.text()

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