'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, BookOpen, FileImage, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import KnowledgeTreeView from '@/components/study/KnowledgeTreeView'
import PDFViewer from '@/components/study/PDFViewer'
import StudyTabs from '@/components/study/StudyTabs'
import StudyGuide from '@/components/study/StudyGuide'

interface StudyPageClientProps {
  subject: any
  document: any
  knowledgeNodes: any[]
  userStatus: any[]
  studyGuide: any
  subjectId: string
  documentId: string
  userId: string
}

export default function StudyPageClient({
  subject,
  document,
  knowledgeNodes,
  userStatus,
  studyGuide,
  subjectId,
  documentId,
  userId
}: StudyPageClientProps) {
  const [activeMobileTab, setActiveMobileTab] = useState<'pdf' | 'knowledge' | 'guide'>('pdf')
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [hasCompletedOXAssessment, setHasCompletedOXAssessment] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Check assessment status
  useEffect(() => {
    checkAssessmentStatus()
  }, [documentId])

  const checkAssessmentStatus = async () => {
    if (!documentId) return
    
    setIsLoadingStatus(true)
    try {
      // Get O/X quiz items
      const { data: oxQuizItems } = await supabase
        .from('quiz_items')
        .select('id')
        .eq('document_id', documentId)
        .eq('is_assessment', true)
        .eq('question_type', 'true_false')

      if (oxQuizItems && oxQuizItems.length > 0) {
        const { data: oxAttempts } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', userId)
          .in('quiz_item_id', oxQuizItems.map(q => q.id))

        setHasCompletedOXAssessment(!!(oxAttempts && oxAttempts.length > 0))
      }
    } catch (error) {
      console.error('Error checking assessment status:', error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const handleQuizButton = () => {
    if (isLoadingStatus) {
      toast('평가 상태를 확인하는 중입니다...')
      return
    }

    if (!hasCompletedOXAssessment) {
      router.push(`/subjects/${subjectId}/study/assessment?doc=${documentId}`)
    } else {
      router.push(`/subjects/${subjectId}/quiz?doc=${documentId}`)
    }
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <Link
                href={`/subjects/${subjectId}`}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                과목으로 돌아가기
              </Link>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-lg font-semibold text-gray-900">{subject.name}</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-4">분석이 완료된 문서가 없습니다.</p>
          <Link
            href={`/subjects/${subjectId}`}
            className="text-blue-600 hover:text-blue-800"
          >
            문서 업로드하기
          </Link>
        </div>
      </div>
    )
  }

  const mobileTabContents = {
    pdf: (
      <div className="h-full bg-white">
        <PDFViewer documentId={documentId} filePath={document.file_path} />
      </div>
    ),
    knowledge: (
      <div className="h-full overflow-auto bg-white">
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              지식 트리
            </h2>
            {userStatus && userStatus.length > 0 && (
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>아는 개념: {userStatus.filter(s => s.understanding_level >= 70).length}개</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>모르는 개념: {userStatus.filter(s => s.understanding_level < 70).length}개</span>
                </div>
              </div>
            )}
          </div>
          {knowledgeNodes && knowledgeNodes.length > 0 ? (
            <KnowledgeTreeView
              nodes={knowledgeNodes}
              userStatus={userStatus || []}
              documentId={documentId}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              AI가 문서를 분석 중입니다...
            </div>
          )}
        </div>
      </div>
    ),
    guide: (
      <div className="h-full overflow-auto bg-white">
        <StudyGuide
          documentId={documentId}
          userId={userId}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href={`/subjects/${subjectId}`}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">과목으로 돌아가기</span>
                <span className="sm:hidden">뒤로</span>
              </Link>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-base sm:text-lg font-semibold text-gray-900">{subject.name}</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate max-w-[200px] sm:max-w-none">
                  {document.title}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Tab Navigation at Top */}
      <div className="sm:hidden flex flex-col h-[calc(100vh-65px)]">
        {/* Mobile Tab Navigation */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex">
            <button
              onClick={() => setActiveMobileTab('pdf')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors relative",
                activeMobileTab === 'pdf'
                  ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <FileImage className="h-4 w-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('knowledge')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors relative",
                activeMobileTab === 'knowledge'
                  ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <FileText className="h-4 w-4" />
              <span>지식 트리</span>
            </button>
            <button
              onClick={() => setActiveMobileTab('guide')}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors relative",
                activeMobileTab === 'guide'
                  ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <BookOpen className="h-4 w-4" />
              <span>PDF 퀵노트</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Tab Content */}
        <div className={cn(
          "flex-1 relative",
          activeMobileTab === 'pdf' ? '' : 'overflow-hidden'
        )}>
          {mobileTabContents[activeMobileTab]}
          
          {/* Floating Quiz Button for Mobile */}
          <button
            onClick={handleQuizButton}
            disabled={isLoadingStatus}
            className="absolute bottom-4 right-4 inline-flex items-center px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:shadow-xl text-sm font-medium disabled:bg-blue-400 disabled:cursor-not-allowed z-10"
          >
            {isLoadingStatus ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isLoadingStatus ? '로딩 중...' :
             !hasCompletedOXAssessment ? '배경지식 체크' :
             '퀴즈 시작'
            }
          </button>
        </div>
      </div>

      {/* Desktop Layout - Side by Side */}
      <div className="hidden sm:flex h-[calc(100vh-73px)]">
        {/* Left: PDF Viewer */}
        <div className="w-1/2 bg-white border-r border-gray-200">
          <PDFViewer documentId={documentId} filePath={document.file_path} />
        </div>

        {/* Right: Tabbed Content */}
        <div className="w-1/2 bg-gray-50">
          <StudyTabs
            hasStudyGuide={!!studyGuide}
            subjectId={subjectId}
            documentId={documentId}
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
                          <span>아는 개념: {userStatus.filter(s => s.understanding_level >= 70).length}개</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span>모르는 개념: {userStatus.filter(s => s.understanding_level < 70).length}개</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {knowledgeNodes && knowledgeNodes.length > 0 ? (
                    <KnowledgeTreeView
                      nodes={knowledgeNodes}
                      userStatus={userStatus || []}
                      documentId={documentId}
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
                documentId={documentId}
                userId={userId}
              />
            }
          />
        </div>
      </div>
    </div>
  )
}