import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy, Target, TrendingUp, TreePine } from 'lucide-react'
import KnowledgeTreeView from '@/components/study/KnowledgeTreeView'

interface QuizResultPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    doc?: string
    score?: string
    total?: string
  }>
}

export default async function QuizResultPage({ params, searchParams }: QuizResultPageProps) {
  const { id } = await params
  const { doc: documentId, score = '0', total = '0' } = await searchParams
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

  // Get document info
  const { data: document } = documentId
    ? await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('subject_id', id)
        .single()
    : { data: null }

  if (!document) {
    notFound()
  }

  // Get knowledge nodes for the document
  const { data: knowledgeNodes } = await supabase
    .from('knowledge_nodes')
    .select('*')
    .eq('document_id', documentId)
    .order('level')
    .order('position')

  // Get user's updated knowledge status
  const { data: userStatus } = await supabase
    .from('user_knowledge_status')
    .select('*')
    .eq('user_id', FIXED_USER_ID)
    .in('node_id', knowledgeNodes?.map(n => n.id) || [])

  const scoreNumber = parseInt(score)
  const totalNumber = parseInt(total)
  const percentage = totalNumber > 0 ? Math.round((scoreNumber / totalNumber) * 100) : 0

  // Calculate knowledge improvement
  const knownNodes = userStatus?.filter(s => s.understanding_level >= 70).length || 0
  const totalNodes = knowledgeNodes?.length || 0
  const knowledgePercentage = totalNodes > 0 ? Math.round((knownNodes / totalNodes) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href={`/subjects/${id}/study?doc=${documentId}`}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                학습으로 돌아가기
              </Link>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-lg font-semibold text-gray-900">{subject.name}</h1>
                <p className="text-sm text-gray-600">{document.title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Result Summary */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
          <div className="text-center mb-8">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-2">퀴즈 완료!</h2>
            <p className="text-gray-600">문제 풀이를 통해 지식을 강화했습니다</p>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">문제 점수</p>
              <p className="text-2xl font-bold text-gray-900">{scoreNumber}/{totalNumber}</p>
              <p className="text-sm text-blue-600 font-medium">{percentage}%</p>
            </div>

            <div className="bg-green-50 rounded-lg p-6 text-center">
              <TreePine className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">지식 트리 완성도</p>
              <p className="text-2xl font-bold text-gray-900">{knownNodes}/{totalNodes}</p>
              <p className="text-sm text-green-600 font-medium">{knowledgePercentage}%</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-6 text-center">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">개선된 개념</p>
              <p className="text-2xl font-bold text-gray-900">
                {userStatus?.filter(s => s.assessment_method === 'quiz' && s.understanding_level >= 70).length || 0}개
              </p>
              <p className="text-sm text-purple-600 font-medium">퀴즈로 학습 완료</p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Link
              href={`/subjects/${id}/study?doc=${documentId}`}
              className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              학습으로 돌아가기
            </Link>
            <Link
              href={`/subjects/${id}/quiz?doc=${documentId}`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Target className="h-4 w-4 mr-2" />
              다시 풀어보기
            </Link>
          </div>
        </div>

        {/* Updated Knowledge Tree */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              업데이트된 지식 트리
            </h3>
            <p className="text-gray-600 mb-4">
              퀴즈를 통해 개선된 지식 상태를 확인하세요
            </p>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>아는 개념: {knownNodes}개</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>모르는 개념: {totalNodes - knownNodes}개</span>
              </div>
            </div>
          </div>
          
          {knowledgeNodes && knowledgeNodes.length > 0 ? (
            <KnowledgeTreeView
              nodes={knowledgeNodes}
              userStatus={userStatus || []}
              documentId={documentId || ''}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              지식 트리를 불러오는 중...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}