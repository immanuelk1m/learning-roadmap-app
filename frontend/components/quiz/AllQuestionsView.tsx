'use client'

import { useState, useEffect } from 'react'
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
import MultipleChoiceQuestion from './MultipleChoiceQuestion'
import TrueFalseQuestion from './TrueFalseQuestion'
import ShortAnswerQuestion from './ShortAnswerQuestion'
import FillInTheBlankQuestion from './FillInTheBlankQuestion'
import MatchingQuestion from './MatchingQuestion'
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
  const [showKnowledgeUpdate, setShowKnowledgeUpdate] = useState(false)
  const [knowledgeUpdates, setKnowledgeUpdates] = useState<{
    improved: string[]
    declined: string[]
  }>({ improved: [], declined: [] })
  const [assessmentCompleted, setAssessmentCompleted] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  useEffect(() => {
    loadQuestions()
  }, [documentId])

  const loadQuestions = async () => {
    try {
      // Check if assessment is completed
      const { data: documentData, error: docError } = await supabase
        .from('documents')
        .select('assessment_completed')
        .eq('id', documentId)
        .single()

      if (docError) {
        console.error('Error checking assessment status:', docError)
      } else {
        setAssessmentCompleted(documentData?.assessment_completed || false)
      }

      // Load quiz questions (not assessment ones) - handle both false and null values
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_items')
        .select('*')
        .eq('document_id', documentId)
        .or('is_assessment.eq.false,is_assessment.is.null')
        .order('created_at', { ascending: true })

      if (quizError) {
        console.error('Error loading questions:', quizError)
        toast.error('문제를 불러오는 중 오류가 발생했습니다.')
        return
      }

      console.log(`Loaded ${quizData?.length || 0} quiz questions for document ${documentId}`)

      // Load knowledge nodes
      const { data: nodeData, error: nodeError } = await supabase
        .from('knowledge_nodes')
        .select('id, name')
        .eq('document_id', documentId)

      if (nodeError) {
        console.error('Error loading nodes:', nodeError)
      }

      setQuestions(quizData || [])
      setNodes(nodeData || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('문제를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const generateFallbackQuestions = async () => {
    if (generating) return
    
    setGenerating(true)
    
    try {
      console.log('Generating fallback quiz for completed assessment...')
      
      const response = await fetch('/api/quiz/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentIds: [documentId],
          difficulty: 'normal',
          questionCount: 10,
          questionTypes: {
            multipleChoice: true,
            shortAnswer: false,
            trueFalse: false
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate quiz')
      }

      const result = await response.json()
      
      if (result.questionsGenerated && result.questionsGenerated > 0) {
        console.log(`Generated ${result.questionsGenerated} fallback questions`)
        // Reload questions to show the newly generated ones
        await loadQuestions()
      } else {
        throw new Error('No questions were generated')
      }
    } catch (error: any) {
      console.error('Error generating fallback questions:', error)
      alert('문제 생성에 실패했습니다. 새로고침 후 다시 시도해주세요.')
    } finally {
      setGenerating(false)
    }
  }

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
          
        case 'fill_in_blank':
          if (question.blanks && Array.isArray(userAnswer)) {
            isCorrect = question.blanks.every((blank: any, index: number) => {
              const userAns = userAnswer[index]?.toLowerCase().trim()
              const correctAns = blank.answer?.toLowerCase().trim()
              const alternatives = blank.alternatives?.map((alt: string) => alt.toLowerCase().trim()) || []
              return userAns === correctAns || alternatives.includes(userAns)
            })
          }
          break
          
        case 'matching':
          if (question.correct_pairs && typeof userAnswer === 'object') {
            const correctPairs = question.correct_pairs
            isCorrect = correctPairs.every((pair: any) => 
              userAnswer[pair.left_index] === pair.right_index
            )
          }
          break
      }

      newResults[question.id] = isCorrect
    })

    return newResults
  }

  const handleCheckAnswers = () => {
    const calculatedResults = calculateResults()
    setResults(calculatedResults)
    setShowResults(true)

    // Save quiz attempts
    questions.forEach(async (question) => {
      const isCorrect = calculatedResults[question.id]
      
      await supabase.from('quiz_attempts').insert({
        user_id: FIXED_USER_ID,
        quiz_item_id: question.id,
        user_answer: JSON.stringify(userAnswers[question.id]),
        is_correct: isCorrect,
      })
    })
  }

  const updateKnowledgeStatus = async () => {
    const nodeUpdates: { [nodeId: string]: { correct: number, total: number } } = {}
    
    // Calculate performance by node
    questions.forEach(question => {
      if (question.node_id) {
        if (!nodeUpdates[question.node_id]) {
          nodeUpdates[question.node_id] = { correct: 0, total: 0 }
        }
        nodeUpdates[question.node_id].total++
        if (results[question.id]) {
          nodeUpdates[question.node_id].correct++
        }
      }
    })

    const improved: string[] = []
    const declined: string[] = []

    // Update understanding levels
    for (const [nodeId, performance] of Object.entries(nodeUpdates)) {
      const { data: currentStatus } = await supabase
        .from('user_knowledge_status')
        .select('understanding_level')
        .eq('user_id', FIXED_USER_ID)
        .eq('node_id', nodeId)
        .single()

      const currentLevel = currentStatus?.understanding_level || 50
      const performanceRate = performance.correct / performance.total
      
      let newLevel = currentLevel
      if (performanceRate >= 0.8) {
        newLevel = Math.min(100, currentLevel + 20)
        if (newLevel > currentLevel) {
          const node = nodes.find(n => n.id === nodeId)
          if (node) improved.push(node.name)
        }
      } else if (performanceRate < 0.5) {
        newLevel = Math.max(0, currentLevel - 20)
        if (newLevel < currentLevel) {
          const node = nodes.find(n => n.id === nodeId)
          if (node) declined.push(node.name)
        }
      }

      await supabase
        .from('user_knowledge_status')
        .upsert({
          user_id: FIXED_USER_ID,
          node_id: nodeId,
          understanding_level: newLevel,
          assessment_method: 'quiz',
          last_reviewed: new Date().toISOString(),
        })
    }

    setKnowledgeUpdates({ improved, declined })
    setShowKnowledgeUpdate(true)
  }

  const handleNext = async () => {
    if (!showKnowledgeUpdate) {
      await updateKnowledgeStatus()
    } else {
      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
    }
  }

  if (loading) {
    return <QuizSkeleton />
  }

  if (questions.length === 0) {
    if (!assessmentCompleted) {
      return (
        <div className="text-center py-16">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">O/X 평가를 먼저 완료해주세요.</p>
          <p className="text-sm text-gray-400 mb-6">평가 완료 후 맞춤형 연습 문제가 자동으로 생성됩니다.</p>
          <div className="space-x-4">
            <button
              onClick={() => router.push(`/subjects/${subjectId}/study/assessment?doc=${documentId}`)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              O/X 평가 시작하기
            </button>
            <button
              onClick={() => router.push(`/subjects/${subjectId}/study?doc=${documentId}`)}
              className="text-gray-600 hover:text-gray-800"
            >
              학습으로 돌아가기
            </button>
          </div>
        </div>
      )
    }
    
    return (
      <div className="text-center py-16">
        <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">연습 문제 생성에 문제가 발생했습니다.</p>
        <p className="text-sm text-gray-400 mb-6">O/X 평가는 완료되었지만 연습 문제가 자동 생성되지 않았습니다.</p>
        <div className="space-x-4">
          <button
            onClick={generateFallbackQuestions}
            disabled={generating}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                문제 생성 중...
              </>
            ) : (
              '연습 문제 생성하기'
            )}
          </button>
          <button
            onClick={loadQuestions}
            disabled={generating}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }

  const totalQuestions = questions.length
  const correctAnswers = Object.values(results).filter(r => r).length
  const score = Math.round((correctAnswers / totalQuestions) * 100)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
        <h2 className="text-2xl font-bold mb-2">문제풀고 지식트리 완성하기</h2>
        <p className="text-gray-600">
          모든 문제를 풀고 하단의 "정답 확인하기" 버튼을 클릭하세요.
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-500">
                    문제 {index + 1}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {question.difficulty === 'easy' ? '쉬움' : 
                     question.difficulty === 'medium' ? '보통' : '어려움'}
                  </span>
                </div>
                <h3 className="text-lg font-medium">{question.question}</h3>
              </div>
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

            {/* Question Component */}
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
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      userAnswers[question.id] === '참' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${showResults ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    참
                  </button>
                  <button
                    onClick={() => handleAnswerChange(question.id, '거짓')}
                    disabled={showResults}
                    className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                      userAnswers[question.id] === '거짓' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${showResults ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    거짓
                  </button>
                </div>
              )}

              {question.question_type === 'short_answer' && (
                <div>
                  <input
                    type="text"
                    value={userAnswers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    disabled={showResults}
                    placeholder="답을 입력하세요"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {question.hint && (
                    <p className="text-sm text-gray-500 mt-2">힌트: {question.hint}</p>
                  )}
                </div>
              )}

              {question.question_type === 'fill_in_blank' && (
                <div className="text-left">
                  {question.template?.split('___').map((part: string, idx: number) => (
                    <span key={idx}>
                      {part}
                      {idx < (question.template?.split('___').length || 0) - 1 && (
                        <input
                          type="text"
                          value={userAnswers[question.id]?.[idx] || ''}
                          onChange={(e) => {
                            const newAnswers = [...(userAnswers[question.id] || [])]
                            newAnswers[idx] = e.target.value
                            handleAnswerChange(question.id, newAnswers)
                          }}
                          disabled={showResults}
                          className="inline-block mx-2 px-3 py-1 border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </span>
                  ))}
                </div>
              )}

              {question.question_type === 'matching' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">항목</h4>
                    {question.left_items?.map((item: string, idx: number) => (
                      <div key={idx} className="mb-2 p-3 bg-gray-50 rounded">
                        {idx + 1}. {item}
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">매칭</h4>
                    {question.left_items?.map((_: any, idx: number) => (
                      <div key={idx} className="mb-2">
                        <select
                          value={userAnswers[question.id]?.[idx] || ''}
                          onChange={(e) => {
                            const newAnswers = { ...(userAnswers[question.id] || {}) }
                            newAnswers[idx] = parseInt(e.target.value)
                            handleAnswerChange(question.id, newAnswers)
                          }}
                          disabled={showResults}
                          className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">선택...</option>
                          {question.right_items?.map((item: string, rightIdx: number) => (
                            <option key={rightIdx} value={rightIdx}>
                              {String.fromCharCode(65 + rightIdx)}. {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Explanation (shown after results) */}
            {showResults && (
              <div className={`mt-4 p-4 rounded-lg ${
                results[question.id] ? 'bg-green-50' : 'bg-red-50'
              }`}>
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

      {/* Bottom Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        {!showResults ? (
          <button
            onClick={handleCheckAnswers}
            disabled={Object.keys(userAnswers).length < questions.length}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            정답 확인하기 ({Object.keys(userAnswers).length}/{questions.length} 문제 완료)
          </button>
        ) : !showKnowledgeUpdate ? (
          <div className="text-center">
            <div className="mb-6">
              <Trophy className={`h-16 w-16 mx-auto mb-4 ${
                score >= 80 ? 'text-yellow-500' : 
                score >= 60 ? 'text-gray-400' : 'text-gray-300'
              }`} />
              <h3 className="text-2xl font-bold mb-2">
                {score}점
              </h3>
              <p className="text-gray-600">
                {totalQuestions}문제 중 {correctAnswers}문제 정답
              </p>
            </div>
            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              다음
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-xl font-bold mb-4">지식 노드 업데이트 결과</h3>
            
            {knowledgeUpdates.improved.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-medium">향상된 개념</span>
                </div>
                <div className="space-y-1">
                  {knowledgeUpdates.improved.map((name, idx) => (
                    <div key={idx} className="text-sm text-gray-700">
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {knowledgeUpdates.declined.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                  <TrendingDown className="h-5 w-5" />
                  <span className="font-medium">복습이 필요한 개념</span>
                </div>
                <div className="space-y-1">
                  {knowledgeUpdates.declined.map((name, idx) => (
                    <div key={idx} className="text-sm text-gray-700">
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {knowledgeUpdates.improved.length === 0 && knowledgeUpdates.declined.length === 0 && (
              <p className="text-gray-600 mb-4">지식 수준에 큰 변화가 없습니다.</p>
            )}

            <button
              onClick={handleNext}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              학습으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}