'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { assessmentLogger, supabaseLogger } from '@/lib/logger'
import Logger from '@/lib/logger'

interface KnowledgeNode {
  id: string
  name: string
  description: string
  level: number
  prerequisites: string[]
  parent_id: string | null
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
  
  const totalAssessed = Object.keys(assessments).length
  const totalSkipped = skippedNodes.size
  const progress = Math.min((totalAssessed / assessmentNodes.length) * 100, 100)
  
  const remainingNodes = assessmentNodes.filter((node, index) => 
    index > currentIndex && 
    !skippedNodes.has(node.id) && 
    !(node.id in assessments)
  ).length


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
      // Check if node is not skipped/assessed
      if (!skippedNodes.has(nodeId) && !(nodeId in assessments)) {
        return i
      }
    }
    return -1
  }

  const handleAssessment = async (status: 'known' | 'unknown') => {
    assessmentLogger.info('Node assessment selected', {
      correlationId,
      documentId,
      metadata: {
        nodeId: currentNode?.id,
        nodeName: currentNode?.name,
        status,
        currentIndex,
        totalNodes: assessmentNodes.length
      }
    })

    // Update assessments
    let newAssessments: Record<string, 'known' | 'unknown'> = { ...assessments, [currentNode.id]: status }
    let newSkippedNodes = new Set(skippedNodes)
    
    if (status === 'unknown') {
      const nodesToSkip = findDependentNodesToSkip(currentNode.id)
      setPreviewSkipped(nodesToSkip) // Show which nodes will be skipped
      nodesToSkip.forEach(nodeId => {
        newAssessments[nodeId] = 'unknown'
        newSkippedNodes.add(nodeId)
      })
      setSkippedNodes(newSkippedNodes)
    } else {
      setPreviewSkipped([])
    }
    
    setAssessments(newAssessments)
    
    // Auto-advance after a short delay
    setTimeout(() => handleNext(), 500)
  }

  const handleNext = async () => {
    const nextAssessableIndex = findNextAssessableNode()
    
    if (nextAssessableIndex !== -1) {
      // Reset states before changing index
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

      // 평가 결과에 따른 이해도 설정 (최초 평가)
      const statusData = Object.entries(finalAssessments).map(([nodeId, status]) => {
        const existing = existingMap.get(nodeId)
        const currentCount = existing?.review_count ?? 0
        
        // 최초 평가: 맞으면 70, 틀리면 0으로 설정
        const newLevel = status === 'known' ? 70 : 0
        
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

      // Mark assessment as completed and auto-generate study guide
      // Note: complete-assessment API already handles study guide generation internally
      setIsGeneratingStudyGuide(true)
      
      try {
        assessmentLogger.info('Completing assessment and generating study guide', {
          correlationId,
          documentId,
          metadata: {
            knownCount,
            unknownCount
          }
        })
        
        const response = await fetch(`/api/documents/${documentId}/complete-assessment`, {
          method: 'POST'
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.warn('Failed to complete assessment:', errorText)
          assessmentLogger.warn('Failed to complete assessment', {
            correlationId,
            documentId,
            error: errorText
          })
        } else {
          const result = await response.json()
          assessmentLogger.info('Assessment completed and study guide generated successfully', {
            correlationId,
            documentId,
            stats: result.stats
          })
          
          // Check if quiz generation failed
          if (!result.stats?.hasQuizQuestions) {
            console.warn('퀴즈 생성 실패 - 퀴즈 없이 진행합니다')
            toast.warning('퀴즈 생성에 실패했습니다. 학습 가이드만 이용하실 수 있습니다.')
          }
        }
      } catch (error: any) {
        console.warn('Error completing assessment:', error)
        assessmentLogger.error('Error completing assessment', {
          correlationId,
          documentId,
          error,
          metadata: {
            errorType: error.name,
            errorMessage: error.message
          }
        })
      } finally {
        setIsGeneratingStudyGuide(false)
      }
      
      // Add a small delay to ensure database writes are complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
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
      // Don't call complete-assessment in catch block to avoid duplicate calls
      // The assessment results are already saved to knowledge_nodes table
      assessmentLogger.info('Assessment save failed but continuing to study page', {
        correlationId,
        documentId,
        metadata: {
          note: 'Not calling complete-assessment to avoid duplicate generation'
        }
      })
      
      // Add a small delay even on error to ensure any partial writes are complete
      await new Promise(resolve => setTimeout(resolve, 500))
      
      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
    }
  }

  const knownCount = Object.values(assessments).filter(v => v === 'known').length
  const unknownCount = Object.values(assessments).filter(v => v === 'unknown').length


  if (!currentNode) {
    return null
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
        {remainingNodes > 0 && (
          <div className="mt-1 text-xs text-blue-600">
            남은 평가: {remainingNodes + 1}개
          </div>
        )}
      </div>

      {/* Quiz Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {remainingNodes + 1}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {currentNode.name}
          </h3>
          
          {/* Node Description */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <p className="text-lg text-gray-800">
              {currentNode.description}
            </p>
          </div>

          {/* Question */}
          <p className="text-base text-gray-700 mb-6">
            이 개념을 알고 계신가요?
          </p>

          {/* Assessment Buttons */}
          {!(currentNode.id in assessments) ? (
            <div className="flex gap-4">
              <button
                onClick={() => handleAssessment('known')}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                <ThumbsUp className="h-5 w-5" />
                <span className="text-base font-medium">알고 있음</span>
              </button>
              <button
                onClick={() => handleAssessment('unknown')}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                <ThumbsDown className="h-5 w-5" />
                <span className="text-base font-medium">모름</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Assessment Result */}
              <div className={`p-4 rounded-lg ${
                assessments[currentNode.id] === 'known'
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {assessments[currentNode.id] === 'known' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">알고 있다고 선택하셨습니다</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">모른다고 선택하셨습니다</span>
                    </>
                  )}
                </div>
              </div>

              {/* Skipped nodes warning for unknown */}
              {assessments[currentNode.id] === 'unknown' && previewSkipped.length > 0 && (
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
            <span className="text-sm text-gray-600">아는 개념: {knownCount}개</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-rose-500 rounded-full"></div>
            <span className="text-sm text-gray-600">모르는 개념: {unknownCount}개</span>
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
                  {isGeneratingStudyGuide ? '퀵노트 생성 중...' : '평가 결과 저장 중...'}
                </h3>
                <p className="text-sm text-gray-600">
                  {isGeneratingStudyGuide 
                    ? '학습 전 배경지식 체크 결과를 바탕으로 개인 맞춤 퀵노트를 생성하고 있습니다.'
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