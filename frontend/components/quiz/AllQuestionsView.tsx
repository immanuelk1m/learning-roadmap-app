'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  BookOpen,
  Trophy,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import QuizSkeleton from '../study/QuizSkeleton'

interface ExtendedQuizQuestion {
  id: string
  node_id?: string
  question: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_in_blank' | 'matching'
  options?: any
  correct_answer?: string
  acceptable_answers?: any
  template?: string
  blanks?: any
  left_items?: any
  right_items?: any
  correct_pairs?: any
  explanation: string
  source_quote: string
  difficulty: string
  hint?: string
}

interface KnowledgeNode {
  id: string
  name: string
}

interface AllQuestionsViewProps {
  documentId: string
  subjectId: string
}

export default function AllQuestionsView({ documentId, subjectId }: AllQuestionsViewProps) {
  const [questions, setQuestions] = useState<ExtendedQuizQuestion[]>([])
  const [nodes, setNodes] = useState<KnowledgeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({})
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<{ [key: string]: boolean }>({})
  const [generating, setGenerating] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const loadQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_items')
        .select('*')
        .eq('document_id', documentId)
        .or('is_assessment.eq.false,is_assessment.is.null')
        .order('created_at', { ascending: true })

      if (quizError) {
        throw quizError
      }

      setQuestions((quizData || []) as ExtendedQuizQuestion[])
    } catch (error) {
      console.error('Error loading questions:', error)
      toast.error('문제를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [documentId, supabase])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const handleAnswerChange = (questionId: string, answer: any) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const calculateResults = () => {
    const newResults: { [key: string]: boolean } = {}
    questions.forEach(question => {
      const userAnswer = userAnswers[question.id]
      let isCorrect = false

      switch (question.question_type) {
        case 'multiple_choice':
        case 'true_false':
          isCorrect = userAnswer === question.correct_answer
          break
        case 'short_answer':
          const acceptableAnswers = question.acceptable_answers || [question.correct_answer]
          isCorrect = acceptableAnswers.some((ans: string) => 
            ans.toLowerCase().trim() === userAnswer?.toLowerCase().trim()
          )
          break
        // Other question types can be handled here
      }
      newResults[question.id] = isCorrect
    })
    return newResults
  }

  const handleCheckAnswers = () => {
    const calculatedResults = calculateResults()
    setResults(calculatedResults)
    setShowResults(true)
  }

  const handleNext = () => {
    router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
  }

  if (loading) {
    return <QuizSkeleton />
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">이 문서에 대한 연습 문제가 아직 없습니다.</p>
        <button
          onClick={() => router.push(`/subjects/${subjectId}/study?doc=${documentId}`)}
          className="text-gray-600 hover:text-gray-800"
        >
          학습으로 돌아가기
        </button>
      </div>
    )
  }

  const totalQuestions = questions.length
  const correctAnswers = Object.values(results).filter(r => r).length
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        <h2 className="text-2xl font-bold mb-2">연습 퀴즈</h2>
        <p className="text-gray-600">
          모든 문제를 풀고 하단의 "정답 확인하기" 버튼을 클릭하세요.
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-medium">문제 {index + 1}. {question.question}</h3>
              {showResults && (
                <div className="ml-4">
                  {results[question.id] ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>
              )}
            </div>

            <div className="mb-4">
              {question.question_type === 'multiple_choice' && (
                <div className="space-y-2">
                  {question.options?.map((option: string, idx: number) => (
                    <label key={idx} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name={question.id}
                        value={option}
                        checked={userAnswers[question.id] === option}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        disabled={showResults}
                        className="mr-3"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}
              {question.question_type === 'true_false' && (
                 <div className="flex gap-4">
                   <button
                     onClick={() => handleAnswerChange(question.id, '참')}
                     disabled={showResults}
                     className={`flex-1 p-4 rounded-lg border-2 transition-all ${userAnswers[question.id] === '참' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'} ${showResults ? 'cursor-not-allowed opacity-60' : ''}`}
                   >
                     참
                   </button>
                   <button
                     onClick={() => handleAnswerChange(question.id, '거짓')}
                     disabled={showResults}
                     className={`flex-1 p-4 rounded-lg border-2 transition-all ${userAnswers[question.id] === '거짓' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'} ${showResults ? 'cursor-not-allowed opacity-60' : ''}`}
                   >
                     거짓
                   </button>
                 </div>
              )}
              {question.question_type === 'short_answer' && (
                <input
                  type="text"
                  value={userAnswers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  disabled={showResults}
                  placeholder="답을 입력하세요"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {showResults && (
              <div className={`mt-4 p-4 rounded-lg ${results[question.id] ? 'bg-green-50' : 'bg-red-50'}`}>
                {!results[question.id] && (
                  <p className="text-sm font-medium mb-2">
                    정답: {question.correct_answer}
                  </p>
                )}
                {question.explanation && (
                  <p className="text-sm text-gray-700">{question.explanation}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        {!showResults ? (
          <button
            onClick={handleCheckAnswers}
            disabled={Object.keys(userAnswers).length < questions.length}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            정답 확인하기 ({Object.keys(userAnswers).length}/{questions.length} 문제 완료)
          </button>
        ) : (
          <div className="text-center">
            <div className="mb-6">
              <Trophy className={`h-16 w-16 mx-auto mb-4 ${score >= 80 ? 'text-yellow-500' : score >= 60 ? 'text-gray-400' : 'text-gray-300'}`} />
              <h3 className="text-2xl font-bold mb-2">{score}점</h3>
              <p className="text-gray-600">{totalQuestions}문제 중 {correctAnswers}문제 정답</p>
            </div>
            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              학습으로 돌아가기
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
