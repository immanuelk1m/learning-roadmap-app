'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, BookOpen, Sparkles, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface StudyTabsProps {
  knowledgeTreeContent: React.ReactNode
  studyGuideContent: React.ReactNode
  hasStudyGuide: boolean
  subjectId: string
  documentId: string
}

export default function StudyTabs({
  knowledgeTreeContent,
  studyGuideContent,
  hasStudyGuide,
  subjectId,
  documentId
}: StudyTabsProps) {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'guide'>('knowledge')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [assessmentStatus, setAssessmentStatus] = useState<{
    hasAssessment: boolean
    hasFailedQuestions: boolean
    totalQuestions: number
    failedQuestions: number
  } | null>(null)
  const router = useRouter()
  const supabase = createClient()
  
  // Fixed user ID
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  // Check assessment status on mount
  useEffect(() => {
    checkAssessmentStatus()
  }, [documentId])

  const checkAssessmentStatus = async () => {
    console.log('[StudyTabs] Checking assessment status...')
    setIsLoadingStatus(true)
    
    try {
      // Get knowledge nodes for this document
      const { data: nodes } = await supabase
        .from('knowledge_nodes')
        .select('id')
        .eq('document_id', documentId)
      
      console.log('[StudyTabs] Knowledge nodes:', nodes?.length || 0)
      
      if (!nodes || nodes.length === 0) {
        setIsLoadingStatus(false)
        return
      }

      const nodeIds = nodes.map(n => n.id)

      // Check if user has assessment records
      const { data: assessments } = await supabase
        .from('user_knowledge_status')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .in('node_id', nodeIds)

      console.log('[StudyTabs] User assessments:', assessments?.length || 0)

      // Get quiz attempts to check for failed questions
      const { data: quizItems } = await supabase
        .from('quiz_items')
        .select('id')
        .eq('document_id', documentId)
        .eq('is_assessment', true)

      console.log('[StudyTabs] Quiz items:', quizItems?.length || 0)

      if (quizItems && quizItems.length > 0) {
        const quizItemIds = quizItems.map(q => q.id)
        
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', FIXED_USER_ID)
          .in('quiz_item_id', quizItemIds)

        const failedAttempts = attempts?.filter(a => !a.is_correct) || []
        
        console.log('[StudyTabs] Quiz attempts:', attempts?.length || 0, 'Failed:', failedAttempts.length)
        
        setAssessmentStatus({
          hasAssessment: assessments !== null && assessments.length > 0,
          hasFailedQuestions: failedAttempts.length > 0,
          totalQuestions: quizItems.length,
          failedQuestions: failedAttempts.length
        })
      } else {
        // No quiz items yet
        setAssessmentStatus({
          hasAssessment: false,
          hasFailedQuestions: false,
          totalQuestions: 0,
          failedQuestions: 0
        })
      }
    } catch (error) {
      console.error('[StudyTabs] Error checking assessment status:', error)
      toast.error('평가 상태를 확인하는 중 오류가 발생했습니다.')
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const handleQuizButton = async () => {
    console.log('[StudyTabs] Quiz button clicked')
    console.log('[StudyTabs] Current state:', {
      isLoadingStatus,
      assessmentStatus,
      isGenerating
    })

    // 아직 로딩 중이면 대기
    if (isLoadingStatus) {
      toast('평가 상태를 확인하는 중입니다...')
      return
    }

    if (!assessmentStatus) {
      console.log('[StudyTabs] No assessment status, generating quiz...')
      await handleRegenerateQuiz()
      return
    }

    if (!assessmentStatus.hasAssessment) {
      // First time - generate quiz
      console.log('[StudyTabs] First assessment, generating quiz...')
      await handleRegenerateQuiz()
    } else {
      // Already assessed - go to retry failed questions
      if (assessmentStatus.hasFailedQuestions) {
        console.log('[StudyTabs] Retrying failed questions:', assessmentStatus.failedQuestions)
        router.push(`/subjects/${subjectId}/study/assessment?doc=${documentId}&retryFailed=true`)
      } else {
        console.log('[StudyTabs] All questions correct!')
        toast.success('모든 문제를 맞추셨습니다! 완벽해요! 🎉')
      }
    }
  }

  const handleRegenerateQuiz = async () => {
    console.log('[StudyTabs] Starting quiz generation...')
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/regenerate-quiz`, {
        method: 'POST',
      })

      console.log('[StudyTabs] Quiz generation response:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('[StudyTabs] Quiz generation failed:', errorData)
        throw new Error(errorData?.error || '퀴즈 재생성에 실패했습니다.')
      }

      const result = await response.json()
      console.log('[StudyTabs] Quiz generation success:', result)

      toast.success('새로운 퀴즈가 생성되었습니다! 평가 페이지로 이동합니다.')
      router.push(`/subjects/${subjectId}/study/assessment?doc=${documentId}`)
    } catch (error) {
      console.error('[StudyTabs] Quiz generation error:', error)
      toast.error(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  const tabs = [
    {
      id: 'knowledge' as const,
      label: '지식 트리',
      icon: FileText,
      content: knowledgeTreeContent
    },
    {
      id: 'guide' as const,
      label: 'PDF 해설집',
      icon: BookOpen,
      content: studyGuideContent
    }
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex justify-between items-center border-b border-gray-200 bg-white">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors relative",
                  "hover:text-gray-900",
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={handleQuizButton}
          disabled={isGenerating || isLoadingStatus}
          className="inline-flex items-center px-4 py-2 mr-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoadingStatus ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : assessmentStatus?.hasAssessment && assessmentStatus?.hasFailedQuestions ? (
            <RotateCcw className="h-4 w-4 mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isLoadingStatus ? '로딩 중...' :
           isGenerating ? '퀴즈 생성 중...' : 
           assessmentStatus?.hasAssessment ? 
             assessmentStatus.hasFailedQuestions ? 
               `틀린 문제 다시 풀기 (${assessmentStatus.failedQuestions}문제)` : 
               '문제풀고 지식트리 완성하기!' :
             '문제풀고 지식트리 완성하기!'
          }
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}