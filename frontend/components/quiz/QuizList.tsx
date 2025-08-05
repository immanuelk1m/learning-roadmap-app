'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Brain, Calendar, ChevronRight, Plus, Check, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  title: string
  status: string
  created_at: string
  subject_id: string
  file_path: string
  file_size: number | null
  page_count: number | null
  quiz_data?: any
}

interface QuizListProps {
  subjectId: string
  documents: Document[]
}

type DifficultyLevel = 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard'

export default function QuizList({ subjectId, documents }: QuizListProps) {
  const [quizDocuments, setQuizDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'view' | 'generate'>('view')
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal')
  const [questionCount, setQuestionCount] = useState(10)
  const [questionTypes, setQuestionTypes] = useState({
    multipleChoice: true,
    shortAnswer: false,
    trueFalse: false
  })
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Filter documents that have quiz_data
    const docsWithQuiz = documents.filter(doc => doc.quiz_data && doc.status === 'completed')
    setQuizDocuments(docsWithQuiz)
    setLoading(false)
  }, [documents])

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(docId)) {
        newSet.delete(docId)
      } else {
        newSet.add(docId)
      }
      return newSet
    })
  }

  const handleGenerateQuiz = async () => {
    if (selectedDocuments.size === 0) return
    
    setGenerating(true)
    try {
      const response = await fetch('/api/quiz/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocuments),
          difficulty,
          questionCount,
          questionTypes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate quiz')
      }

      const result = await response.json()
      console.log('Quiz generated:', result)
      
      // Refresh documents to show updated quiz data
      window.location.reload()
    } catch (error) {
      console.error('Failed to generate quiz:', error)
      alert('문제 생성 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setGenerating(false)
    }
  }

  const difficultyLabels = {
    very_easy: '매우 쉬움',
    easy: '조금 쉬움',
    normal: '보통',
    hard: '어려움',
    very_hard: '매우 어려움'
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  // View mode - show existing quizzes
  if (mode === 'view') {
    if (quizDocuments.length === 0) {
      return (
        <div>
          {/* Header with mode toggle */}
          <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  생성된 문제집
                </h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
                  {quizDocuments.length}개
                </span>
              </div>
              <button
                onClick={() => setMode('generate')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-lg hover:shadow-md hover:scale-105 transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                새 문제집 생성
              </button>
            </div>
          </div>
          
          <div className="px-8 py-20 text-center">
            {/* Empty State */}
            <div className="relative mx-auto w-24 h-24 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl rotate-6 opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-br from-orange-200 to-amber-200 rounded-2xl -rotate-6 opacity-40" />
              <div className="relative w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Brain className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-slate-900 mb-3">생성된 문제집이 없습니다</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
              문서를 업로드하고 분석이 완료되면<br />
              AI가 자동으로 문제집을 생성합니다
            </p>
          </div>
        </div>
      )
    }

    return (
      <div>
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-slate-900">
                생성된 문제집
              </h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
                {quizDocuments.length}개
              </span>
            </div>
            <button
              onClick={() => setMode('generate')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-lg hover:shadow-md hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              새 문제집 생성
            </button>
          </div>
        </div>

      {/* Quiz Grid */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {quizDocuments.map((doc) => {
            const quizData = doc.quiz_data
            const questionCount = quizData?.quiz?.questions?.length || 0
            
            return (
              <div
                key={doc.id}
                className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-orange-200"
              >
                {/* Card Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1 line-clamp-2">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(doc.created_at).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <span>•</span>
                        <span>{questionCount}개 문제</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quiz Info */}
                <div className="px-6 pb-4">
                  <div className="flex flex-wrap gap-2">
                    <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                      객관식
                    </div>
                    <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                      주관식
                    </div>
                    <div className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></div>
                      O/X
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="p-6 pt-4 border-t border-slate-100">
                  <Link
                    href={`/subjects/${subjectId}/quiz?doc=${doc.id}`}
                    className="group/btn flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-xl hover:shadow-md hover:scale-105 transition-all duration-300"
                  >
                    <Brain className="w-4 h-4" />
                    <span>문제 풀기</span>
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
  }

  // Generate mode - create new quiz
  return (
    <div>
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMode('view')}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              뒤로가기
            </button>
            <h2 className="text-2xl font-bold text-slate-900">
              새 문제집 생성
            </h2>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* PDF Selection Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            1. PDF 파일 선택
            <span className="ml-2 text-sm font-normal text-slate-600">
              ({selectedDocuments.size}개 선택됨)
            </span>
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {documents.filter(doc => doc.status === 'completed').map((doc) => {
              const isSelected = selectedDocuments.has(doc.id)
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDocumentSelection(doc.id)}
                  className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-slate-900 truncate mb-1">
                        {doc.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {doc.page_count && (
                          <span>{doc.page_count} 페이지</span>
                        )}
                        <span>
                          {new Date(doc.created_at).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Settings Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Difficulty Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              2. 난이도 선택
            </h3>
            <div className="space-y-2">
              {Object.entries(difficultyLabels).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="difficulty"
                    value={value}
                    checked={difficulty === value}
                    onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-4 h-4 text-orange-600 border-slate-300 focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-slate-900">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Question Count Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              3. 문제 수 설정
            </h3>
            <div className="space-y-4">
              <input
                type="number"
                min="1"
                max="50"
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
              <p className="text-sm text-slate-600">
                1~50개 사이로 설정할 수 있습니다
              </p>
            </div>
          </div>

          {/* Question Types Section */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              4. 문제 유형 선택
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={questionTypes.multipleChoice}
                  onChange={(e) => setQuestionTypes(prev => ({ ...prev, multipleChoice: e.target.checked }))}
                  className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-slate-900">객관식</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={questionTypes.shortAnswer}
                  onChange={(e) => setQuestionTypes(prev => ({ ...prev, shortAnswer: e.target.checked }))}
                  className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-slate-900">단답형</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={questionTypes.trueFalse}
                  onChange={(e) => setQuestionTypes(prev => ({ ...prev, trueFalse: e.target.checked }))}
                  className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-slate-900">O/X</span>
              </label>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleGenerateQuiz}
            disabled={selectedDocuments.size === 0 || (!questionTypes.multipleChoice && !questionTypes.shortAnswer && !questionTypes.trueFalse) || generating}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                생성 중...
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                생성하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}