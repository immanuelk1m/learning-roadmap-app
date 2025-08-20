import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const documentId = searchParams.get('documentId')
  
  const supabase = createServiceClient()
  
  // Get quiz items
  const { data: quizItems, error: quizError } = await supabase
    .from('quiz_items')
    .select('*')
    .eq('document_id', documentId)
    .eq('is_assessment', true)
    .eq('question_type', 'true_false')
  
  // Get knowledge nodes
  const { data: knowledgeNodes, error: nodesError } = await supabase
    .from('knowledge_nodes')
    .select('*')
    .eq('document_id', documentId)
    .limit(10)
  
  // Map quiz items to nodes
  const nodeIds = knowledgeNodes?.map(n => n.id) || []
  const quizMap: Record<string, any> = {}
  
  quizItems?.forEach(item => {
    if (item.node_id) {
      quizMap[item.node_id] = item
    }
  })
  
  const matchedQuizItems = nodeIds.map(nodeId => ({
    nodeId,
    hasQuiz: !!quizMap[nodeId],
    quiz: quizMap[nodeId] || null
  }))
  
  return NextResponse.json({
    documentId,
    totalQuizItems: quizItems?.length || 0,
    totalNodes: knowledgeNodes?.length || 0,
    assessmentNodeIds: nodeIds,
    matchedQuizItems,
    quizError,
    nodesError,
    sampleQuizItems: quizItems?.slice(0, 3),
    sampleNodes: knowledgeNodes?.slice(0, 3)
  })
}