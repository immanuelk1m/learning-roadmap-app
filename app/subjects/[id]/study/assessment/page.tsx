import { createServiceClient } from '@/lib/supabase/service'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import KnowledgeAssessment from '@/components/study/KnowledgeAssessment'

interface AssessmentPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    doc: string
  }>
}

export default async function AssessmentPage({ params, searchParams }: AssessmentPageProps) {
  const { id } = await params
  const { doc: documentId } = await searchParams
  const supabase = createServiceClient()
  
  // Use fixed user ID
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  if (!documentId) {
    redirect(`/subjects/${id}`)
  }

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

  // Get document info
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('subject_id', id)
    .single()

  if (!document || document.status !== 'completed') {
    redirect(`/subjects/${id}`)
  }

  // Get knowledge nodes sorted by level (higher level = easier concepts)
  const { data: knowledgeNodes } = await supabase
    .from('knowledge_nodes')
    .select('*')
    .eq('document_id', documentId)
    .order('level', { ascending: false })
    .order('position')

  if (!knowledgeNodes || knowledgeNodes.length === 0) {
    redirect(`/subjects/${id}`)
  }

  // Check if user already has assessments
  const { data: existingStatus } = await supabase
    .from('user_knowledge_status')
    .select('*')
    .eq('user_id', FIXED_USER_ID)
    .in('node_id', knowledgeNodes.map(n => n.id))

  // If already assessed, go to study page
  if (existingStatus && existingStatus.length > 0) {
    redirect(`/subjects/${id}/study?doc=${documentId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href={`/subjects/${id}`}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                과목으로 돌아가기
              </Link>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-lg font-semibold text-gray-900">{subject.name}</h1>
                <p className="text-sm text-gray-600">지식 평가</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Component */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            학습 전 지식 평가
          </h2>
          <p className="text-gray-600">
            각 개념에 대해 알고 있는지 평가해주세요. 
            쉬운 개념부터 어려운 개념 순으로 진행됩니다.
          </p>
        </div>

        <KnowledgeAssessment
          nodes={knowledgeNodes}
          subjectId={id}
          documentId={documentId}
        />
      </div>
    </div>
  )
}