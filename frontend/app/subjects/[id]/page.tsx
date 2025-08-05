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
  quiz_data?: any
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
      .select('*')
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
    <div className="min-h-screen bg-gray-50">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(at_50%_0%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-slate-100" style={{ maskImage: 'linear-gradient(0deg,white,rgba(255,255,255,0.6))' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="pt-6 pb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-lg transition-all duration-200 group backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              과목 목록
            </Link>
          </div>
          
          {/* Hero Content */}
          <div className="pb-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-8">
              <div className="flex items-start gap-6">
                {/* Enhanced Subject Icon */}
                <div className="relative">
                  <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/25 ring-1 ring-white/20"
                    style={{
                      background: `linear-gradient(135deg, ${subject.color || '#3B82F6'} 0%, ${subject.color || '#1E40AF'} 100%)`
                    }}
                  >
                    <BookOpen className="h-9 w-9 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-2 leading-tight">
                    {subject.name}
                  </h1>
                  {subject.description && (
                    <p className="text-lg text-slate-600 mb-4 leading-relaxed">{subject.description}</p>
                  )}
                  
                  {/* Stats Pills */}
                  <div className="flex flex-wrap gap-3">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {totalDocs}개 전체
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      {totalDocs - completedDocs}개 미완료
                    </div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      {completedDocs}개 완료
                    </div>
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
            
            {/* Enhanced Progress Bar */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 ring-1 ring-white/20 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-900">학습 진행 상황</h3>
                <span className="text-sm font-medium text-slate-600">
                  {completedDocs}/{totalDocs} 문서 · {progressPercentage}% 완료
                </span>
              </div>
              <div className="relative h-3 bg-slate-200/80 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${progressPercentage}%`,
                    background: `linear-gradient(90deg, ${subject.color || '#3B82F6'} 0%, ${subject.color || '#1E40AF'} 100%)`,
                    boxShadow: `0 0 20px ${subject.color || '#3B82F6'}40`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8">
          {/* Main Content Area */}
          <div className="w-full">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-slate-200/50 border border-white/20 overflow-hidden ring-1 ring-slate-200/20">
              {/* Tab Header */}
              <div className="border-b border-slate-200/60 bg-slate-50/50">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`relative px-6 py-4 font-medium text-sm transition-all duration-200 ${
                      activeTab === 'files'
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                        activeTab === 'files' ? 'bg-orange-500 text-white' : 'bg-slate-300 text-slate-600'
                      }`}>
                        1
                      </span>
                      <span>모든 파일</span>
                    </div>
                    {activeTab === 'files' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('quizzes')}
                    className={`relative px-6 py-4 font-medium text-sm transition-all duration-200 ${
                      activeTab === 'quizzes'
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${
                        activeTab === 'quizzes' ? 'bg-orange-500 text-white' : 'bg-slate-300 text-slate-600'
                      }`}>
                        2
                      </span>
                      <span>내가 생성한 문제집</span>
                    </div>
                    {activeTab === 'quizzes' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
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
    </div>
  )
}