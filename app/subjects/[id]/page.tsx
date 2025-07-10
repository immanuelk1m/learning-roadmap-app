import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Brain, PlayCircle } from 'lucide-react'

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            과목 목록으로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{subject.name}</h1>
          {subject.description && (
            <p className="text-gray-600 mt-2">{subject.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 문서 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  PDF 문서 ({documents?.length || 0})
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {documents && documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {doc.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={`/subjects/${id}/study?doc=${doc.id}`}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                          >
                            <Brain className="h-3 w-3 mr-1" />
                            학습하기
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">업로드된 PDF 문서가 없습니다.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      PDF 파일을 업로드하여 AI 학습을 시작하세요.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                학습 현황
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">총 문서 수</span>
                  <span className="font-medium">{documents?.length || 0}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">학습 진행률</span>
                  <span className="font-medium">0%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                빠른 작업
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF 업로드
                </button>
                <Link
                  href={`/subjects/${id}/study`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  학습 시작
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}