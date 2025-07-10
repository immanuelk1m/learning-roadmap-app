'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BookOpen, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface StudyGuideProps {
  documentId: string
  userId: string
}

interface StudyGuideData {
  id: string
  content: string
  known_concepts: string[]
  unknown_concepts: string[]
  created_at: string
  updated_at: string
}

export default function StudyGuide({ documentId, userId }: StudyGuideProps) {
  const [studyGuide, setStudyGuide] = useState<StudyGuideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadStudyGuide()
  }, [documentId, userId])

  const loadStudyGuide = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('study_guides')
        .select('*')
        .eq('user_id', userId)
        .eq('document_id', documentId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setStudyGuide(data)
    } catch (err: any) {
      console.error('Error loading study guide:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateStudyGuide = async () => {
    try {
      setGenerating(true)
      setError(null)

      const response = await fetch('/api/study-guide/generate', {
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
        throw new Error(errorData.error || 'Failed to generate study guide')
      }

      const data = await response.json()
      setStudyGuide(data.studyGuide)
    } catch (err: any) {
      console.error('Error generating study guide:', err)
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const formatContent = (content: string) => {
    // Split content into sections and format
    const sections = content.split('\n\n').filter(section => section.trim())
    
    return sections.map((section, index) => {
      // Check if section is a header (starts with #)
      if (section.startsWith('#')) {
        const level = section.match(/^#+/)?.[0].length || 1
        const text = section.replace(/^#+\s*/, '')
        
        if (level === 1) {
          return (
            <h2 key={index} className="text-xl font-bold text-gray-900 mb-3 border-b pb-2">
              {text}
            </h2>
          )
        } else if (level === 2) {
          return (
            <h3 key={index} className="text-lg font-semibold text-gray-800 mb-2 mt-4">
              {text}
            </h3>
          )
        } else {
          return (
            <h4 key={index} className="text-base font-medium text-gray-700 mb-2 mt-3">
              {text}
            </h4>
          )
        }
      }
      
      // Regular paragraph
      return (
        <p key={index} className="text-gray-700 mb-3 leading-relaxed">
          {section}
        </p>
      )
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-600 mb-4">해설집 로딩 중 오류가 발생했습니다.</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
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
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">해설집이 아직 생성되지 않았습니다</h3>
        <p className="text-gray-600 mb-6">
          지식 평가를 완료하면 개인 맞춤 해설집이 자동으로 생성됩니다.
        </p>
        <button
          onClick={generateStudyGuide}
          disabled={generating}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              해설집 생성 중...
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4" />
              해설집 생성하기
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">개인 맞춤 해설집</h2>
            <span className="text-sm text-gray-500">
              {new Date(studyGuide.updated_at).toLocaleDateString('ko-KR')} 생성
            </span>
          </div>
          
          {/* Study Status Summary */}
          <div className="flex gap-6 text-sm mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>이해한 개념: {studyGuide.known_concepts.length}개</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>학습 필요: {studyGuide.unknown_concepts.length}개</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-gray max-w-none">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {formatContent(studyGuide.content)}
          </div>
        </div>

        {/* Regenerate Button */}
        <div className="mt-6 text-center">
          <button
            onClick={generateStudyGuide}
            disabled={generating}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                재생성 중...
              </>
            ) : (
              '해설집 재생성하기'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}