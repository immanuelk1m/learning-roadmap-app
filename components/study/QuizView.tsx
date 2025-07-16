'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Brain, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import QuizSkeleton from './QuizSkeleton'

interface QuizQuestion {
  id: string
  question: string
  options: any
  correct_answer: string
  explanation: string
  source_quote: string
  difficulty: string
  node_id?: string
}

interface QuizViewProps {
  documentId: string
  nodeIds: string[]
}

export default function QuizView({ documentId, nodeIds }: QuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadExistingQuiz()
  }, [documentId])

  const loadExistingQuiz = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('quiz_items')
        .select('*')
        .eq('document_id', documentId)
        .in('node_id', nodeIds)
        .limit(5)

      if (data && data.length > 0) {
        setQuestions(data)
      }
    } catch (error) {
      console.error('Error loading quiz:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateNewQuiz = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, nodeIds }),
      })

      if (!response.ok) throw new Error('Failed to generate quiz')

      const data = await response.json()
      setQuestions(data.questions)
      setCurrentIndex(0)
      setSelectedAnswer(null)
      setShowResult(false)
      setScore(0)
    } catch (error) {
      console.error('Error generating quiz:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleAnswerSelect = async (answer: string) => {
    if (showResult) return

    setSelectedAnswer(answer)
    setShowResult(true)

    const isCorrect = answer === currentQuestion.correct_answer
    if (isCorrect) setScore(score + 1)

    // Record attempt
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        quiz_item_id: currentQuestion.id,
        user_answer: answer,
        is_correct: isCorrect,
      })

      if (!isCorrect) {
        await supabase.from('missed_questions').upsert({
          user_id: user.id,
          quiz_item_id: currentQuestion.id,
          document_id: documentId,
          node_id: currentQuestion.node_id,
          source_quote: currentQuestion.source_quote,
        })
      }
    }
  }

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    }
  }

  if (loading) {
    return <QuizSkeleton />
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Brain className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">퀴즈 준비</h2>
        <p className="text-gray-600 mb-6">취약점 분석을 기반으로 맞춤형 문제를 생성합니다</p>
        <button
          onClick={generateNewQuiz}
          disabled={generating}
          className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {generating ? '문제 생성 중...' : '퀴즈 시작하기'}
        </button>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const isLastQuestion = currentIndex === questions.length - 1

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">문제 {currentIndex + 1} / {questions.length}</h2>
          <div className="text-lg font-medium">
            점수: {score} / {currentIndex + (showResult ? 1 : 0)}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gray-600 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
            currentQuestion.difficulty === 'easy'
              ? 'bg-gray-100 text-gray-700'
              : currentQuestion.difficulty === 'medium'
              ? 'bg-gray-200 text-gray-800'
              : 'bg-gray-300 text-gray-900'
          }`}>
            {currentQuestion.difficulty === 'easy' ? '쉬움' : 
             currentQuestion.difficulty === 'medium' ? '보통' : '어려움'}
          </span>
          <h3 className="text-xl font-semibold">{currentQuestion.question}</h3>
        </div>

        <div className="space-y-3">
          {(Array.isArray(currentQuestion.options) ? currentQuestion.options : []).map((option, index) => {
            const isCorrect = option === currentQuestion.correct_answer
            const isSelected = option === selectedAnswer

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={showResult}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  showResult
                    ? isCorrect
                      ? 'border-gray-700 bg-gray-100'
                      : isSelected
                      ? 'border-gray-500 bg-gray-50'
                      : 'border-gray-200'
                    : isSelected
                    ? 'border-gray-600 bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && (
                    <>
                      {isCorrect && <CheckCircle className="h-5 w-5 text-gray-700" />}
                      {isSelected && !isCorrect && <XCircle className="h-5 w-5 text-gray-500" />}
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {showResult && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-gray-600" />
              해설
            </h4>
            <p className="text-gray-700 mb-3">{currentQuestion.explanation}</p>
            <div className="p-3 bg-gray-100 rounded italic text-sm">
              <p className="font-medium mb-1">📖 원문 참조:</p>
              <p className="text-gray-600">"{currentQuestion.source_quote}"</p>
            </div>
          </div>
        )}
      </div>

      {showResult && (
        <div className="flex justify-end">
          {!isLastQuestion ? (
            <button
              onClick={nextQuestion}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              다음 문제
            </button>
          ) : (
            <div className="text-center w-full">
              <h3 className="text-2xl font-bold mb-2">퀴즈 완료!</h3>
              <p className="text-lg mb-4">
                최종 점수: {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
              </p>
              <button
                onClick={() => router.refresh()}
                className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
              >
                학습 현황 보기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}