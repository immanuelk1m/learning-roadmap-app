'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileText, BookOpen } from 'lucide-react'

interface StudyTabsProps {
  knowledgeTreeContent: React.ReactNode
  studyGuideContent: React.ReactNode
  hasStudyGuide: boolean
}

export default function StudyTabs({ 
  knowledgeTreeContent, 
  studyGuideContent, 
  hasStudyGuide 
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
      <div className="flex border-b border-gray-200 bg-white">
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

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  )
}