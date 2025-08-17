'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, ArrowRight, CircleX, CircleCheck, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { assessmentLogger, supabaseLogger, quizLogger } from '@/lib/logger'
import Logger from '@/lib/logger'
import OXQuizSkeleton from './OXQuizSkeleton'
import OXQuizFeedbackSkeleton from './OXQuizFeedbackSkeleton'

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
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_in_blank' | 'matching'
  options?: any
  correct_answer: string
  explanation: string | null
  acceptable_answers?: string[]
  hint?: string
  template?: string
  blanks?: any[]
  left_items?: string[]
  right_items?: string[]
  correct_pairs?: any[]
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
  // Only assess first 10 nodes - use useMemo to prevent infinite rerenders
  const assessmentNodes = useMemo(() => nodes.slice(0, 10), [nodes])
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const [assessments, setAssessments] = useState<Record<string, 'known' | 'unknown'>>({})
  const [skippedNodes, setSkippedNodes] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewSkipped, setPreviewSkipped] = useState<string[]>([])
  const [questions, setQuestions] = useState<Record<string, QuizQuestion>>({})
  const [showFeedback, setShowFeedback] = useState(false)
  const [userAnswer, setUserAnswer] = useState<string | null>(null)
  const [userAnswers, setUserAnswers] = useState<{[key: string]: string}>({})  // For multiple blanks or matching
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasQuestions, setHasQuestions] = useState(false)
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false)
  const [isGeneratingStudyGuide, setIsGeneratingStudyGuide] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  // Fixed user ID
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'
  
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
        assessmentNodes: assessmentNodes.length,
        nodeNames: assessmentNodes.map(n => n.name)
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

  const currentNode = assessmentNodes[currentIndex]
  const currentQuestion = questions[currentNode?.id]
  
  const totalAssessed = Object.keys(assessments).length
  const totalSkipped = skippedNodes.size
  const progress = Math.min((totalAssessed / assessmentNodes.length) * 100, 100)
  
  const remainingAssessableNodes = assessmentNodes.filter((node, index) => 
    index > currentIndex && 
    !skippedNodes.has(node.id) && 
    !(node.id in assessments)
  ).length

  // Load quiz questions for assessment nodes only
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true)
      const loadTimer = quizLogger.startTimer()
      
      try {
        const nodeIds = assessmentNodes.map(n => n.id)
        
        quizLogger.info('Loading assessment quiz questions', {
          correlationId,
          documentId,
          metadata: {
            nodeCount: nodeIds.length,
            nodeIds: nodeIds // Log all assessment node IDs
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
                question_type: item.question_type,
                options: item.options,
                correct_answer: item.correct_answer,
                explanation: item.explanation,
                acceptable_answers: item.acceptable_answers,
                hint: item.hint,
                template: item.template,
                blanks: item.blanks,
                left_items: item.left_items,
                right_items: item.right_items,
                correct_pairs: item.correct_pairs
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
    
    assessmentNodes.forEach(node => {
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
    const node = assessmentNodes.find(n => n.id === nodeId)
    if (!node) return []
    
    const nodesToSkip: string[] = []
    const processed = new Set<string>()
    
    const prerequisiteDependents = dependencyMap.get(node.name) || []
    const childNodes = assessmentNodes
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
        
        const currentNode = assessmentNodes.find(n => n.id === currentId)
        if (currentNode) {
          const morePrerequisiteDependents = dependencyMap.get(currentNode.name) || []
          const moreChildNodes = assessmentNodes
            .filter(n => n.parent_id === currentId)
            .map(n => n.id)
          
          queue.push(...morePrerequisiteDependents, ...moreChildNodes)
        }
      }
    }
    
    return nodesToSkip
  }

  const findNextAssessableNode = (startIndex: number = currentIndex + 1): number => {
    for (let i = startIndex; i < assessmentNodes.length; i++) {
      const nodeId = assessmentNodes[i].id
      if (!skippedNodes.has(nodeId) && !(nodeId in assessments)) {
        return i
      }
    }
    return -1
  }

  const handleAnswer = async (answer?: string) => {
    if (showFeedback || isProcessingAnswer) return
    
    const answerTimer = assessmentLogger.startTimer()
    
    setIsProcessingAnswer(true)
    
    // Get the answer
    let submittedAnswer = answer || userAnswer || ''
    setUserAnswer(submittedAnswer)
    
    // For O/X questions, check if the answer matches (treat "모르겠음" as incorrect)
    let isAnswerCorrect = submittedAnswer !== '모르겠음' && currentQuestion?.correct_answer === submittedAnswer
    
    setIsCorrect(isAnswerCorrect)
    
    // Save quiz attempt to database for later use in study guide generation
    if (currentQuestion && submittedAnswer) {
      try {
        const { error } = await supabase
          .from('quiz_attempts')
          .insert({
            user_id: FIXED_USER_ID,
            quiz_item_id: currentQuestion.id,
            user_answer: submittedAnswer,
            is_correct: isAnswerCorrect,
            time_spent: null // We're not tracking time for O/X assessment
          })
        
        if (error) {
          assessmentLogger.warn('Failed to save quiz attempt', {
            correlationId,
            documentId,
            error,
            metadata: {
              quizItemId: currentQuestion.id,
              nodeId: currentNode?.id
            }
          })
        }
      } catch (error) {
        assessmentLogger.warn('Exception saving quiz attempt', {
          correlationId,
          documentId,
          error,
          metadata: {
            quizItemId: currentQuestion?.id,
            nodeId: currentNode?.id
          }
        })
      }
    }
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
        totalNodes: assessmentNodes.length
      }
    })

    // Save quiz attempt
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
    setIsProcessingAnswer(false)
  }

  const handleNext = async () => {
    const nextAssessableIndex = findNextAssessableNode()
    
    if (nextAssessableIndex !== -1) {
      // Reset states before changing index to prevent flickering
      setShowFeedback(false)
      setUserAnswer(null)
      setUserAnswers({})
      setIsCorrect(null)
      setPreviewSkipped([])
      setCurrentIndex(nextAssessableIndex)
    } else {
      // Assessment complete, mark remaining nodes as unknown
      let finalAssessments = { ...assessments }
      
      // Mark all nodes that weren't assessed as unknown
      nodes.forEach(node => {
        if (!(node.id in finalAssessments)) {
          finalAssessments[node.id] = 'unknown'
        }
      })
      
      await saveAssessments(finalAssessments)
    }
  }

  const saveAssessments = async (finalAssessments: Record<string, 'known' | 'unknown'>) => {
    setIsSubmitting(true)
    const saveTimer = assessmentLogger.startTimer()
    
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
      // 먼저 기존 understanding_level과 review_count를 조회
      const nodeIds = Object.keys(finalAssessments)
      const { data: existingStatus } = await supabase
        .from('knowledge_nodes')
        .select('id, understanding_level, review_count')
        .eq('user_id', FIXED_USER_ID)
        .in('id', nodeIds)
      
      // 기존 상태를 맵으로 변환
      const existingMap = new Map(
        existingStatus?.map(s => [s.id, { 
          understanding_level: s.understanding_level || 50,
          review_count: s.review_count || 0
        }]) || []
      )

      // 점진적으로 understanding_level 업데이트
      const statusData = Object.entries(finalAssessments).map(([nodeId, status]) => {
        const existing = existingMap.get(nodeId)
        const currentLevel = existing?.understanding_level ?? 50  // 기본값 50
        const currentCount = existing?.review_count ?? 0
        
        // 맞으면 +20, 틀리면 -20 (0~100 범위)
        const newLevel = status === 'known' 
          ? Math.min(100, currentLevel + 20)
          : Math.max(0, currentLevel - 20)
        
        return {
          user_id: FIXED_USER_ID,
          node_id: nodeId,
          understanding_level: newLevel,
          last_reviewed: new Date().toISOString(),
          review_count: currentCount + 1,
          assessment_method: 'quiz' as const
        }
      })

      let successCount = 0
      let failCount = 0
      
      for (const data of statusData) {
        const { error } = await supabase
          .from('knowledge_nodes')
          .update({
            understanding_level: data.understanding_level,
            last_reviewed: data.last_reviewed,
            review_count: data.review_count,
            assessment_method: data.assessment_method,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.node_id)
          .eq('user_id', FIXED_USER_ID)

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

      // Mark assessment as completed
      try {
        const response = await fetch(`/api/documents/${documentId}/complete-assessment`, {
          method: 'POST'
        })
        
        if (!response.ok) {
          console.warn('Failed to mark assessment as completed:', await response.text())
        }
      } catch (error) {
        console.warn('Error marking assessment as completed:', error)
      }
      
      // Add a small delay to ensure database writes are complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Auto-generate study guide after assessment completion
      setIsGeneratingStudyGuide(true)
      
      try {
        assessmentLogger.info('Auto-generating study guide after assessment', {
          correlationId,
          documentId,
          metadata: {
            knownCount,
            unknownCount
          }
        })
        
        const studyGuideResponse = await fetch('/api/study-guide/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            userId: FIXED_USER_ID
          })
        })

        if (studyGuideResponse.ok) {
          assessmentLogger.info('Study guide generated successfully', {
            correlationId,
            documentId
          })
        } else {
          const errorData = await studyGuideResponse.json()
          assessmentLogger.warn('Study guide generation failed', {
            correlationId,
            documentId,
            error: errorData
          })
        }
      } catch (studyGuideError: any) {
        assessmentLogger.error('Study guide generation error', {
          correlationId,
          documentId,
          error: studyGuideError,
          metadata: {
            errorType: studyGuideError.name,
            errorMessage: studyGuideError.message
          }
        })
      } finally {
        setIsGeneratingStudyGuide(false)
      }
      
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
      // Mark assessment as completed even on error
      try {
        const response = await fetch(`/api/documents/${documentId}/complete-assessment`, {
          method: 'POST'
        })
        
        if (!response.ok) {
          console.warn('Failed to mark assessment as completed:', await response.text())
        }
      } catch (error) {
        console.warn('Error marking assessment as completed:', error)
      }
      
      // Add a small delay even on error to ensure any partial writes are complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Try to auto-generate study guide even on error (if assessments were partially saved)
      setIsGeneratingStudyGuide(true)
      
      try {
        assessmentLogger.info('Attempting study guide generation after error', {
          correlationId,
          documentId
        })
        
        const studyGuideResponse = await fetch('/api/study-guide/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            userId: FIXED_USER_ID
          })
        })

        if (studyGuideResponse.ok) {
          assessmentLogger.info('Study guide generated successfully after error recovery', {
            correlationId,
            documentId
          })
        } else {
          assessmentLogger.warn('Study guide generation failed after error recovery', {
            correlationId,
            documentId
          })
        }
      } catch (studyGuideError: any) {
        assessmentLogger.error('Study guide generation error after assessment error', {
          correlationId,
          documentId,
          error: studyGuideError
        })
      } finally {
        setIsGeneratingStudyGuide(false)
      }
      
      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
    }
  }

  const knownCount = Object.values(assessments).filter(v => v === 'known').length
  const unknownCount = Object.values(assessments).filter(v => v === 'unknown').length

  // Render O/X question input
  const renderQuestionInput = () => {
    if (!currentQuestion) return null
    
    // O/X questions with "Don't Know" option
    return (
      <div className="flex gap-3">
        <button
          onClick={() => handleAnswer('O')}
          disabled={isSubmitting || isProcessingAnswer}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          <CircleCheck className="h-5 w-5" />
          <span className="text-base font-medium">O (맞음)</span>
        </button>
        <button
          onClick={() => handleAnswer('모르겠음')}
          disabled={isSubmitting || isProcessingAnswer}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          <HelpCircle className="h-5 w-5" />
          <span className="text-base font-medium">모르겠음</span>
        </button>
        <button
          onClick={() => handleAnswer('X')}
          disabled={isSubmitting || isProcessingAnswer}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          <CircleX className="h-5 w-5" />
          <span className="text-base font-medium">X (틀림)</span>
        </button>
      </div>
    )
  }


  if (isLoading) {
    return <OXQuizSkeleton />
  }

  if (!hasQuestions) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              이 문서에 대한 O/X 평가 문제가 없습니다.
            </p>
            <p className="text-sm text-gray-500">
              문서 분석 시 O/X 평가 문제가 자동으로 생성됩니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Only show skeleton when actually processing an answer or when essential data is missing
  if (!currentNode || !currentQuestion || (isProcessingAnswer && !showFeedback)) {
    return <OXQuizSkeleton />
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>진행률</span>
          <span>{totalAssessed} / {assessmentNodes.length}</span>
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
            renderQuestionInput()
          ) : (
            <div className="space-y-4">
              {/* Feedback */}
              <div className={`p-4 rounded-lg ${
                isCorrect 
                  ? 'bg-green-50 border border-green-200' 
                  : userAnswer === '모르겠음' 
                    ? 'bg-gray-50 border border-gray-200' 
                    : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">정답입니다!</span>
                    </>
                  ) : userAnswer === '모르겠음' ? (
                    <>
                      <HelpCircle className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-800">모르겠다고 하셨네요</span>
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
                      const node = assessmentNodes.find(n => n.id === id)
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

      {(isSubmitting || isGeneratingStudyGuide) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isGeneratingStudyGuide ? '해설집 생성 중...' : '평가 결과 저장 중...'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isGeneratingStudyGuide 
                    ? '학습 전 지식 평가 결과를 바탕으로 개인 맞춤 해설집을 생성하고 있습니다.'
                    : '평가 결과를 저장하고 있습니다.'
                  }
                </p>
                <p className="text-xs text-gray-500">
                  잠시만 기다려주세요...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}