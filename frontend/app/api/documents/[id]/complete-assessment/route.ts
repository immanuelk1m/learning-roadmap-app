import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Use fixed user ID
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // First, get the document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, knowledge_nodes(*)')
      .eq('id', id)
      .eq('user_id', FIXED_USER_ID)
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
      .eq('user_id', FIXED_USER_ID)

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
      .eq('user_id', FIXED_USER_ID)
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

    const parallelStartTime = Date.now()
    const parallelResults = {
      studyGuide: { success: false, error: null as any },
      practiceQuiz: { success: false, error: null as any }
    }

    // Prepare assessment data for both generations
    const assessmentData = {
      weakNodeIds: weakNodes.map(node => node.id),
      strongNodeIds: strongNodes.map(node => node.id),
      assessmentResults: assessmentResults?.map(result => ({
        nodeId: result.id,
        understandingLevel: result.understanding_level,
        assessmentMethod: result.assessment_method
      })) || []
    }

    // Execute Study Guide and Practice Quiz generation in parallel
    const parallelPromises = await Promise.allSettled([
      // 1️⃣ Study Guide Generation (Based on understanding levels)
      (async () => {
        try {
          console.log('📚 Starting Study Guide generation...')
          const studyStartTime = Date.now()
          
          // Fix URL for production environment
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://mystduy.vercel.app'
            : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003')
          
          const studyGuideResponse = await fetch(
            `${baseUrl}/api/study-guide/generate`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-assessment-based': 'true'
              },
              body: JSON.stringify({
                documentId: id,
                userId: FIXED_USER_ID,
                assessmentData // Pass assessment results for customized generation
              })
            }
          )

          if (studyGuideResponse.ok) {
            const result = await studyGuideResponse.json()
            console.log('✅ Study guide generated successfully:', {
              documentId: id,
              studyGuideId: result.studyGuide?.id,
              duration: `${Date.now() - studyStartTime}ms`
            })
            parallelResults.studyGuide.success = true
            return { type: 'studyGuide', success: true, result }
          } else {
            const errorText = await studyGuideResponse.text()
            console.error('❌ Failed to generate study guide:', {
              status: studyGuideResponse.status,
              error: errorText
            })
            parallelResults.studyGuide.error = errorText
            return { type: 'studyGuide', success: false, error: errorText }
          }
        } catch (error: any) {
          console.error('💥 Exception during study guide generation:', error)
          parallelResults.studyGuide.error = error.message
          return { type: 'studyGuide', success: false, error: error.message }
        }
      })(),

      // 2️⃣ Practice Quiz Generation (Customized based on weak nodes)
      (async () => {
        if (nodeIds.length === 0) {
          console.log('⚠️ No nodes available for quiz generation')
          return { type: 'practiceQuiz', success: false, error: 'No nodes available' }
        }

        try {
          console.log('📝 Starting Practice Quiz generation...')
          const quizStartTime = Date.now()

          // Fixed parameters as requested
          const difficulty: 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard' = 'normal'
          const questionCount = 10

          // Fix URL for production environment
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://mystduy.vercel.app'
            : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003')

          const batchGenerateResponse = await fetch(
            `${baseUrl}/api/quiz/batch-generate`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-assessment-based': 'true'
              },
              body: JSON.stringify({
                documentIds: [id],
                difficulty,
                questionCount,
                questionTypes: {
                  multipleChoice: true,
                  shortAnswer: false,
                  trueFalse: false
                },
                userAssessmentData: assessmentData // Focus on weak nodes
              })
            }
          )

          if (batchGenerateResponse.ok) {
            const result = await batchGenerateResponse.json()
            console.log('✅ Practice quiz generated successfully:', {
              documentId: id,
              questionsGenerated: result.questionsGenerated,
              duration: `${Date.now() - quizStartTime}ms`
            })
            
            // Verify questions were actually created
            if (result.questionsGenerated === 0) {
              console.error('⚠️ Quiz generation succeeded but 0 questions were created')
            }
            
            parallelResults.practiceQuiz.success = true
            return { type: 'practiceQuiz', success: true, result }
          } else {
            const errorText = await batchGenerateResponse.text()
            console.error('❌ Failed to generate practice quiz:', {
              status: batchGenerateResponse.status,
              error: errorText
            })
            parallelResults.practiceQuiz.error = errorText
            return { type: 'practiceQuiz', success: false, error: errorText }
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
    if (!parallelResults.studyGuide.success && !parallelResults.practiceQuiz.success) {
      console.error('🚨 CRITICAL: Both study guide and practice quiz generation failed!')
    } else if (!parallelResults.practiceQuiz.success) {
      console.error('⚠️ WARNING: Practice quiz generation failed. User may see loading screen.')
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
        quizGenerated: parallelResults.practiceQuiz.success,
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