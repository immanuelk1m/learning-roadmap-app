import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { geminiStudyGuidePageModel, prepareFileData } from '@/lib/gemini/client'
import { StudyGuidePageResponse } from '@/lib/gemini/schemas'
import { STUDY_GUIDE_PAGE_PROMPT } from '@/lib/gemini/prompts'
import { parseGeminiResponse, validateResponseStructure, withRetry } from '@/lib/gemini/utils'

export async function POST(request: NextRequest) {
  try {
    const { documentId, userId } = await request.json()

    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Document ID and User ID are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

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

    // O/X quiz logic removed - now using direct selection assessment

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
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdf-documents')
      .download(document.file_path)

    if (downloadError) {
      console.error('Failed to download file for document', documentId, downloadError)
      return NextResponse.json(
        { error: `Failed to download PDF file: ${downloadError.message}` },
        { status: 500 }
      )
    }

    if (!fileData) {
      console.error('No file data received for document', documentId)
      return NextResponse.json(
        { error: 'Failed to download PDF file: No data received' },
        { status: 500 }
      )
    }

    // Upload PDF to Gemini File API
    console.log('Uploading PDF to Gemini File API...')
    const pdfBlob = new Blob([fileData], { type: 'application/pdf' })
    const fileDataPart = await prepareFileData(pdfBlob, 'application/pdf')

    // Direct selection assessment context
    const assessmentContext = `
## 학습 전 배경지식 체크 결과

학습자가 직접 선택한 배경지식 평가 결과를 바탕으로 한 맞춤형 학습 가이드입니다.

**중요**: 학습자가 "모르겠다"고 체크한 개념들을 중점적으로 설명하고,
이미 알고 있는 개념들을 활용하여 새로운 개념을 쉽게 이해할 수 있도록 연결해주세요.
`

    // Generate study guide using Gemini
    const studyGuideContext = unknownConcepts.length > 0 ? `
## 학습자 프로필 분석

**문서:** ${document.title}

**이미 알고 있는 개념 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

**학습이 필요한 개념 (${unknownConcepts.length}개):**
${unknownConcepts.map(c => `- ${c.name}: ${c.description}
  필요한 선수 지식: ${c.prerequisites.length > 0 ? c.prerequisites.join(', ') : '없음'}`).join('\n\n')}

학습자의 현재 상태를 고려하여 맞춤형 학습 퀵노트를 생성하세요. 이미 알고 있는 개념을 활용하여 모르는 개념을 설명하고, 효과적인 학습 전략을 제시하세요.
중요: 생성된 퀵노트 본문에는 이해도 퍼센트 수치를 포함하지 마세요.
` : `
## 학습자 프로필 분석

**문서:** ${document.title}

**완전히 이해하고 있는 개념들 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

축하합니다! 학습자는 이 문서의 모든 핵심 개념을 이미 숙지하고 있습니다.
이제 더 깊이 있는 이해와 실제 활용을 위한 심화 학습 가이드를 제공합니다.
`

    const prompt = `${STUDY_GUIDE_PAGE_PROMPT}\n${studyGuideContext}${assessmentContext}`

    // Add retry logic for Gemini API calls
    const result = await withRetry(async () => {
      return await geminiStudyGuidePageModel.generateContent([
        { inlineData: fileDataPart.inlineData },
        { text: prompt },
      ])
    })
    
    // Gemini API response structure handling - result.text is a getter property
    const responseText = result.response.text()
    
    if (!responseText) {
      console.error('Failed to extract text from Gemini response. Result structure:', {
        response: result.response
      })
      throw new Error('Empty response from Gemini API')
    }
    
    const studyGuideData = parseGeminiResponse<StudyGuidePageResponse>(
      responseText,
      { documentId, responseType: 'study_guide_pages' }
    )
    
    validateResponseStructure(
      studyGuideData,
      ['document_title', 'total_pages', 'pages'],
      { documentId, responseType: 'study_guide_pages' }
    )
    
    // Page data is now stored in study_guide_pages table only

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
          known_concepts: knownConcepts.map(c => c.id),
          unknown_concepts: unknownConcepts.map(c => c.id),
          document_title: studyGuideData.document_title,
          total_pages: studyGuideData.total_pages,
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
          known_concepts: knownConcepts.map(c => c.id),
          unknown_concepts: unknownConcepts.map(c => c.id),
          document_title: studyGuideData.document_title,
          total_pages: studyGuideData.total_pages,
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
        user_id: userId, // Add user_id
        page_number: page.page_number,
        page_title: page.page_title,
        page_content: page.page_content,
        key_concepts: page.key_concepts || [],
        difficulty_level: page.difficulty_level || 'medium', // Add difficulty_level
        prerequisites: page.prerequisites || [],
        learning_objectives: page.learning_objectives || [],
        original_content: page.original_content, // Add original_content
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