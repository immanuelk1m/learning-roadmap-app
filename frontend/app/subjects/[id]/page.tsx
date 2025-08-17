'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, BookOpen } from 'lucide-react'
import UploadPDFButton from '@/components/documents/UploadPDFButton'
import DocumentList from '@/components/documents/DocumentList'
import SubjectDetailSkeleton from '@/components/subjects/SubjectDetailSkeleton'
import QuizList from '@/components/quiz/QuizList'
interface Document {
  id: string
  title: string
  status: string
  created_at: string
  subject_id: string
  file_path: string
  file_size: number | null
  page_count: number | null
  assessment_completed: boolean | null
  quiz_generation_status?: {
    generated: boolean
    count: number
    last_attempt?: string
    practice_count?: number
    assessment_count?: number
  }
}

interface SubjectDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function SubjectDetailPage({ params }: SubjectDetailPageProps) {
  const [id, setId] = useState<string | null>(null)
  const [subject, setSubject] = useState<any>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'files' | 'quizzes'>('files')
  const supabase = createClient()
  
  // 고정 사용자 ID 사용
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  // 문서 목록 새로고침 함수
  const refreshDocuments = async () => {
    if (!id) return
    
    console.log('[SubjectDetailPage] Refreshing documents...')
    const { data, error } = await supabase
      .from('documents')
      .select('*, assessment_completed')
      .eq('subject_id', id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[SubjectDetailPage] Error refreshing documents:', error)
    } else if (data) {
      console.log('[SubjectDetailPage] Refreshed documents:', data.length)
      setDocuments(data)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    params.then(p => setId(p.id))
  }, [])

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setLoading(true)
      
      // 과목 정보 조회
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .eq('user_id', FIXED_USER_ID)
        .single()

      if (!subjectData) {
        notFound()
      }

      setSubject(subjectData)
      
      // 문서 목록 조회
      await refreshDocuments()
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading || !subject || !id) {
    return <SubjectDetailSkeleton />
  }

  const completedDocs = documents.filter(doc => doc.status === 'completed').length
  const totalDocs = documents.length
  const progressPercentage = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0

  return (
    <div className="bg-[#f8f8f8] w-full min-h-screen">
      {/* Navigation Header - Same as main page */}
      <div className="fixed bg-white h-[65px] left-0 top-0 w-full z-50 border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto relative h-full">
          {/* Logo and Welcome */}
          <div className="absolute left-[46px] top-6 flex items-center gap-[13px]">
            <div className="text-[#212529] text-[17.398px] font-semibold">
              Commit
            </div>
            <div className="w-px h-[9.5px] border-l border-gray-300"></div>
            <div className="text-[#94aac0] text-[12px] font-normal">
              환영합니다, Taehee님
            </div>
          </div>

          {/* Center Navigation */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-[60px]">
            <Link href="/" className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">Main</Link>
            <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">My Course</span>
            <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">자료별 진행률</span>
            <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">내커밋 한눈에 보기</span>
          </div>

          {/* Profile */}
          <div className="absolute right-[46px] top-2 w-[50px] h-[50px] rounded-[10px] border border-[#e5e5e5] overflow-hidden bg-white">
            <img 
              src="data:image/png;base64,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"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto">
        <div className="pt-[85px] px-[42px]">
          {/* Back Navigation */}
          <div className="mb-4">
            <Link
              href="/subjects"
              className="inline-flex items-center gap-2 text-[#737373] hover:text-[#212529] text-[13px] font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              과목 목록
            </Link>
          </div>
          
          {/* Subject Header Card */}
          <div className="bg-white rounded-[5px] shadow-lg p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Subject Icon */}
                <div 
                  className="w-16 h-16 rounded-[10px] flex items-center justify-center"
                  style={{
                    background: subject.color === '#737373' ? '#2f332f' : subject.color
                  }}
                >
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                
                <div>
                  <h1 className="text-[17px] font-bold text-[#212529]">
                    {subject.name}
                  </h1>
                  {subject.description && (
                    <p className="text-[13px] text-[#737373] mt-1">{subject.description}</p>
                  )}
                  
                  {/* Stats */}
                  <div className="flex gap-4 mt-3">
                    <span className="text-[13px] text-[#737373]">
                      전체 {totalDocs}개
                    </span>
                    <span className="text-[13px] text-[#737373]">
                      완료 {completedDocs}개
                    </span>
                    <span className="text-[13px] font-semibold text-[#2ce477]">
                      {progressPercentage}% 진행
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Upload Button */}
              <div className="flex items-center">
                <UploadPDFButton 
                  subjectId={id} 
                  onUploadSuccess={refreshDocuments}
                />
              </div>
            </div>
            
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-[#737373]">학습 진행도</span>
                <span className="text-[11px] text-[#737373]">
                  {completedDocs}/{totalDocs} 문서
                </span>
              </div>
              <div className="relative h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-[#2ce477] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="bg-white rounded-[5px] shadow-lg overflow-hidden">
            {/* Tab Header */}
            <div className="border-b border-gray-200 bg-white">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`relative px-6 py-4 font-medium text-[14px] transition-all duration-200 ${
                    activeTab === 'files'
                      ? 'bg-[#FFF5E6] text-[#FF8800]'
                      : 'bg-transparent text-[#737373] hover:text-[#212529]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[12px] font-bold ${
                      activeTab === 'files' ? 'bg-[#FF8800] text-white' : 'bg-[#e0e0e0] text-[#737373]'
                    }`}>
                        1
                      </span>
                      <span>모든 파일</span>
                    </div>
                    {activeTab === 'files' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8800]" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('quizzes')}
                    className={`relative px-6 py-4 font-medium text-[14px] transition-all duration-200 ${
                      activeTab === 'quizzes'
                        ? 'bg-[#FFF5E6] text-[#FF8800]'
                        : 'bg-transparent text-[#737373] hover:text-[#212529]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[12px] font-bold ${
                        activeTab === 'quizzes' ? 'bg-[#FF8800] text-white' : 'bg-[#e0e0e0] text-[#737373]'
                      }`}>
                        2
                      </span>
                      <span>내가 생성한 문제집</span>
                    </div>
                    {activeTab === 'quizzes' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF8800]" />
                    )}
                  </button>
                </div>
              </div>
              
              {/* Tab Content */}
              {activeTab === 'files' ? (
                <DocumentList 
                  initialDocuments={documents} 
                  subjectId={id} 
                  refreshTrigger={documents}
                />
              ) : (
                <QuizList 
                  subjectId={id}
                  documents={documents}
                />
              )}
            </div>
          </div>
        </div>
      </div>
  )
}