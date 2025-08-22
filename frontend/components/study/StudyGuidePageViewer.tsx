'use client'

import { BookOpen, Brain, AlertCircle, FileText } from 'lucide-react'
import MarkdownRenderer from '@/components/ui/MarkdownRenderer'

interface StudyGuidePage {
  page_number: number
  page_title?: string
  page_content: string
  key_concepts?: string[]
  difficulty_level?: 'easy' | 'medium' | 'hard'
  prerequisites?: string[]
  learning_objectives?: string[]
  original_content?: string
}

interface StudyGuidePageViewerProps {
  pages: StudyGuidePage[]
  documentTitle?: string
  overallSummary?: string
  currentPageNumber?: number
  onPageChange?: (pageNumber: number) => void
}

export default function StudyGuidePageViewer({
  pages,
  documentTitle,
  overallSummary,
  currentPageNumber = 1,
  onPageChange
}: StudyGuidePageViewerProps) {
  
  if (!pages || pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">페이지 정보가 없습니다</p>
        </div>
      </div>
    )
  }


  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {documentTitle || '학습 퀵노트'}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="h-4 w-4" />
            <span>총 {pages.length}개 페이지</span>
          </div>
        </div>
      </div>

      {/* All pages content - scrollable */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Overall summary at the top */}
          {overallSummary && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-3 text-lg">전체 요약</h3>
                  <div className="text-yellow-800">
                    <MarkdownRenderer content={overallSummary} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All pages listed sequentially */}
          {pages.map((page, idx) => (
            <div key={page.page_number} className="mb-8">
              {/* Page divider */}
              {idx > 0 && (
                <div className="flex items-center justify-center my-8">
                  <div className="h-px bg-gray-300 flex-1"></div>
                  <span className="px-4 text-sm text-gray-500 font-medium">
                    페이지 {page.page_number}
                  </span>
                  <div className="h-px bg-gray-300 flex-1"></div>
                </div>
              )}

              {/* Page card */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                {/* Page header */}
                <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {page.page_title || `페이지 ${page.page_number}`}
                  </h3>
                </div>

                {/* Page content */}
                <div className="p-6">
                  <div className="prose prose-gray max-w-none">
                    <MarkdownRenderer content={page.page_content} />
                  </div>
                </div>

                {/* Key concepts */}
                {page.key_concepts && page.key_concepts.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-2">핵심 개념</h4>
                        <div className="flex flex-wrap gap-2">
                          {page.key_concepts.map((concept, conceptIdx) => (
                            <span
                              key={conceptIdx}
                              className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700"
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Bottom padding */}
          <div className="h-8"></div>
        </div>
      </div>
    </div>
  )
}