'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, Target, AlertCircle, Hash } from 'lucide-react'

interface StudyGuidePageCardProps {
  pageNumber: number
  pageTitle: string
  pageContent: string
  keyConcepts: string[]
  difficultyLevel: 'easy' | 'medium' | 'hard'
  prerequisites: string[]
  learningObjectives: string[]
  isExpanded?: boolean
}

export default function StudyGuidePageCard({
  pageNumber,
  pageTitle,
  pageContent,
  keyConcepts,
  difficultyLevel,
  prerequisites,
  learningObjectives,
  isExpanded: initialExpanded = false
}: StudyGuidePageCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded)

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'easy': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'hard': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case 'easy': return '쉬움'
      case 'medium': return '보통'
      case 'hard': return '어려움'
      default: return level
    }
  }

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
              <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getDifficultyColor(difficultyLevel)}`}>
                {getDifficultyLabel(difficultyLevel)}
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
          {/* Prerequisites */}
          {prerequisites && prerequisites.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-900 mb-1">선수 지식</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-yellow-600">•</span>
                        <span>{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Learning Objectives */}
          {learningObjectives && learningObjectives.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 mb-1">학습 목표</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {learningObjectives.map((objective, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-blue-600">✓</span>
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Full Content */}
          <div className="prose prose-sm max-w-none">
            <h4 className="text-base font-semibold text-gray-900 mb-2">상세 설명</h4>
            <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {pageContent}
            </div>
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