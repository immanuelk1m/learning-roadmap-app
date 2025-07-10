import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
  const { doc } = await searchParams
  const supabase = createServiceClient()
  
  // 고정 사용자 ID 사용
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  // 과목 정보 조회
  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .eq('user_id', FIXED_USER_ID)
    .single()

  if (!subject) {
    notFound()
  }

  // 선택된 문서 조회 (있는 경우)
  let selectedDocument = null
  if (doc) {
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', doc)
      .eq('subject_id', id)
      .single()
    selectedDocument = document
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/subjects/${id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {subject.name}로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            학습 모드 - {subject.name}
          </h1>
          {selectedDocument && (
            <p className="text-gray-600 mt-2">
              현재 문서: {selectedDocument.title}
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              AI 학습 도구
            </h2>
          </div>
          <div className="p-6">
            {selectedDocument ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {selectedDocument.title} 학습 중
                </h3>
                <p className="text-gray-500 mb-6">
                  AI가 문서를 분석하여 학습 콘텐츠를 생성하고 있습니다.
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  학습할 문서를 선택하세요
                </h3>
                <p className="text-gray-500 mb-6">
                  과목 페이지에서 학습하고 싶은 PDF 문서를 선택해주세요.
                </p>
                <Link
                  href={`/subjects/${id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  문서 선택하러 가기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}