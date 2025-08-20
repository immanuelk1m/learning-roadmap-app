'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BookOpen, CheckCircle, XCircle, AlertCircle, FileText, Layers } from 'lucide-react'
import StudyGuideSkeleton from './StudyGuideSkeleton'
import StudyGuidePageCard from './StudyGuidePageCard'
import StudyGuideProgressTracker from './StudyGuideProgressTracker'
import { parseMarkdownToReact } from '@/lib/markdown-parser-web'

interface StudyGuideProps {
  documentId: string
  userId: string
}

interface StudyGuidePage {
  id: string
  page_number: number
  page_title: string
  page_content: string
  key_concepts: string[]
  difficulty_level: 'easy' | 'medium' | 'hard'
  prerequisites: string[]
  learning_objectives: string[]
}

interface StudyGuideData {
  id: string
  content: string
  known_concepts: string[]
  unknown_concepts: string[]
  created_at: string
  updated_at: string
  generation_method?: 'legacy' | 'pages'
  document_title?: string
  total_pages?: number
  overall_summary?: string
  study_guide_pages?: StudyGuidePage[]
}

interface ErrorState {
  type: 'general' | 'assessment_required'
  message: string
  progress?: { assessed: number; total: number }
}

export default function StudyGuide({ documentId, userId }: StudyGuideProps) {
  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ErrorState | null>(null)
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadStudyGuide()
  }, [documentId, userId])


  const loadStudyGuide = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('study_guides')
        .select(`
          *,
          study_guide_pages (
            id,
            page_number,
            page_title,
            page_content,
            key_concepts,
            difficulty_level,
            prerequisites,
            learning_objectives
          )
        `)
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        // Sort pages by page_number if they exist
        if (data.study_guide_pages) {
          data.study_guide_pages.sort((a: StudyGuidePage, b: StudyGuidePage) => 
            a.page_number - b.page_number
          )
        }
      }

      setStudyGuide(data)
    } catch (err: any) {
      console.error('Error loading study guide:', err)
      setError({
        type: 'general',
        message: err.message || 'Failed to load study guide'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateStudyGuide = async (usePages: boolean = true) => {
    try {
      setGenerating(true)
      setError(null)

      const endpoint = usePages 
        ? '/api/study-guide/generate-pages'
        : '/api/study-guide/generate'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle specific error cases
        if (errorData.requiresAssessment) {
          setError({
            type: 'assessment_required',
            message: errorData.message,
            progress: errorData.progress
          })
        } else {
          setError({
            type: 'general',
            message: errorData.error || 'Failed to generate study guide'
          })
        }
        return
      }

      const data = await response.json()
      // Reload to get the new data with pages
      await loadStudyGuide()
    } catch (err: any) {
      console.error('Error generating study guide:', err)
      setError({
        type: 'general',
        message: err.message || 'Failed to generate study guide'
      })
    } finally {
      setGenerating(false)
    }
  }

  const formatContent = (content: string) => {
    return parseMarkdownToReact(content)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (generating) {
    return (
      <div className="h-full overflow-auto">
        <div className="p-6">
          <StudyGuideProgressTracker
            userId={userId}
            documentId={documentId}
            isGenerating={generating}
            onComplete={async () => {
              console.log('Study guide generation completed')
              await loadStudyGuide()
              setGenerating(false)
            }}
            onError={(error) => {
              console.error('Study guide generation error:', error)
              setError({
                type: 'general',
                message: error
              })
              setGenerating(false)
            }}
          />
          <StudyGuideSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    if (error.type === 'assessment_required') {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <BookOpen className="h-12 w-12 text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">지식 평가가 필요합니다</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          {error.progress && (
            <div className="mb-4 w-full max-w-xs">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>진행률</span>
                <span>{error.progress.assessed} / {error.progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(error.progress.assessed / error.progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = `/subjects/${window.location.pathname.split('/')[2]}/study/assessment?doc=${documentId}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              지식 평가 시작하기
            </button>
            <button
              onClick={loadStudyGuide}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">해설집 로딩 중 오류가 발생했습니다.</p>
        <p className="text-sm text-gray-500 mb-4">{error.message}</p>
        <button
          onClick={loadStudyGuide}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (!studyGuide) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">
          <div className="mx-auto h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <FileText className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">해설집이 없습니다</h3>
          <p className="text-gray-600 mb-6">
            학습 전 지식 평가 결과를 바탕으로 개인 맞춤 해설집을 생성해보세요.
          </p>
          <button
            onClick={() => generateStudyGuide(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            페이지별 해설집 생성하기
          </button>
        </div>
      </div>
    )
  }


  // Check if this is a page-based guide
  const isPageBased = studyGuide.generation_method === 'pages' && 
                      studyGuide.study_guide_pages && 
                      studyGuide.study_guide_pages.length > 0

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">개인 맞춤 해설집</h2>
              {isPageBased && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
                  <Layers className="w-4 h-4" />
                  {studyGuide.total_pages}페이지
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {new Date(studyGuide.updated_at).toLocaleDateString('ko-KR')} 생성
            </span>
          </div>
          
          {/* Study Status Summary */}
          <div className="flex gap-6 text-sm mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>아는 개념: {studyGuide.known_concepts.length}개</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>모르는 개념: {studyGuide.unknown_concepts.length}개</span>
            </div>
          </div>

          {/* Document Summary for Page-based guides */}
          {isPageBased && studyGuide.overall_summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">문서 요약</h3>
              <p className="text-sm text-blue-800">{studyGuide.overall_summary}</p>
            </div>
          )}
        </div>

        {/* Content */}
        {isPageBased ? (
          <div className="space-y-4">
            {studyGuide.study_guide_pages!.map((page, index) => (
              <StudyGuidePageCard
                key={page.id}
                pageNumber={page.page_number}
                pageTitle={page.page_title}
                pageContent={page.page_content}
                keyConcepts={page.key_concepts}
                difficultyLevel={page.difficulty_level}
                prerequisites={page.prerequisites}
                learningObjectives={page.learning_objectives}
                isExpanded={index === 0} // Expand first page by default
              />
            ))}
          </div>
        ) : (
          <div className="prose prose-gray max-w-none">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {studyGuide.content ? (
                formatContent(studyGuide.content)
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">해설집 콘텐츠가 없습니다.</p>
                  <button
                    onClick={() => generateStudyGuide(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    페이지별 해설집 생성하기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}