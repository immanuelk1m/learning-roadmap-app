import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AllQuestionsView from '@/components/quiz/AllQuestionsView'

interface QuizPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    doc?: string
  }>
}

export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const { id } = await params
  const { doc: documentId } = await searchParams
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id
  if (!userId) notFound()

  // Get subject info
  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId!)
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
      redirect(`/subjects/${id}/quiz?doc=${documents[0].id}`)
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

  // Get knowledge nodes for the document
  const { data: knowledgeNodes } = selectedDocumentId
    ? await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('document_id', selectedDocumentId)
        .order('level')
        .order('position')
    : { data: [] }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header removed: NavigationBar will show centered title on quiz page */}

      {!document ? (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-4">분석이 완료된 문서가 없습니다.</p>
          <Link
            href={`/subjects/${id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            문서 업로드하기
          </Link>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <AllQuestionsView
            documentId={document.id}
            subjectId={id}
          />
        </div>
      )}
    </div>
  )
}
