import { createServiceClient } from '@/lib/supabase/service'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import KnowledgeTreeView from '@/components/study/KnowledgeTreeView'
import PDFViewer from '@/components/study/PDFViewer'
import StudyTabs from '@/components/study/StudyTabs'
import StudyGuide from '@/components/study/StudyGuide'

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

  // Get knowledge nodes for the document
  const { data: knowledgeNodes } = selectedDocumentId
    ? await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('document_id', selectedDocumentId)
        .order('level')
        .order('position')
    : { data: [] }

  // Get user knowledge status
  const { data: userStatus } = selectedDocumentId
    ? await supabase
        .from('user_knowledge_status')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .in('node_id', knowledgeNodes?.map(n => n.id) || [])
    : { data: [] }

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

      // If not enough questions attempted (less than 80%), redirect to assessment
      const completionRate = attempts ? attempts.length / oxQuizItems.length : 0
      if (completionRate < 0.8) {
        redirect(`/subjects/${id}/study/assessment?doc=${selectedDocumentId}`)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                {document && (
                  <p className="text-sm text-gray-600">{document.title}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
        <div className="flex h-[calc(100vh-73px)]">
          {/* Left: PDF Viewer */}
          <div className="w-1/2 bg-white border-r border-gray-200">
            <PDFViewer documentId={document.id} filePath={document.file_path} />
          </div>

          {/* Right: Tabbed Content */}
          <div className="w-1/2 bg-gray-50">
            <StudyTabs
              hasStudyGuide={!!studyGuide}
              subjectId={id}
              documentId={document.id}
              knowledgeTreeContent={
                <div className="h-full overflow-auto">
                  <div className="p-6">
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-3">
                        지식 트리
                      </h2>
                      {userStatus && userStatus.length > 0 && (
                        <div className="flex gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span>아는 개념: {userStatus.filter(s => s.understanding_level >= 50).length}개</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span>모르는 개념: {userStatus.filter(s => s.understanding_level < 50).length}개</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {knowledgeNodes && knowledgeNodes.length > 0 ? (
                      <KnowledgeTreeView
                        nodes={knowledgeNodes}
                        userStatus={userStatus || []}
                        documentId={document.id}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        AI가 문서를 분석 중입니다...
                      </div>
                    )}
                  </div>
                </div>
              }
              studyGuideContent={
                <StudyGuide
                  documentId={document.id}
                  userId={FIXED_USER_ID}
                />
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}