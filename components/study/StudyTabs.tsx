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
    try {
      // Get knowledge nodes for this document
      const { data: nodes } = await supabase
        .from('knowledge_nodes')
        .select('id')
        .eq('document_id', documentId)
      
      if (!nodes || nodes.length === 0) return

      const nodeIds = nodes.map(n => n.id)

      // Check if user has assessment records
      const { data: assessments } = await supabase
        .from('user_knowledge_status')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .in('node_id', nodeIds)

      // Get quiz attempts to check for failed questions
      const { data: quizItems } = await supabase
        .from('quiz_items')
        .select('id')
        .eq('document_id', documentId)
        .eq('is_assessment', true)

      if (quizItems && quizItems.length > 0) {
        const quizItemIds = quizItems.map(q => q.id)
        
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', FIXED_USER_ID)
          .in('quiz_item_id', quizItemIds)

        const failedAttempts = attempts?.filter(a => !a.is_correct) || []
        
        setAssessmentStatus({
          hasAssessment: assessments !== null && assessments.length > 0,
          hasFailedQuestions: failedAttempts.length > 0,
          totalQuestions: quizItems.length,
          failedQuestions: failedAttempts.length
        })
      }
    } catch (error) {
      console.error('Error checking assessment status:', error)
    }
  }

  const handleQuizButton = async () => {
    if (!assessmentStatus) {
      await handleRegenerateQuiz()
      return
    }

    if (!assessmentStatus.hasAssessment) {
      // First time - generate quiz
      await handleRegenerateQuiz()
    } else {
      // Already assessed - go to retry failed questions
      if (assessmentStatus.hasFailedQuestions) {
        router.push(`/subjects/${subjectId}/study/assessment?doc=${documentId}&retryFailed=true`)
      } else {
        toast.success('모든 문제를 맞추셨습니다! 완벽해요! 🎉')
      }
    }
  }

  const handleRegenerateQuiz = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/regenerate-quiz`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('퀴즈 재생성에 실패했습니다.')
      }

      toast.success('새로운 퀴즈가 생성되었습니다! 평가 페이지로 이동합니다.')
      router.push(`/subjects/${subjectId}/study/assessment?doc=${documentId}`)
    } catch (error) {
      console.error(error)
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
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 mr-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : assessmentStatus?.hasAssessment && assessmentStatus?.hasFailedQuestions ? (
            <RotateCcw className="h-4 w-4 mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? '퀴즈 생성 중...' : 
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