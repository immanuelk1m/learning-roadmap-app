import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, BookOpen } from 'lucide-react'
import UploadPDFButton from '@/components/documents/UploadPDFButton'
import DocumentList from '@/components/documents/DocumentList'

interface SubjectDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function SubjectDetailPage({ params }: SubjectDetailPageProps) {
  const { id } = await params
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

  // 문서 목록 조회
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('subject_id', id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            과목 목록으로 돌아가기
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{subject.name}</h1>
              {subject.description && (
                <p className="text-lg text-gray-600">{subject.description}</p>
              )}
            </div>
            <div className="hidden sm:block">
              <BookOpen className="h-12 w-12 text-neutral-500 opacity-20" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-8 w-8 text-neutral-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF 업로드</h3>
                <p className="text-gray-600 mb-6">학습할 PDF 문서를 업로드하세요</p>
                <UploadPDFButton subjectId={id} />
              </div>
            </div>

            {/* Documents List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  업로드된 문서
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({documents?.length || 0}개)
                  </span>
                </h2>
              </div>
              <DocumentList 
                initialDocuments={documents || []} 
                subjectId={id} 
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Study Statistics */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                학습 통계
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm text-gray-600">총 문서</span>
                    <span className="text-2xl font-semibold text-gray-900">{documents?.length || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-neutral-800 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">학습 완료</span>
                    <span className="font-medium text-gray-900">0개</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">학습 중</span>
                    <span className="font-medium text-gray-900">0개</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-br from-neutral-50 to-gray-50 rounded-2xl p-6 border border-neutral-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                💡 학습 팁
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-neutral-600 mr-2">•</span>
                  <span>PDF 문서를 업로드하면 AI가 내용을 분석합니다</span>
                </li>
                <li className="flex items-start">
                  <span className="text-neutral-600 mr-2">•</span>
                  <span>각 문서별로 학습 진도를 추적할 수 있습니다</span>
                </li>
                <li className="flex items-start">
                  <span className="text-neutral-600 mr-2">•</span>
                  <span>질문과 답변을 통해 효과적으로 학습하세요</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}