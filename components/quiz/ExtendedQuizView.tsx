'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Brain, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import MultipleChoiceQuestion from './MultipleChoiceQuestion'
import TrueFalseQuestion from './TrueFalseQuestion'
import ShortAnswerQuestion from './ShortAnswerQuestion'
import FillInTheBlankQuestion from './FillInTheBlankQuestion'
import MatchingQuestion from './MatchingQuestion'
import QuizSkeleton from '../study/QuizSkeleton'

interface ExtendedQuizQuestion {
  id: string
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
  node_id?: string
}

interface ExtendedQuizViewProps {
  documentId: string
  nodeIds: string[]
  subjectId?: string
}

export default function ExtendedQuizView({ documentId, nodeIds, subjectId }: ExtendedQuizViewProps) {
  const [questions, setQuestions] = useState<ExtendedQuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: boolean }>({})
  const router = useRouter()
  const supabase = createClient()

  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

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
        .in('question_type', ['multiple_choice', 'true_false', 'short_answer', 'fill_in_blank', 'matching'])
        .limit(8)

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
      const response = await fetch('/api/quiz/generate-extended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, nodeIds }),
      })

      if (!response.ok) throw new Error('Failed to generate quiz')

      const data = await response.json()
      setQuestions(data.questions)
      setCurrentIndex(0)
      setShowResult(false)
      setScore(0)
      setUserAnswers({})
    } catch (error) {
      console.error('Error generating quiz:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleAnswer = async (isCorrect: boolean) => {
    const currentQuestion = questions[currentIndex]
    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: isCorrect }))
    
    if (isCorrect) {
      setScore(prev => prev + 1)
    }

    // Update knowledge status based on answer
    if (currentQuestion.node_id) {
      await updateKnowledgeStatus(currentQuestion.node_id, isCorrect)
    }

    // Record quiz attempt
    await supabase.from('quiz_attempts').insert({
      user_id: FIXED_USER_ID,
      quiz_item_id: currentQuestion.id,
      user_answer: isCorrect ? 'correct' : 'incorrect',
      is_correct: isCorrect,
    })

    setShowResult(true)
  }

  const updateKnowledgeStatus = async (nodeId: string, isCorrect: boolean) => {
    const { data: currentStatus } = await supabase
      .from('user_knowledge_status')
      .select('understanding_level')
      .eq('user_id', FIXED_USER_ID)
      .eq('node_id', nodeId)
      .single()

    let newLevel = currentStatus?.understanding_level || 50
    
    if (isCorrect) {
      newLevel = Math.min(100, newLevel + 20)
    } else {
      newLevel = Math.max(0, newLevel - 30)
    }

    await supabase
      .from('user_knowledge_status')
      .upsert({
        user_id: FIXED_USER_ID,
        node_id: nodeId,
        understanding_level: newLevel,
        status: newLevel >= 80 ? 'known' : newLevel >= 50 ? 'unclear' : 'unknown',
        assessment_method: 'quiz',
        updated_at: new Date().toISOString()
      })
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setShowResult(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setShowResult(true)
    }
  }

  const renderQuestion = () => {
    const question = questions[currentIndex]
    if (!question) return null

    const commonProps = {
      question: question.question,
      explanation: question.explanation,
      sourceQuote: question.source_quote,
      onAnswer: handleAnswer,
      showResult: showResult
    }

    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            {...commonProps}
            options={question.options || []}
            correctAnswer={question.correct_answer || ''}
          />
        )
      
      case 'true_false':
        return (
          <TrueFalseQuestion
            {...commonProps}
            correctAnswer={question.correct_answer === 'O' || question.correct_answer === 'true'}
          />
        )
      
      case 'short_answer':
        return (
          <ShortAnswerQuestion
            {...commonProps}
            acceptableAnswers={question.acceptable_answers || []}
            hint={question.hint}
          />
        )
      
      case 'fill_in_blank':
        return (
          <FillInTheBlankQuestion
            {...commonProps}
            template={question.template || ''}
            blanks={question.blanks || []}
          />
        )
      
      case 'matching':
        return (
          <MatchingQuestion
            {...commonProps}
            leftItems={question.left_items || []}
            rightItems={question.right_items || []}
            correctPairs={question.correct_pairs || []}
          />
        )
      
      default:
        return null
    }
  }

  if (loading || generating) {
    return <QuizSkeleton />
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">퀴즈가 없습니다</h3>
          <p className="text-gray-600 mb-6">
            다양한 유형의 문제로 학습을 시작해보세요!
          </p>
          <button
            onClick={generateNewQuiz}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            새 퀴즈 생성
          </button>
        </div>
      </div>
    )
  }

  const isLastQuestion = currentIndex === questions.length - 1
  const currentQuestion = questions[currentIndex]

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">PDF 기반 연습문제</h2>
            <span className="text-sm text-gray-600">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              현재 점수: {score} / {currentIndex + (showResult ? 1 : 0)}
            </span>
            <button
              onClick={generateNewQuiz}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              새 퀴즈
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question type badge */}
        <div className="mt-3">
          <span className={`
            inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
            ${currentQuestion.question_type === 'multiple_choice' ? 'bg-blue-100 text-blue-800' : ''}
            ${currentQuestion.question_type === 'true_false' ? 'bg-purple-100 text-purple-800' : ''}
            ${currentQuestion.question_type === 'short_answer' ? 'bg-green-100 text-green-800' : ''}
            ${currentQuestion.question_type === 'fill_in_blank' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${currentQuestion.question_type === 'matching' ? 'bg-pink-100 text-pink-800' : ''}
          `}>
            {currentQuestion.question_type === 'multiple_choice' && '객관식'}
            {currentQuestion.question_type === 'true_false' && '참/거짓'}
            {currentQuestion.question_type === 'short_answer' && '단답형'}
            {currentQuestion.question_type === 'fill_in_blank' && '빈칸 채우기'}
            {currentQuestion.question_type === 'matching' && '짝짓기'}
          </span>
          <span className={`
            ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
            ${currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' : ''}
            ${currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${currentQuestion.difficulty === 'hard' ? 'bg-red-100 text-red-800' : ''}
          `}>
            {currentQuestion.difficulty === 'easy' && '쉬움'}
            {currentQuestion.difficulty === 'medium' && '보통'}
            {currentQuestion.difficulty === 'hard' && '어려움'}
          </span>
        </div>
      </div>

      {/* Question content */}
      <div className="p-6">
        {renderQuestion()}
      </div>

      {/* Navigation */}
      <div className="border-t px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`
              inline-flex items-center px-4 py-2 rounded-lg transition-colors
              ${currentIndex === 0 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
            `}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            이전
          </button>

          {!isLastQuestion ? (
            <button
              onClick={handleNext}
              disabled={!showResult}
              className={`
                inline-flex items-center px-4 py-2 rounded-lg transition-colors
                ${!showResult 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'}
              `}
            >
              다음
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          ) : showResult && (
            <button
              onClick={() => {
                const resultUrl = subjectId 
                  ? `/subjects/${subjectId}/quiz/result?doc=${documentId}&score=${score}&total=${questions.length}`
                  : `/subjects/${documentId}/study`
                router.push(resultUrl)
              }}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              결과 확인하기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}