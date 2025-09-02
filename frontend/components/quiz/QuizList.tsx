'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Brain, Calendar, ChevronRight, Plus, Check, ArrowLeft, Sparkles, Loader2, Trash2 } from 'lucide-react'
import DeleteQuizSetButton from './DeleteQuizSetButton'
import { createClient } from '@/lib/supabase/client'
import DeleteQuizButton from './DeleteQuizButton'

interface Document {
  id: string
  title: string
  status: string
  created_at: string
  subject_id: string
  file_path: string
  file_size: number | null
  page_count: number | null
  assessment_completed: boolean | null
  quiz_generation_status?: {
    generated: boolean
    count: number
    last_attempt?: string
    practice_count?: number
    assessment_count?: number
  }
}

interface QuizSession {
  id: string
  document_id: string
  created_at: string
  status: 'in_progress' | 'completed' | 'abandoned'
  total_questions: number
  quiz_type: 'practice' | 'assessment' | 'missed_questions'
  time_completed?: string
}

interface QuizListProps {
  subjectId: string
  documents: Document[]
}

type DifficultyLevel = 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard'

export default function QuizList({ subjectId, documents }: QuizListProps) {
  const [quizDocuments, setQuizDocuments] = useState<Document[]>([])
  const [quizSessions, setQuizSessions] = useState<{ [key: string]: QuizSession[] }>({})
  const [quizSets, setQuizSets] = useState<{ [key: string]: { id: string; name: string; created_at: string }[] }>({})
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
  const [generatingForDoc, setGeneratingForDoc] = useState<{ [key: string]: boolean }>({})
  const supabase = createClient()
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  useEffect(() => {
    const fetchQuizData = async () => {
      // Filter documents that have quiz_generation_status
      const docsWithQuiz = documents.filter(doc => doc.quiz_generation_status?.generated && doc.status === 'completed')
      setQuizDocuments(docsWithQuiz)
      
      // Fetch quiz sessions and quiz sets for each document
      const sessionsMap: { [key: string]: QuizSession[] } = {}
      const setsMap: { [key: string]: { id: string; name: string; created_at: string }[] } = {}
      
      for (const doc of docsWithQuiz) {
        const { data: sessions, error } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('document_id', doc.id)
          .eq('user_id', FIXED_USER_ID)
          .order('created_at', { ascending: false })
        
        if (!error && sessions) {
          // Filter out sessions with null document_id
          const validSessions = sessions.filter(s => s.document_id !== null) as QuizSession[]
          sessionsMap[doc.id] = validSessions
        }
        // Fetch quiz_sets ordered by created_at ASC
        const { data: sets } = await supabase
          .from('quiz_sets')
          .select('id, name, created_at')
          .eq('document_id', doc.id)
          .order('created_at', { ascending: true })
        if (sets) {
          setsMap[doc.id] = sets
        }
      }

      setQuizSessions(sessionsMap)
      setQuizSets(setsMap)
      setLoading(false)
    }
    
    fetchQuizData()
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

  const handleGenerateSmartQuiz = async (documentId: string) => {
    setGeneratingForDoc(prev => ({ ...prev, [documentId]: true }))
    
    try {
      const response = await fetch('/api/quiz/generate-smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate smart quiz')
      }

      const result = await response.json()
      console.log('Smart quiz generated:', result)
      
      // Show success message
      alert(`${result.message || '맞춤형 문제가 생성되었습니다!'}`)
      
      // Refresh quiz sessions to show the new quiz
      const { data: sessions, error } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', FIXED_USER_ID)
        .order('created_at', { ascending: false })
      
      if (!error && sessions) {
        // Filter out sessions with null document_id
        const validSessions = sessions.filter(s => s.document_id !== null) as QuizSession[]
        setQuizSessions(prev => ({
          ...prev,
          [documentId]: validSessions
        }))
      }
    } catch (error: any) {
      console.error('Failed to generate smart quiz:', error)
      alert(error.message || '문제 생성 중 오류가 발생했습니다.')
    } finally {
      setGeneratingForDoc(prev => ({ ...prev, [documentId]: false }))
    }
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

  const handleQuizDeleted = () => {
    // Refresh the page to update the quiz list
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    )
  }

  const formatSessionName = (doc: Document, session: QuizSession, index: number) => {
    const docTitle = doc.title.replace(/\.pdf$/i, '')
    const sessionNumber = index + 1
    return `${docTitle}_${sessionNumber}차_문제`
  }

  // View mode - show existing quizzes
  if (mode === 'view') {
    if (quizDocuments.length === 0) {
      return (
        <div>
          {/* Header with mode toggle */}
          <div className="px-8 py-6 border-b border-slate-200/60 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  생성된 문제집
                </h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-emerald-600">
                  {quizDocuments.length}개
                </span>
              </div>
              <button
                onClick={() => setMode('generate')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2f332f] text-[#2ce477] font-medium rounded-lg hover:shadow-md hover:scale-105 transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                새 문제집 생성
              </button>
            </div>
          </div>
          
          <div className="px-8 py-20 text-center">
            {/* Empty State */}
            <div className="relative mx-auto w-24 h-24 mb-8">
              <div className="absolute inset-0 bg-gray-200 rounded-2xl rotate-6 opacity-60" />
              <div className="absolute inset-0 bg-gray-300 rounded-2xl -rotate-6 opacity-40" />
              <div className="relative w-full h-full bg-[#2f332f] rounded-2xl flex items-center justify-center shadow-lg">
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
                {quizDocuments.length}개 문서
              </span>
            </div>
            <button
              onClick={() => setMode('generate')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white font-medium rounded-lg hover:shadow-md hover:scale-105 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              새 문제집 생성
            </button>
          </div>
        </div>

        {/* Quiz Columns with Horizontal Scroll */}
        <div className="px-8 py-6 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400">
          <div className="flex gap-6 min-w-min pb-2">
            {quizDocuments.map((doc) => {
              const questionCount = doc.quiz_generation_status?.count || 0
              const isAssessmentCompleted = doc.assessment_completed || false
              const sessions = quizSessions[doc.id] || []
              const sets = quizSets[doc.id] || []
              
              return (
                <div key={doc.id} className="flex-shrink-0 w-[400px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  {/* Document Header */}
                  <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 bg-[#2f332f] rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-slate-900 whitespace-normal break-words line-clamp-2">
                            {doc.title.replace(/\.pdf$/i, '')}
                          </h3>
                          <div className="flex flex-col gap-1 mt-1 text-xs text-slate-600">
                            <span className="text-slate-400">
                              {new Date(doc.created_at).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-2">
                        <DeleteQuizButton
                          documentId={doc.id}
                          documentTitle={doc.title}
                          onDeleteSuccess={handleQuizDeleted}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Quiz Sets List (ordered by created_at ASC, using quiz_sets.name) */}
                  <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent hover:scrollbar-thumb-slate-300">
                    {sets.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {sets.map((qs) => (
                          <Link
                            key={qs.id}
                            href={`/subjects/${subjectId}/quiz?doc=${doc.id}&set=${qs.id}`}
                            className="block px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-gray-200 transition-colors">
                                <Brain className="w-3.5 h-3.5 text-gray-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                                  {qs.name}
                                </h4>
                                {/* Date removed as requested */}
                              </div>
                              <div className="flex items-center gap-1">
                                <DeleteQuizSetButton
                                  quizSetId={qs.id}
                                  quizSetName={qs.name}
                                  onDeleted={() => window.location.reload()}
                                />
                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors mt-0.5" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 py-12 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl mb-3">
                          <Brain className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-xs text-slate-500 mb-4">생성된 문제집이 없습니다</p>
                        {isAssessmentCompleted ? (
                          <Link
                            href={`/subjects/${subjectId}/quiz?doc=${doc.id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-[#2f332f] text-[#2ce477] font-medium rounded-lg hover:shadow-md transition-all duration-200 text-xs"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            새 문제집 풀기
                          </Link>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 font-medium rounded-lg text-xs">
                            <Brain className="w-3.5 h-3.5 opacity-50" />
                            평가 필요
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Smart Quiz Generation Button */}
                  {isAssessmentCompleted && (
                    <div className="border-t border-slate-100 p-4">
                      <button
                        onClick={() => handleGenerateSmartQuiz(doc.id)}
                        disabled={generatingForDoc[doc.id]}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 
                                   border-2 border-dashed border-slate-300 rounded-lg
                                   hover:border-emerald-500 hover:bg-emerald-50 
                                   transition-all duration-200 group
                                   disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingForDoc[doc.id] ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                            <span className="text-sm text-slate-600">AI가 분석 중...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                            <span className="text-sm font-medium text-slate-600 group-hover:text-emerald-600 transition-colors">
                              딱 맞는 문제 생성 +
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
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
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#2f332f] rounded-lg flex items-center justify-center flex-shrink-0">
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
                    className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
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
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
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
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-900">객관식</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={questionTypes.shortAnswer}
                  onChange={(e) => setQuestionTypes(prev => ({ ...prev, shortAnswer: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-slate-900">단답형</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={questionTypes.trueFalse}
                  onChange={(e) => setQuestionTypes(prev => ({ ...prev, trueFalse: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
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
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#2f332f] text-[#2ce477] font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
