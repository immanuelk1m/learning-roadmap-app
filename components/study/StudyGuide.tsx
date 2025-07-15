'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, BookOpen, CheckCircle, XCircle, AlertCircle, FileText, Download } from 'lucide-react'
import StudyGuideSkeleton from './StudyGuideSkeleton'

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
  const [downloading, setDownloading] = useState(false)
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
      setStudyGuide(data.studyGuide)
      // Smooth transition by briefly showing skeleton
      await new Promise(resolve => setTimeout(resolve, 300))
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

  const downloadPDF = async () => {
    try {
      setDownloading(true)
      const response = await fetch('/api/study-guide/pdf', {
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
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `study-guide-${documentId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error downloading PDF:', err)
      alert('PDF 다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
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

  if (generating) {
    return <StudyGuideSkeleton />
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
          <h3 className="text-xl font-semibold text-gray-900 mb-3">PDF 해설집 생성</h3>
          <p className="text-gray-600 mb-8">
            개인 맞춤 해설집을 생성하여 효율적으로 학습하세요.
          </p>
          <button
            onClick={generateStudyGuide}
            disabled={generating}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            <FileText className="h-5 w-5" />
            PDF 해설집 생성
          </button>
        </div>
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
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {new Date(studyGuide.updated_at).toLocaleDateString('ko-KR')} 생성
              </span>
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                PDF 다운로드
              </button>
            </div>
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