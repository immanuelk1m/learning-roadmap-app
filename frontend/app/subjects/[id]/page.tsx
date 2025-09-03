'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { notFound } from 'next/navigation'
import { Upload, BookOpen } from 'lucide-react'
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
  
  const [userId, setUserId] = useState<string | null>(null)

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
      // Ensure status is never null and quiz_generation_status is properly typed
      const normalizedDocs = data.map(doc => ({
        ...doc,
        status: doc.status || 'pending',
        quiz_generation_status: doc.quiz_generation_status as { 
          generated: boolean; 
          count: number; 
          last_attempt?: string;
          practice_count?: number;
          assessment_count?: number;
        } | undefined
      }))
      setDocuments(normalizedDocs)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    params.then(p => setId(p.id))
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
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
        .eq('user_id', userId!)
        .single()

      if (!subjectData) {
        notFound()
      }

      setSubject(subjectData)
      
      // 문서 목록 조회
      await refreshDocuments()
      setLoading(false)
    }

    if (userId) fetchData()
  }, [id, userId])

  if (loading || !subject || !id) {
    return <SubjectDetailSkeleton />
  }

  const completedDocs = documents.filter(doc => doc.status === 'completed').length
  const totalDocs = documents.length
  const progressPercentage = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0

  return (
    <div className="bg-[#f8f8f8] w-full min-h-screen">
      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto">
        <div className="pt-[20px] px-[42px]">
          {/* Back Navigation removed as requested */}
          
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
                      ? 'bg-gray-100 text-emerald-600'
                      : 'bg-transparent text-[#737373] hover:text-[#212529]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[12px] font-bold ${
                      activeTab === 'files' ? 'bg-[#2f332f] text-[#2ce477]' : 'bg-[#e0e0e0] text-[#737373]'
                    }`}>
                        1
                      </span>
                      <span>모든 파일</span>
                    </div>
                    {activeTab === 'files' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2ce477]" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('quizzes')}
                    className={`relative px-6 py-4 font-medium text-[14px] transition-all duration-200 ${
                      activeTab === 'quizzes'
                        ? 'bg-gray-100 text-emerald-600'
                        : 'bg-transparent text-[#737373] hover:text-[#212529]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[12px] font-bold ${
                        activeTab === 'quizzes' ? 'bg-[#2f332f] text-[#2ce477]' : 'bg-[#e0e0e0] text-[#737373]'
                      }`}>
                        2
                      </span>
                      <span>내가 생성한 문제집</span>
                    </div>
                    {activeTab === 'quizzes' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2ce477]" />
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
