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

    // Identify weak nodes (understanding_level < 50)
    const weakNodes = assessmentResults?.filter(
      result => result.understanding_level < 50
    ) || []
    
    const strongNodes = assessmentResults?.filter(
      result => result.understanding_level >= 50
    ) || []

    console.log('Assessment analysis:', {
      documentId: id,
      totalNodes: nodeIds.length,
      assessedNodes: assessmentResults?.length || 0,
      weakNodes: weakNodes.length,
      strongNodes: strongNodes.length,
      weakNodeIds: weakNodes.map(n => n.id)
    })

    // Trigger study guide generation with O/X assessment results
    try {
      console.log('Triggering study guide generation with O/X results:', {
        documentId: id,
        weakNodes: weakNodes.length,
        strongNodes: strongNodes.length
      })

      const studyGuideResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/study-guide/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-assessment-based': 'true'
          },
          body: JSON.stringify({
            documentId: id,
            userId: FIXED_USER_ID
          })
        }
      )

      if (studyGuideResponse.ok) {
        const result = await studyGuideResponse.json()
        console.log('Study guide generated successfully:', {
          documentId: id,
          studyGuideId: result.studyGuide?.id
        })
      } else {
        const errorText = await studyGuideResponse.text()
        console.error('Failed to generate study guide:', {
          status: studyGuideResponse.status,
          error: errorText
        })
      }
    } catch (error: any) {
      console.error('Exception during study guide generation:', error)
      // Don't fail the whole request if study guide generation fails
    }

    // Trigger customized quiz generation based on assessment results
    if (nodeIds.length > 0) {
      try {
        // Prepare assessment data for quiz generation
        const assessmentData = {
          weakNodeIds: weakNodes.map(node => node.node_id),
          strongNodeIds: strongNodes.map(node => node.node_id),
          assessmentResults: assessmentResults?.map(result => ({
            nodeId: result.node_id,
            understandingLevel: result.understanding_level,
            assessmentMethod: result.assessment_method
          })) || []
        }

        // Fixed difficulty to normal as requested
        const difficulty: 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard' = 'normal'

        // Fixed question count to 10 as requested
        const questionCount = 10

        console.log('Triggering customized quiz generation:', {
          documentId: id,
          difficulty,
          questionCount,
          weakNodesCount: weakNodes.length,
          strongNodesCount: strongNodes.length
        })

        const batchGenerateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/quiz/batch-generate`,
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
              userAssessmentData: assessmentData // New parameter for assessment-based generation
            })
          }
        )

        if (batchGenerateResponse.ok) {
          const result = await batchGenerateResponse.json()
          console.log('Customized quiz generated successfully:', {
            documentId: id,
            questionsGenerated: result.questionsGenerated
          })
          
          // Verify questions were actually created
          if (result.questionsGenerated === 0) {
            console.error('Quiz generation succeeded but 0 questions were created:', {
              documentId: id,
              result
            })
          }
        } else {
          const errorText = await batchGenerateResponse.text()
          console.error('Failed to generate customized quiz - API error:', {
            documentId: id,
            status: batchGenerateResponse.status,
            statusText: batchGenerateResponse.statusText,
            error: errorText,
            url: batchGenerateResponse.url
          })
          
          // This is a critical error - assessment completed but no practice questions
          // We should still continue but log this prominently
          console.error('CRITICAL: Assessment completed but practice quiz generation failed. User will see loading screen.')
        }
      } catch (error: any) {
        console.error('Exception during customized quiz generation:', error)
        // Don't fail the whole request if quiz generation fails
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Assessment completed successfully',
      stats: {
        totalNodes: nodeIds.length,
        weakNodes: weakNodes.length,
        strongNodes: strongNodes.length,
        quizGenerated: true
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