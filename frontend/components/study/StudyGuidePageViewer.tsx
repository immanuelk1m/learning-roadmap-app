'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, BookOpen, Brain } from 'lucide-react'
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
  const [currentPage, setCurrentPage] = useState(currentPageNumber - 1)
  
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

  const page = pages[currentPage]
  const totalPages = pages.length

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage)
      onPageChange?.(newPage + 1)
    }
  }


  return (
    <div className="h-full flex flex-col">
      {/* Header with navigation */}
      <div className="border-b border-gray-200 p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            {documentTitle || '학습 퀵노트'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-gray-600 min-w-[100px] text-center">
              {currentPage + 1} / {totalPages} 페이지
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Page selector */}
        <div className="flex gap-1 overflow-x-auto pb-2">
          {pages.map((p, idx) => (
            <button
              key={p.page_number}
              onClick={() => handlePageChange(idx)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                idx === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.page_number}
            </button>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Page title */}
        <div className="mb-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-3">
            {page.page_title || `페이지 ${page.page_number}`}
          </h3>
        </div>

        {/* Main content */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <MarkdownRenderer content={page.page_content} />
          </div>
        </div>

        {/* Key concepts */}
        {page.key_concepts && page.key_concepts.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">핵심 개념</h4>
                <div className="flex flex-wrap gap-2">
                  {page.key_concepts.map((concept, idx) => (
                    <span
                      key={idx}
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

        {/* Overall summary (shown on first page) */}
        {currentPage === 0 && overallSummary && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-2">전체 요약</h4>
                <div className="text-sm text-yellow-800">
                  <MarkdownRenderer content={overallSummary} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with quick navigation */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            이전 페이지
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">빠른 이동:</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage + 1}
              onChange={(e) => {
                const page = parseInt(e.target.value) - 1
                if (!isNaN(page)) {
                  handlePageChange(page)
                }
              }}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">/ {totalPages}</span>
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            다음 페이지
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}