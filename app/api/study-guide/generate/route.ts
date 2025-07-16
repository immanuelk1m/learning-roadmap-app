import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiStudyGuideModel } from '@/lib/gemini/client'
import { StudyGuideResponse } from '@/lib/gemini/schemas'
import { STUDY_GUIDE_PROMPT } from '@/lib/gemini/prompts'
import { parseGeminiResponse, validateResponseStructure } from '@/lib/gemini/utils'

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
    const studyGuideContext = unknownConcepts.length > 0 ? `
## 학습자 프로필 분석

**문서:** ${document.title}

**이미 알고 있는 개념 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

**학습이 필요한 개념 (${unknownConcepts.length}개):**
${unknownConcepts.map(c => `- ${c.name}: ${c.description}
  필요한 선수 지식: ${c.prerequisites.length > 0 ? c.prerequisites.join(', ') : '없음'}`).join('\n\n')}

학습자의 현재 상태를 고려하여 맞춤형 학습 해설집을 생성하세요. 이미 알고 있는 개념을 활용하여 모르는 개념을 설명하고, 효과적인 학습 전략을 제시하세요.
` : `
## 학습자 프로필 분석

**문서:** ${document.title}

**완전히 이해하고 있는 개념들 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

축하합니다! 학습자는 이 문서의 모든 핵심 개념을 이미 숙지하고 있습니다.
이제 더 깊이 있는 이해와 실제 활용을 위한 심화 학습 가이드를 제공합니다.
`

    const prompt = `${STUDY_GUIDE_PROMPT}\n${studyGuideContext}`

    const result = await geminiStudyGuideModel.generateContent({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    })
    
    const response = result.text || ''
    
    if (!response) {
      throw new Error('Empty response from Gemini API')
    }
    
    const studyGuideData = parseGeminiResponse<StudyGuideResponse>(
      response,
      { documentId, responseType: 'study_guide' }
    )
    
    validateResponseStructure(
      studyGuideData,
      ['title', 'sections', 'summary'],
      { documentId, responseType: 'study_guide' }
    )
    
    // Convert structured data to markdown format for storage
    const studyGuideContent = `# ${studyGuideData.title}

${studyGuideData.sections.map(section => `
## ${section.heading}

${section.content}

### 핵심 포인트
${section.key_points.map(point => `- ${point}`).join('\n')}
`).join('\n')}

## 요약
${studyGuideData.summary}

${studyGuideData.references && studyGuideData.references.length > 0 ? `
## 참고자료
${studyGuideData.references.map(ref => `- ${ref}`).join('\n')}
` : ''}`

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