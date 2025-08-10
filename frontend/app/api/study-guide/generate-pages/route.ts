import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiStudyGuidePageModel } from '@/lib/gemini/client'
import { StudyGuidePageResponse } from '@/lib/gemini/schemas'
import { STUDY_GUIDE_PAGE_PROMPT } from '@/lib/gemini/prompts'
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

    // Get user's knowledge status (using knowledge_nodes table now)
    const { data: userNodes, error: statusError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)

    if (statusError) {
      return NextResponse.json(
        { error: 'Failed to fetch user knowledge status' },
        { status: 500 }
      )
    }

    // Check assessment completion
    const totalNodes = knowledgeNodes.length
    const assessedNodes = userNodes?.filter(n => n.understanding_level !== null).length || 0

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

    // Get O/X quiz attempts for detailed feedback
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quiz_items!inner(
          id,
          question,
          correct_answer,
          explanation,
          node_id,
          page_reference
        )
      `)
      .eq('user_id', userId)
      .in('quiz_item_id', 
        await supabase
          .from('quiz_items')
          .select('id')
          .eq('document_id', documentId)
          .eq('is_assessment', true)
          .then(res => res.data?.map(item => item.id) || [])
      )

    // Categorize concepts based on 50 threshold
    const knownConcepts = userNodes?.filter(node => node.understanding_level >= 50) || []
    const unknownConcepts = userNodes?.filter(node => node.understanding_level < 50) || []

    // Get original document content for context
    const { data: fileData } = await supabase.storage
      .from('pdf-documents')
      .download(document.file_path)

    if (!fileData) {
      return NextResponse.json(
        { error: 'Failed to download PDF file' },
        { status: 500 }
      )
    }

    // Convert PDF to base64 for Gemini
    console.log('Converting PDF to base64...')
    const base64Data = await fileData.arrayBuffer().then((buffer) =>
      Buffer.from(buffer).toString('base64')
    )
    console.log(`PDF converted to base64, size: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`)

    // Prepare context for page-by-page analysis
    const incorrectQuizzes = quizAttempts?.filter(attempt => !attempt.is_correct) || []
    const correctQuizzes = quizAttempts?.filter(attempt => attempt.is_correct) || []
    
    const oxQuizContext = incorrectQuizzes.length > 0 ? `
## O/X 평가 결과 분석

**총 ${quizAttempts?.length || 0}문제 중 ${correctQuizzes.length}개 정답, ${incorrectQuizzes.length}개 오답**

### 오답 문제 상세 (페이지별 해설에 반영 필요)
${incorrectQuizzes.map(attempt => {
  const nodeInfo = knowledgeNodes.find(n => n.id === attempt.quiz_items?.node_id)
  return `
**문제**: ${attempt.quiz_items?.question}
- 관련 개념: ${nodeInfo?.name || '알 수 없음'}
- 페이지 참조: ${attempt.quiz_items?.page_reference ? `${attempt.quiz_items.page_reference}페이지` : '페이지 정보 없음'}
- 사용자 답: ${attempt.user_answer}
- 정답: ${attempt.quiz_items?.correct_answer}
- 해설: ${attempt.quiz_items?.explanation || ''}
`
}).join('\n')}

**중요**: 각 페이지 해설 시, 해당 페이지와 관련된 오답 문제가 있다면 특별히 강조하고 상세히 설명하세요.
` : ''

    // Generate page-by-page study guide using Gemini
    const studyGuideContext = `
## 학습자 프로필 분석

**문서:** ${document.title}
**전체 페이지 수:** ${document.page_count || '알 수 없음'}

**이미 알고 있는 개념 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

**학습이 필요한 개념 (${unknownConcepts.length}개):**
${unknownConcepts.map(c => `- ${c.name}: ${c.description}
  필요한 선수 지식: ${c.prerequisites?.length > 0 ? c.prerequisites.join(', ') : '없음'}`).join('\n\n')}

## 페이지별 해설 작성 지침

1. PDF의 각 페이지를 개별적으로 분석
2. 각 페이지마다 맞춤형 해설 작성
3. 학습자가 모르는 개념이 나오는 페이지는 더 상세하게 설명
4. 학습자가 아는 개념이 나오는 페이지는 응용과 심화 위주로 설명
5. 페이지별로 난이도를 평가하고 학습 목표를 명시

${oxQuizContext}`

    const prompt = `${STUDY_GUIDE_PAGE_PROMPT}\n${studyGuideContext}`

    const result = await geminiStudyGuidePageModel.generateContent({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Data,
              },
            },
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
    
    const studyGuideData = parseGeminiResponse<StudyGuidePageResponse>(
      response,
      { documentId, responseType: 'study_guide_pages' }
    )
    
    validateResponseStructure(
      studyGuideData,
      ['document_title', 'total_pages', 'pages', 'overall_summary'],
      { documentId, responseType: 'study_guide_pages' }
    )
    
    // Start transaction to save study guide and pages
    const { data: studyGuide, error: guideError } = await supabase
      .from('study_guides')
      .upsert({
        user_id: userId,
        document_id: documentId,
        document_title: studyGuideData.document_title,
        total_pages: studyGuideData.total_pages,
        overall_summary: studyGuideData.overall_summary,
        generation_method: 'pages',
        known_concepts: knownConcepts.map(c => c.id),
        unknown_concepts: unknownConcepts.map(c => c.id),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (guideError) {
      console.error('Error saving study guide:', guideError)
      return NextResponse.json(
        { error: 'Failed to save study guide' },
        { status: 500 }
      )
    }

    // Delete existing pages if any
    await supabase
      .from('study_guide_pages')
      .delete()
      .eq('study_guide_id', studyGuide.id)

    // Save individual pages
    const pagesToInsert = studyGuideData.pages.map(page => ({
      study_guide_id: studyGuide.id,
      page_number: page.page_number,
      page_title: page.page_title,
      page_content: page.page_content,
      key_concepts: page.key_concepts,
      difficulty_level: page.difficulty_level,
      prerequisites: page.prerequisites,
      learning_objectives: page.learning_objectives,
      original_content: page.original_content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: pagesError } = await supabase
      .from('study_guide_pages')
      .insert(pagesToInsert)

    if (pagesError) {
      console.error('Error saving study guide pages:', pagesError)
      return NextResponse.json(
        { error: 'Failed to save study guide pages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      studyGuide: {
        ...studyGuide,
        pages: studyGuideData.pages,
        learning_path: studyGuideData.learning_path
      }
    })

  } catch (error: any) {
    console.error('Study guide page generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate study guide pages', details: error.message },
      { status: 500 }
    )
  }
}