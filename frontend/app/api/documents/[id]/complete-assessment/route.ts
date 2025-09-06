import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generatePracticeQuiz } from '@/lib/quiz/actions'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // First, get the document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, knowledge_nodes(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    
    if (docError || !document) {
      console.error('Error fetching document:', docError)
      return NextResponse.json(
        { error: 'Document not found', details: docError?.message },
        { status: 404 }
      )
    }

    // Update assessment_completed status
    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        assessment_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating assessment status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update assessment status', details: updateError.message },
        { status: 500 }
      )
    }

    // Get user's assessment results from knowledge_nodes table
    const nodeIds = document.knowledge_nodes?.map((node: any) => node.id) || []
    
    const { data: assessmentResults, error: assessmentError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('user_id', userId)
      .in('id', nodeIds)
    
    if (assessmentError) {
      console.error('Error fetching assessment results:', assessmentError)
      // Continue even if we can't get assessment results
    }

    // Identify weak nodes (understanding_level < 70)
    const weakNodes = assessmentResults?.filter(
      result => result.understanding_level !== null && result.understanding_level < 70
    ) || []
    
    const strongNodes = assessmentResults?.filter(
      result => result.understanding_level !== null && result.understanding_level >= 70
    ) || []

    console.log('Assessment analysis:', {
      documentId: id,
      totalNodes: nodeIds.length,
      assessedNodes: assessmentResults?.length || 0,
      weakNodes: weakNodes.length,
      strongNodes: strongNodes.length,
      weakNodeIds: weakNodes.map(n => n.id)
    })

    // 🚀 Parallel generation of Study Guide and Practice Quiz based on O/X assessment results
    console.log('📊 Starting parallel generation based on assessment results:', {
      documentId: id,
      totalNodes: nodeIds.length,
      weakNodes: weakNodes.length,
      strongNodes: strongNodes.length,
      timestamp: new Date().toISOString()
    })

    // Update understanding_level to 50 for all knowledge nodes
    console.log('🎯 Setting understanding_level to 50 for all knowledge nodes...')
    const { error: nodesUpdateError } = await supabase
      .from('knowledge_nodes')
      .update({ understanding_level: 50 })
      .in('id', nodeIds)

    if (nodesUpdateError) {
      console.error('❌ Failed to update understanding_level:', nodesUpdateError)
      return NextResponse.json(
        { error: 'Failed to update knowledge nodes understanding level' },
        { status: 500 }
      )
    }

    console.log('✅ Successfully set understanding_level to 50 for', nodeIds.length, 'knowledge nodes')

    // Start parallel generation of study guide and practice quiz
    const parallelStartTime = Date.now()
    const parallelResults = {
      studyGuide: { success: false, error: null },
      practiceQuiz: { success: false, error: null }
    }
    
    // Prepare assessment data for downstream generators
    const assessmentData = {
      weakNodeIds: weakNodes.map(n => n.id),
      strongNodeIds: strongNodes.map(n => n.id),
      assessmentResults: (assessmentResults
        ?.filter(r => r.understanding_level !== null)
        .map(r => ({
          nodeId: r.id,
          understandingLevel: r.understanding_level as number,
          assessmentMethod: (r.assessment_method as string)
        })) || [])
    }

    const parallelPromises = await Promise.allSettled([
      // Generate study guide via internal API
      (async () => {
        try {
          const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://mystduy.vercel.app'
            : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003')

          const res = await fetch(`${baseUrl}/api/study-guide/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-assessment-based': 'true' },
            body: JSON.stringify({ documentId: id, userId, assessmentData })
          })

          if (res.ok) {
            console.log('📚 Study guide generated successfully')
            parallelResults.studyGuide.success = true
            const result = await res.json()
            return { type: 'studyGuide', success: true, result }
          } else {
            const errorText = await res.text()
            console.error('❌ Failed to generate study guide:', errorText)
            parallelResults.studyGuide.error = errorText
            return { type: 'studyGuide', success: false, error: errorText }
          }
        } catch (error: any) {
          console.error('💥 Exception during study guide generation:', error)
          parallelResults.studyGuide.error = error.message
          return { type: 'studyGuide', success: false, error: error.message }
        }
      })(),

      // Generate practice quiz using library function
      (async () => {
        try {
          const result = await generatePracticeQuiz({
            documentIds: [id],
            userId,
            difficulty: 'normal',
            questionCount: 10,
            questionTypes: { multipleChoice: true, shortAnswer: false, trueFalse: false },
            userAssessmentData: assessmentData
          })

          if (result.success) {
            console.log('🎯 Practice quiz generated successfully')
            parallelResults.practiceQuiz.success = true
            return { type: 'practiceQuiz', success: true, result }
          } else {
            console.error('❌ Failed to generate practice quiz:', result.error)
            parallelResults.practiceQuiz.error = result.error
            return { type: 'practiceQuiz', success: false, error: result.error }
          }
        } catch (error: any) {
          console.error('💥 Exception during practice quiz generation:', error)
          parallelResults.practiceQuiz.error = error.message
          return { type: 'practiceQuiz', success: false, error: error.message }
        }
      })()
    ])

    // Log parallel execution results
    const parallelDuration = Date.now() - parallelStartTime
    console.log('🎯 Parallel generation completed:', {
      documentId: id,
      totalDuration: `${parallelDuration}ms`,
      studyGuide: {
        success: parallelResults.studyGuide.success,
        error: parallelResults.studyGuide.error
      },
      practiceQuiz: {
        success: parallelResults.practiceQuiz.success,
        error: parallelResults.practiceQuiz.error
      }
    })

    // Check for critical failures
    let hasQuizQuestions = false
    if (parallelPromises[1].status === 'fulfilled' && parallelPromises[1].value.success) {
      const quizResult = (parallelPromises[1].value as any).result
      hasQuizQuestions = quizResult?.questionsGenerated > 0
    }

    if (!parallelResults.studyGuide.success && !parallelResults.practiceQuiz.success) {
      console.error('🚨 CRITICAL: Both study guide and practice quiz generation failed!')
    } else if (!parallelResults.practiceQuiz.success || !hasQuizQuestions) {
      console.error('⚠️ WARNING: Practice quiz generation failed or no questions created. User may see loading screen.')
    } else if (!parallelResults.studyGuide.success) {
      console.error('⚠️ WARNING: Study guide generation failed. User will have limited study materials.')
    }

    return NextResponse.json({ 
      success: true,
      message: 'Assessment completed successfully',
      stats: {
        totalNodes: nodeIds.length,
        weakNodes: weakNodes.length,
        strongNodes: strongNodes.length,
        studyGuideGenerated: parallelResults.studyGuide.success,
        quizGenerated: parallelResults.practiceQuiz.success && hasQuizQuestions,
        hasQuizQuestions,
        parallelDuration: `${parallelDuration}ms`
      }
    })
  } catch (error: any) {
    console.error('Complete assessment error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
