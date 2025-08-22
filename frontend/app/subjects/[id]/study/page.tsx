import { createServiceClient } from '@/lib/supabase/service'
import { notFound, redirect } from 'next/navigation'
import StudyPageClient from '@/components/study/StudyPageClient'

interface StudyPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    doc?: string
  }>
}

export default async function StudyPage({ params, searchParams }: StudyPageProps) {
  const { id } = await params
  const { doc: documentId } = await searchParams
  const supabase = createServiceClient()
  
  // Use fixed user ID
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  // Get subject info
  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .eq('user_id', FIXED_USER_ID)
    .single()

  if (!subject) {
    notFound()
  }

  // If no document ID provided, get the first completed document
  let selectedDocumentId = documentId
  if (!selectedDocumentId) {
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('subject_id', id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (documents && documents.length > 0) {
      redirect(`/subjects/${id}/study?doc=${documents[0].id}`)
    }
  }

  // Get document info
  const { data: document } = selectedDocumentId
    ? await supabase
        .from('documents')
        .select('*')
        .eq('id', selectedDocumentId)
        .eq('subject_id', id)
        .single()
    : { data: null }

  // Get knowledge nodes for the document (includes understanding_level)
  const { data: knowledgeNodes } = selectedDocumentId
    ? await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('document_id', selectedDocumentId)
        .order('level')
        .order('position')
    : { data: [] }

  // Convert knowledge nodes understanding_level to userStatus format
  const userStatus = knowledgeNodes?.map(node => ({
    node_id: node.id,
    understanding_level: node.understanding_level || 0
  })) || []

  // Check if study guide exists
  const { data: studyGuide } = selectedDocumentId
    ? await supabase
        .from('study_guides')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .eq('document_id', selectedDocumentId)
        .single()
    : { data: null }

  // Check if O/X assessment is completed
  if (selectedDocumentId && knowledgeNodes && knowledgeNodes.length > 0) {
    // Get O/X quiz items using the same query pattern as OXKnowledgeAssessment
    const nodeIds = knowledgeNodes.map(n => n.id)
    const { data: oxQuizItems } = await supabase
      .from('quiz_items')
      .select('id')
      .in('node_id', nodeIds)
      .eq('is_assessment', true)
      .eq('question_type', 'true_false')

    if (oxQuizItems && oxQuizItems.length > 0) {
      // Check if user has attempted all O/X questions
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_item_id')
        .eq('user_id', FIXED_USER_ID)
        .in('quiz_item_id', oxQuizItems.map(q => q.id))

      // If no questions attempted at all, redirect to assessment
      // O/X assessment is a one-time process after PDF upload
      if (!attempts || attempts.length === 0) {
        redirect(`/subjects/${id}/study/assessment?doc=${selectedDocumentId}`)
      }
    }
  }

  return (
    <StudyPageClient
      subject={subject}
      document={document}
      knowledgeNodes={knowledgeNodes || []}
      userStatus={userStatus}
      studyGuide={studyGuide}
      subjectId={id}
      documentId={selectedDocumentId || ''}
      userId={FIXED_USER_ID}
    />
  )
}