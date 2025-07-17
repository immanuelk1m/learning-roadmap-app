'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileText, BookOpen, Sparkles } from 'lucide-react'
import Link from 'next/link'

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
        <Link
          href={`/subjects/${subjectId}/quiz?doc=${documentId}`}
          className="inline-flex items-center px-4 py-2 mr-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          문제풀고 지식트리 완성하기!
        </Link>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}