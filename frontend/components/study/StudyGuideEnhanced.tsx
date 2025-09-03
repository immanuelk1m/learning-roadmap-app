'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BookOpen, CheckCircle, XCircle, AlertCircle, FileText, RefreshCw } from 'lucide-react'
import StudyGuideSkeleton from './StudyGuideSkeleton'
import StudyGuidePageViewer from './StudyGuidePageViewer'
import { parseMarkdownToReact } from '@/lib/markdown-parser-web'

interface StudyGuideProps {
  documentId: string
  userId: string
}

interface StudyGuideData {
  id: string
  content?: string  // Legacy field
  document_title?: string
  total_pages?: number
  overall_summary?: string
  generation_method?: 'legacy' | 'pages'
  known_concepts: string[]
  unknown_concepts: string[]
  created_at: string
  updated_at: string
}

interface StudyGuidePage {
  id: string
  study_guide_id: string
  page_number: number
  page_title?: string
  page_content: string
  key_concepts?: string[]
  difficulty_level?: 'easy' | 'medium' | 'hard'
  prerequisites?: string[]
  learning_objectives?: string[]
  original_content?: string
  created_at: string
  updated_at: string
}

interface ErrorState {
  type: 'general' | 'assessment_required'
  message: string
  progress?: { assessed: number; total: number }
}

export default function StudyGuideEnhanced({ documentId, userId }: StudyGuideProps) {
  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null)
  const [studyGuidePages, setStudyGuidePages] = useState<StudyGuidePage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ErrorState | null>(null)
  const [generating, setGenerating] = useState(false)
  const [usePageBasedGeneration, setUsePageBasedGeneration] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStudyGuide()
  }, [documentId, userId])

  const loadStudyGuide = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load study guide metadata
      const { data: guide, error: guideError } = await supabase
        .from('study_guides')
        .select('*')
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .single()

      if (guideError && guideError.code !== 'PGRST116') {
        throw guideError
      }

      if (guide) {
        // Normalize guide data to match StudyGuideData type
        const normalizedGuide = {
          ...guide,
          content: '', // Content is stored in pages
          known_concepts: guide.known_concepts || [],
          unknown_concepts: guide.unknown_concepts || [],
          generation_method: (guide.generation_method === 'pages' || guide.generation_method === 'legacy') 
            ? guide.generation_method as 'pages' | 'legacy'
            : undefined,
          document_title: guide.document_title || undefined,
          total_pages: guide.total_pages || undefined
        }
        setStudyGuide(normalizedGuide)
        
        // If it's a page-based guide, load the pages
        if (guide.generation_method === 'pages') {
          const { data: pages, error: pagesError } = await supabase
            .from('study_guide_pages')
            .select('*')
            .eq('study_guide_id', guide.id)
            .order('page_number')

          if (pagesError) {
            console.error('Error loading study guide pages:', pagesError)
          } else if (pages) {
            // Normalize pages data to match StudyGuidePage type
            const normalizedPages = pages.map(page => ({
              ...page,
              page_title: page.page_title || '',
              key_concepts: page.key_concepts || [],
              prerequisites: page.prerequisites || [],
              learning_objectives: page.learning_objectives || [],
              difficulty_level: (page.difficulty_level === 'easy' || page.difficulty_level === 'medium' || page.difficulty_level === 'hard')
                ? page.difficulty_level as 'easy' | 'medium' | 'hard'
                : undefined,
              original_content: page.original_content || undefined,
              created_at: page.created_at || undefined,
              updated_at: page.updated_at || undefined
            }))
            setStudyGuidePages(normalizedPages as StudyGuidePage[])
          }
        }
      }
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

  const generateStudyGuide = async () => {
    try {
      setGenerating(true)
      setError(null)

      // Determine which API to call based on user preference
      const apiEndpoint = '/api/study-guide/generate'

      const response = await fetch(apiEndpoint, {
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
      
      if (data.studyGuide) {
        setStudyGuide(data.studyGuide)
        
        // If pages are included in the response, set them
        if (data.studyGuide.pages) {
          setStudyGuidePages(data.studyGuide.pages)
        }
      }
      
      // Reload to get the latest data
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

  const formatLegacyContent = (content: string) => {
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
    return <StudyGuideSkeleton />
  }

  if (error) {
    if (error.type === 'assessment_required') {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <BookOpen className="h-12 w-12 text-blue-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">학습 전 배경지식 체크가 필요합니다</h3>
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
              학습 전 배경지식 체크 시작하기
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
        <p className="text-gray-600 mb-4">퀵노트 로딩 중 오류가 발생했습니다.</p>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-3">퀵노트 생성하기</h3>
          <p className="text-gray-600 mb-6">
            학습 전 배경지식 체크 결과를 바탕으로 개인 맞춤 퀵노트를 생성할 수 있습니다.
          </p>
          

          <button
            onClick={generateStudyGuide}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <FileText className="h-5 w-5" />
            퀵노트 생성하기
          </button>
        </div>
      </div>
    )
  }

  // Display based on generation method
  if (studyGuide.generation_method === 'pages' && studyGuidePages.length > 0) {
    return (
      <div className="h-full">
        <StudyGuidePageViewer
          pages={studyGuidePages}
          documentTitle={studyGuide.document_title}
          overallSummary={studyGuide.overall_summary}
        />
      </div>
    )
  }

  // Legacy display (single content)
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">개인 맞춤 퀵노트</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {new Date(studyGuide.updated_at).toLocaleDateString('ko-KR')} 생성
              </span>
              <button
                onClick={() => {
                  setUsePageBasedGeneration(false)
                  generateStudyGuide()
                }}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                재생성
              </button>
            </div>
          </div>
          
          {/* Study Status Summary removed as requested */}
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {studyGuide.content && formatLegacyContent(studyGuide.content)}
          </div>
        </div>
      </div>
    </div>
  )
}
