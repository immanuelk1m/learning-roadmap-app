'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, ArrowRight, CircleX, CircleCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { assessmentLogger, supabaseLogger, quizLogger } from '@/lib/logger'
import Logger from '@/lib/logger'

interface KnowledgeNode {
  id: string
  name: string
  description: string
  level: number
  prerequisites: string[]
  parent_id: string | null
}

interface QuizQuestion {
  id: string
  node_id: string
  question: string
  correct_answer: string
  explanation: string | null
}

interface OXKnowledgeAssessmentProps {
  nodes: KnowledgeNode[]
  subjectId: string
  documentId: string
}

export default function OXKnowledgeAssessment({ 
  nodes, 
  subjectId, 
  documentId 
}: OXKnowledgeAssessmentProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [assessments, setAssessments] = useState<Record<string, 'known' | 'unknown'>>({})
  const [skippedNodes, setSkippedNodes] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewSkipped, setPreviewSkipped] = useState<string[]>([])
  const [questions, setQuestions] = useState<Record<string, QuizQuestion>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [userAnswer, setUserAnswer] = useState<'O' | 'X' | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasQuestions, setHasQuestions] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Generate correlation ID for this assessment session
  const [correlationId] = useState(() => Logger.generateCorrelationId())
  const [sessionStartTime] = useState(() => Date.now())
  
  useEffect(() => {
    assessmentLogger.info('OX Knowledge Assessment component mounted', {
      correlationId,
      documentId,
      metadata: {
        subjectId,
        totalNodes: nodes.length,
        nodeNames: nodes.map(n => n.name)
      }
    })
    
    return () => {
      const sessionDuration = Date.now() - sessionStartTime
      assessmentLogger.info('OX Knowledge Assessment component unmounted', {
        correlationId,
        documentId,
        duration: sessionDuration,
        metadata: {
          completedAssessments: Object.keys(assessments).length,
          skippedNodes: skippedNodes.size
        }
      })
    }
  }, [])

  const currentNode = nodes[currentIndex]
  const currentQuestion = questions[currentNode?.id]
  
  const totalAssessed = Object.keys(assessments).length
  const totalSkipped = skippedNodes.size
  const progress = Math.min((totalAssessed / nodes.length) * 100, 100)
  
  const remainingAssessableNodes = nodes.filter((node, index) => 
    index > currentIndex && 
    !skippedNodes.has(node.id) && 
    !(node.id in assessments)
  ).length

  // Load quiz questions for all nodes
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true)
      const loadTimer = quizLogger.startTimer()
      
      try {
        const nodeIds = nodes.map(n => n.id)
        
        quizLogger.info('Loading O/X quiz questions', {
          correlationId,
          documentId,
          metadata: {
            nodeCount: nodeIds.length,
            nodeIds: nodeIds.slice(0, 10) // Log first 10 for debugging
          }
        })
        
        const { data, error } = await supabase
          .from('quiz_items')
          .select('*')
          .in('node_id', nodeIds)
          .eq('question_type', 'true_false')
          .eq('is_assessment', true)

        const loadDuration = loadTimer()
        
        if (error) {
          quizLogger.error('Failed to load quiz questions', {
            correlationId,
            documentId,
            error,
            duration: loadDuration,
            metadata: {
              errorMessage: error.message || error.toString(),
              nodeIds
            }
          })
          setHasQuestions(false)
        } else if (data) {
          const questionMap: Record<string, QuizQuestion> = {}
          data.forEach(item => {
            if (item.node_id) {
              questionMap[item.node_id] = {
                id: item.id,
                node_id: item.node_id,
                question: item.question,
                correct_answer: item.correct_answer,
                explanation: item.explanation
              }
            }
          })
          
          quizLogger.info('Quiz questions loaded successfully', {
            correlationId,
            documentId,
            duration: loadDuration,
            metadata: {
              totalQuestions: data.length,
              mappedQuestions: Object.keys(questionMap).length,
              unmappedQuestions: data.length - Object.keys(questionMap).length,
              hasQuestions: Object.keys(questionMap).length > 0
            }
          })
          
          setQuestions(questionMap)
          setHasQuestions(Object.keys(questionMap).length > 0)
        } else {
          quizLogger.warn('No quiz questions returned', {
            correlationId,
            documentId,
            duration: loadDuration,
            metadata: {
              nodeIds
            }
          })
          setHasQuestions(false)
        }
      } catch (error: any) {
        const duration = loadTimer()
        quizLogger.error('Exception while loading questions', {
          correlationId,
          documentId,
          error,
          duration,
          metadata: {
            errorType: error.name,
            errorMessage: error.message
          }
        })
        setHasQuestions(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadQuestions()
  }, [nodes, supabase, correlationId, documentId])

  const buildDependencyMap = () => {
    const dependencyMap = new Map<string, string[]>()
    
    nodes.forEach(node => {
      node.prerequisites.forEach(prerequisiteName => {
        if (!dependencyMap.has(prerequisiteName)) {
          dependencyMap.set(prerequisiteName, [])
        }
        dependencyMap.get(prerequisiteName)!.push(node.id)
      })
    })
    
    return dependencyMap
  }

  const dependencyMap = buildDependencyMap()

  const findDependentNodesToSkip = (nodeId: string): string[] => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return []
    
    const nodesToSkip: string[] = []
    const processed = new Set<string>()
    
    const prerequisiteDependents = dependencyMap.get(node.name) || []
    const childNodes = nodes
      .filter(n => n.parent_id === nodeId)
      .map(n => n.id)
    
    const allDependents = [...new Set([...prerequisiteDependents, ...childNodes])]
    const queue = [...allDependents]
    
    while (queue.length > 0) {
      const currentId = queue.shift()!
      
      if (processed.has(currentId)) continue
      processed.add(currentId)
      
      if (!(currentId in assessments)) {
        nodesToSkip.push(currentId)
        
        const currentNode = nodes.find(n => n.id === currentId)
        if (currentNode) {
          const morePrerequisiteDependents = dependencyMap.get(currentNode.name) || []
          const moreChildNodes = nodes
            .filter(n => n.parent_id === currentId)
            .map(n => n.id)
          
          queue.push(...morePrerequisiteDependents, ...moreChildNodes)
        }
      }
    }
    
    return nodesToSkip
  }

  const findNextAssessableNode = (startIndex: number = currentIndex + 1): number => {
    for (let i = startIndex; i < nodes.length; i++) {
      const nodeId = nodes[i].id
      if (!skippedNodes.has(nodeId) && !(nodeId in assessments)) {
        return i
      }
    }
    return -1
  }

  const handleAnswer = async (answer: 'O' | 'X') => {
    if (showFeedback) return
    
    const answerTimer = assessmentLogger.startTimer()
    
    setUserAnswer(answer)
    
    // Determine if answer is correct
    const isAnswerCorrect = currentQuestion?.correct_answer === answer
    setIsCorrect(isAnswerCorrect)
    setShowFeedback(true)
    
    assessmentLogger.info('Quiz answer submitted', {
      correlationId,
      documentId,
      metadata: {
        nodeId: currentNode?.id,
        nodeName: currentNode?.name,
        questionId: currentQuestion?.id,
        userAnswer: answer,
        correctAnswer: currentQuestion?.correct_answer,
        isCorrect: isAnswerCorrect,
        currentIndex,
        totalNodes: nodes.length
      }
    })

    // Save quiz attempt
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'
    if (currentQuestion) {
      try {
        const { error } = await supabase
          .from('quiz_attempts')
          .insert({
            user_id: FIXED_USER_ID,
            quiz_item_id: currentQuestion.id,
            user_answer: answer,
            is_correct: isAnswerCorrect,
            time_spent: null
          })
        
        const duration = answerTimer()
        
        if (error) {
          supabaseLogger.error('Failed to save quiz attempt', {
            correlationId,
            documentId,
            error,
            duration,
            metadata: {
              questionId: currentQuestion.id,
              errorMessage: error.message || error.toString()
            }
          })
        } else {
          supabaseLogger.info('Quiz attempt saved', {
            correlationId,
            documentId,
            duration,
            metadata: {
              questionId: currentQuestion.id,
              isCorrect: isAnswerCorrect
            }
          })
        }
      } catch (error: any) {
        assessmentLogger.error('Exception while saving quiz attempt', {
          correlationId,
          documentId,
          error,
          metadata: {
            errorType: error.name,
            errorMessage: error.message
          }
        })
      }
    }

    // Update assessments based on answer
    const status: 'known' | 'unknown' = isAnswerCorrect ? 'known' : 'unknown'
    let newAssessments: Record<string, 'known' | 'unknown'> = { ...assessments, [currentNode.id]: status }
    let newSkippedNodes = new Set(skippedNodes)
    
    if (!isAnswerCorrect) {
      const nodesToSkip = findDependentNodesToSkip(currentNode.id)
      setPreviewSkipped(nodesToSkip) // Show which nodes will be skipped
      nodesToSkip.forEach(nodeId => {
        newAssessments[nodeId] = 'unknown'
        newSkippedNodes.add(nodeId)
      })
      setSkippedNodes(newSkippedNodes)
    }
    
    setAssessments(newAssessments)
  }

  const handleNext = async () => {
    setShowFeedback(false)
    setUserAnswer(null)
    setIsCorrect(null)
    
    const nextAssessableIndex = findNextAssessableNode()
    
    if (nextAssessableIndex !== -1) {
      setCurrentIndex(nextAssessableIndex)
    } else {
      await saveAssessments(assessments)
    }
  }

  const saveAssessments = async (finalAssessments: Record<string, 'known' | 'unknown'>) => {
    setIsSubmitting(true)
    const saveTimer = assessmentLogger.startTimer()
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'
    
    const sessionDuration = Date.now() - sessionStartTime
    const knownCount = Object.values(finalAssessments).filter(v => v === 'known').length
    const unknownCount = Object.values(finalAssessments).filter(v => v === 'unknown').length
    
    assessmentLogger.info('Saving assessment results', {
      correlationId,
      documentId,
      duration: sessionDuration,
      metadata: {
        totalAssessed: Object.keys(finalAssessments).length,
        knownCount,
        unknownCount,
        skippedCount: skippedNodes.size,
        completionRate: `${((Object.keys(finalAssessments).length / nodes.length) * 100).toFixed(2)}%`
      }
    })

    try {
      const statusData = Object.entries(finalAssessments).map(([nodeId, status]) => ({
        user_id: FIXED_USER_ID,
        node_id: nodeId,
        understanding_level: status === 'known' ? 80 : 20,
        last_reviewed: new Date().toISOString(),
        review_count: 1,
        assessment_method: 'quiz' as const
      }))

      let successCount = 0
      let failCount = 0
      
      for (const data of statusData) {
        const { error } = await supabase
          .from('user_knowledge_status')
          .upsert([data], { 
            onConflict: 'user_id,node_id'
          })

        if (error) {
          failCount++
          supabaseLogger.error('Failed to save individual assessment', {
            correlationId,
            documentId,
            error,
            metadata: {
              nodeId: data.node_id,
              errorMessage: error.message || error.toString()
            }
          })
        } else {
          successCount++
        }
      }
      
      const saveDuration = saveTimer()
      
      assessmentLogger.info('Assessment results saved', {
        correlationId,
        documentId,
        duration: saveDuration,
        metadata: {
          totalItems: statusData.length,
          successCount,
          failCount,
          successRate: `${((successCount / statusData.length) * 100).toFixed(2)}%`,
          redirectTo: `/subjects/${subjectId}/study?doc=${documentId}`
        }
      })

      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
    } catch (error: any) {
      const saveDuration = saveTimer()
      assessmentLogger.error('Exception while saving assessments', {
        correlationId,
        documentId,
        error,
        duration: saveDuration,
        metadata: {
          errorType: error.name,
          errorMessage: error.message,
          redirectTo: `/subjects/${subjectId}/study?doc=${documentId}`
        }
      })
      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
    }
  }

  const knownCount = Object.values(assessments).filter(v => v === 'known').length
  const unknownCount = Object.values(assessments).filter(v => v === 'unknown').length

  const handleRegenerateQuiz = async () => {
    setIsRegenerating(true)
    const regenTimer = quizLogger.startTimer()
    
    quizLogger.info('Regenerating O/X quiz', {
      correlationId,
      documentId,
      metadata: {
        endpoint: `/api/documents/${documentId}/regenerate-quiz`
      }
    })
    
    try {
      const response = await fetch(`/api/documents/${documentId}/regenerate-quiz`, {
        method: 'POST',
        headers: {
          'x-correlation-id': correlationId
        }
      })
      
      const regenDuration = regenTimer()
      
      if (response.ok) {
        const result = await response.json()
        quizLogger.info('Quiz regeneration successful', {
          correlationId,
          documentId,
          duration: regenDuration,
          metadata: {
            status: response.status,
            result,
            willReload: true
          }
        })
        // Reload the page to fetch new questions
        window.location.reload()
      } else {
        const error = await response.json()
        quizLogger.error('Quiz regeneration failed', {
          correlationId,
          documentId,
          duration: regenDuration,
          metadata: {
            status: response.status,
            errorResponse: error
          }
        })
        alert(`퀴즈 생성 실패: ${error.error}`)
      }
    } catch (error: any) {
      const duration = regenTimer()
      quizLogger.error('Exception during quiz regeneration', {
        correlationId,
        documentId,
        error,
        duration,
        metadata: {
          errorType: error.name,
          errorMessage: error.message
        }
      })
      alert('퀴즈 생성 중 오류가 발생했습니다.')
    } finally {
      setIsRegenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <p className="text-center text-gray-600">퀴즈 문제를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!hasQuestions) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              이 문서에 대한 O/X 퀴즈 문제가 없습니다.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              이 문서는 O/X 퀴즈 기능이 추가되기 전에 처리되었습니다.
              <br />
              퀴즈를 생성하려면 아래 버튼을 클릭하세요.
            </p>
            <button
              onClick={handleRegenerateQuiz}
              disabled={isRegenerating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegenerating ? '퀴즈 생성 중...' : 'O/X 퀴즈 생성하기'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentNode || !currentQuestion) {
    // This shouldn't happen if hasQuestions is true, but just in case
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <p className="text-center text-gray-600">퀴즈를 준비하는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>진행률</span>
          <span>{totalAssessed} / {nodes.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {skippedNodes.size > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            자동으로 건너뛴 개념: {skippedNodes.size}개 (선수 지식 부족)
          </div>
        )}
        {remainingAssessableNodes > 0 && (
          <div className="mt-1 text-xs text-blue-600">
            남은 평가: {remainingAssessableNodes + 1}개
          </div>
        )}
      </div>

      {/* Quiz Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {remainingAssessableNodes + 1}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {currentNode.name}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {currentNode.description}
          </p>
          
          {/* Quiz Question */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <p className="text-lg text-gray-800 font-medium">
              {currentQuestion.question}
            </p>
          </div>

          {/* Answer Buttons or Feedback */}
          {!showFeedback ? (
            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer('O')}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                <CircleCheck className="h-6 w-6" />
                <span className="text-lg font-medium">O (맞다)</span>
              </button>
              <button
                onClick={() => handleAnswer('X')}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                <CircleX className="h-6 w-6" />
                <span className="text-lg font-medium">X (틀리다)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Feedback */}
              <div className={`p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">정답입니다!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">틀렸습니다</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  정답: <span className="font-medium">{currentQuestion.correct_answer}</span>
                </p>
                {currentQuestion.explanation && (
                  <p className="text-sm text-gray-600 mt-2">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>

              {/* Skipped nodes warning for incorrect answer */}
              {!isCorrect && previewSkipped.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    이 개념과 관련된 {previewSkipped.length}개 개념이 자동으로 건너뛰어집니다:
                  </p>
                  <ul className="space-y-1">
                    {previewSkipped.slice(0, 3).map(id => {
                      const node = nodes.find(n => n.id === id)
                      return node ? (
                        <li key={id} className="text-sm text-yellow-700 flex items-center gap-2">
                          <span className="text-yellow-500">•</span>
                          <span>{node.name}</span>
                        </li>
                      ) : null
                    })}
                    {previewSkipped.length > 3 && (
                      <li className="text-sm text-yellow-700 flex items-center gap-2">
                        <span className="text-yellow-500">•</span>
                        <span>... 그 외 {previewSkipped.length - 3}개</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Next Button */}
              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <span>다음으로</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">현재까지 평가 결과</h4>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
            <span className="text-sm text-gray-600">정답 (아는 개념): {knownCount}개</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-rose-500 rounded-full"></div>
            <span className="text-sm text-gray-600">오답 (모르는 개념): {unknownCount}개</span>
          </div>
          {skippedNodes.size > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600">자동 건너뜀: {skippedNodes.size}개</span>
            </div>
          )}
        </div>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700">평가 결과를 저장하고 있습니다...</p>
          </div>
        </div>
      )}
    </div>
  )
}