import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiStudyGuidePageModel, uploadFileToGemini } from '@/lib/gemini/client'
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

    // Get user's knowledge status
    const { data: userStatus, error: statusError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .gte('understanding_level', 0)

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
        message: '학습 전 배경지식 체크를 먼저 완료해주세요',
        requiresAssessment: true
      }, { status: 400 })
    }

    if (assessedNodes < totalNodes) {
      return NextResponse.json({
        error: 'Knowledge assessment incomplete',
        message: `배경지식 체크를 완료해주세요. (${assessedNodes}/${totalNodes} 개념 완료)`,
        requiresAssessment: true,
        progress: { assessed: assessedNodes, total: totalNodes }
      }, { status: 400 })
    }

    // Get O/X quiz attempts for detailed feedback
    const { data: quizAttempts, error: attemptsError } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quiz_items!inner(
          id,
          question,
          correct_answer,
          explanation,
          node_id
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

    // Categorize concepts based on 50 threshold (matching the UI display logic)
    const levelMap = new Map(userStatus?.map(s => [s.id, s.understanding_level]) || [])
    const knownConcepts = knowledgeNodes.filter(node => {
      const level = levelMap.get(node.id)
      return level !== undefined && level >= 70  // Changed to match assessment scoring
    })
    const unknownConcepts = knowledgeNodes.filter(node => {
      const level = levelMap.get(node.id)
      return level !== undefined && level < 70  // Changed to match assessment scoring
    })

    if (unknownConcepts.length === 0) {
      // If all concepts are known, create a summary guide
      console.log('All concepts are known, creating summary guide')
    }

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

    // Upload PDF to Gemini File API
    console.log('Uploading PDF to Gemini File API...')
    const pdfBlob = new Blob([fileData], { type: 'application/pdf' })
    const uploadedFile = await uploadFileToGemini(pdfBlob, 'application/pdf')
    console.log('PDF uploaded to Gemini:', uploadedFile.uri)

    // Prepare O/X quiz results for Gemini
    const incorrectQuizzes = quizAttempts?.filter(attempt => !attempt.is_correct) || []
    const correctQuizzes = quizAttempts?.filter(attempt => attempt.is_correct) || []
    
    const oxQuizContext = incorrectQuizzes.length > 0 ? `

## O/X 평가 결과 분석

**총 ${quizAttempts?.length || 0}문제 중 ${correctQuizzes.length}개 정답, ${incorrectQuizzes.length}개 오답**

### 오답 문제 상세 (특별 주의 필요)
${incorrectQuizzes.map(attempt => {
  const nodeInfo = knowledgeNodes.find(n => n.id === attempt.quiz_items?.node_id)
  return `
**문제**: ${attempt.quiz_items?.question}
- 관련 개념: ${nodeInfo?.name || '알 수 없음'}
- 사용자 답: ${attempt.user_answer}
- 정답: ${attempt.quiz_items?.correct_answer}
- 해설: ${attempt.quiz_items?.explanation || ''}
`
}).join('\n')}

### 정답 문제 (간단 복습)
${correctQuizzes.slice(0, 5).map(attempt => 
  `- ${attempt.quiz_items?.question} (정답: ${attempt.quiz_items?.correct_answer})`
).join('\n')}

**중요**: 각 페이지 해설 시, 오답 문제와 관련된 내용이 나오면 특별히 강조하고, 
왜 틀렸는지 상세히 설명하며, 올바른 이해를 위한 추가 예시를 제공하세요.
` : ''

    // Generate study guide using Gemini
    const studyGuideContext = unknownConcepts.length > 0 ? `
## 학습자 프로필 분석

**문서:** ${document.title}

**이미 알고 있는 개념 (${knownConcepts.length}개, understanding_level >= 70):**
${knownConcepts.map(c => {
  const level = levelMap.get(c.id) || 0
  return `- ${c.name} (이해도: ${level}%): ${c.description}`
}).join('\n')}

**학습이 필요한 개념 (${unknownConcepts.length}개, understanding_level < 70):**
${unknownConcepts.map(c => {
  const level = levelMap.get(c.id) || 0
  return `- ${c.name} (이해도: ${level}%): ${c.description}
  필요한 선수 지식: ${c.prerequisites.length > 0 ? c.prerequisites.join(', ') : '없음'}`
}).join('\n\n')}

학습자의 현재 상태를 고려하여 맞춤형 학습 퀵노트를 생성하세요. 이미 알고 있는 개념을 활용하여 모르는 개념을 설명하고, 효과적인 학습 전략을 제시하세요.
` : `
## 학습자 프로필 분석

**문서:** ${document.title}

**완전히 이해하고 있는 개념들 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

축하합니다! 학습자는 이 문서의 모든 핵심 개념을 이미 숙지하고 있습니다.
이제 더 깊이 있는 이해와 실제 활용을 위한 심화 학습 가이드를 제공합니다.
`

    const prompt = `${STUDY_GUIDE_PAGE_PROMPT}\n${studyGuideContext}${oxQuizContext}`

    const result = await geminiStudyGuidePageModel.generateContent({
      contents: [
        {
          parts: [
            {
              fileData: {
                fileUri: uploadedFile.uri,
                mimeType: uploadedFile.mimeType || 'application/pdf',
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
      ['document_title', 'total_pages', 'pages'],
      { documentId, responseType: 'study_guide_pages' }
    )
    
    // Create overall summary from page data
    const overallSummary = studyGuideData.overall_summary || 
      `${document.title}에 대한 페이지별 맞춤 퀵노트입니다. 총 ${studyGuideData.total_pages}페이지로 구성되어 있습니다.`

    // Check if study guide already exists
    const { data: existingGuide } = await supabase
      .from('study_guides')
      .select('id')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .single()
    
    let studyGuide
    let saveError
    
    if (existingGuide) {
      // Delete existing pages first
      await supabase
        .from('study_guide_pages')
        .delete()
        .eq('study_guide_id', existingGuide.id)
      
      // Update existing study guide
      const { data, error } = await supabase
        .from('study_guides')
        .update({
          content: overallSummary,
          known_concepts: knownConcepts.map(c => c.id),
          unknown_concepts: unknownConcepts.map(c => c.id),
          document_title: studyGuideData.document_title,
          total_pages: studyGuideData.total_pages,
          overall_summary: overallSummary,
          generation_method: 'pages',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingGuide.id)
        .select()
        .single()
      
      studyGuide = data
      saveError = error
    } else {
      // Insert new study guide
      const { data, error } = await supabase
        .from('study_guides')
        .insert({
          user_id: userId,
          document_id: documentId,
          content: overallSummary,
          known_concepts: knownConcepts.map(c => c.id),
          unknown_concepts: unknownConcepts.map(c => c.id),
          document_title: studyGuideData.document_title,
          total_pages: studyGuideData.total_pages,
          overall_summary: overallSummary,
          generation_method: 'pages'
        })
        .select()
        .single()
      
      studyGuide = data
      saveError = error
    }

    if (saveError) {
      console.error('Error saving study guide:', saveError)
      return NextResponse.json(
        { error: 'Failed to save study guide' },
        { status: 500 }
      )
    }

    // Save individual pages
    if (studyGuide && studyGuideData.pages) {
      const pagesData = studyGuideData.pages.map(page => ({
        study_guide_id: studyGuide.id,
        page_number: page.page_number,
        page_title: page.page_title,
        page_content: page.page_content,
        key_concepts: page.key_concepts || [],
        difficulty_level: page.difficulty_level || 'medium',
        prerequisites: page.prerequisites || [],
        learning_objectives: page.learning_objectives || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { error: pagesError } = await supabase
        .from('study_guide_pages')
        .insert(pagesData)

      if (pagesError) {
        console.error('Error saving study guide pages:', pagesError)
        // Don't fail the whole operation if pages fail to save
      } else {
        console.log(`Successfully saved ${pagesData.length} study guide pages`)
      }
    }

    return NextResponse.json({
      success: true,
      studyGuide,
      pagesCount: studyGuideData.pages?.length || 0
    })

  } catch (error: any) {
    console.error('Study guide generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate study guide', details: error.message },
      { status: 500 }
    )
  }
}