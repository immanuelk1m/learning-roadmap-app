'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Hash } from 'lucide-react'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'

interface StudyGuidePageCardProps {
  pageNumber: number
  pageTitle: string
  pageContent: string
  keyConcepts: string[]
  isExpanded?: boolean
}

export default function StudyGuidePageCard({
  pageNumber,
  pageTitle,
  pageContent,
  keyConcepts,
  isExpanded: initialExpanded = false
}: StudyGuidePageCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)


  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden transition-all duration-200">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
                <BookOpen className="w-4 h-4" />
                페이지 {pageNumber}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{pageTitle}</h3>
            
            {/* Key Concepts Preview */}
            <div className="flex flex-wrap gap-2 mb-2">
              {keyConcepts.slice(0, 3).map((concept, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                >
                  <Hash className="w-3 h-3" />
                  {concept}
                </span>
              ))}
              {keyConcepts.length > 3 && (
                <span className="text-gray-500 text-xs">
                  +{keyConcepts.length - 3} more
                </span>
              )}
            </div>

            {/* Content Preview */}
            {!isExpanded && (
              <p className="text-gray-600 text-sm line-clamp-2">
                {pageContent}
              </p>
            )}
          </div>
          
          <button className="ml-4 text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">

          {/* Full Content */}
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-4">상세 설명</h4>
            <MarkdownRenderer content={pageContent} />
          </div>

          {/* All Key Concepts */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">핵심 개념</h4>
            <div className="flex flex-wrap gap-2">
              {keyConcepts.map((concept, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  <Hash className="w-3 h-3" />
                  {concept}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}