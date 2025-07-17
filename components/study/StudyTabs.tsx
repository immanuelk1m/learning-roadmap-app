'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { FileText, BookOpen, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

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
  const router = useRouter()

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
      router.push(`/subjects/${subjectId}/study/assessment`)
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
          onClick={handleRegenerateQuiz}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 mr-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? '퀴즈 생성 중...' : '문제풀고 지식트리 완성하기!'}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}