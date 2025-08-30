'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { assessmentLogger, supabaseLogger } from '@/lib/logger'
import Logger from '@/lib/logger'

interface KnowledgeNode {
  id: string
  name: string
  description: string
  level: number
  position?: number
  prerequisites: string[]
  parent_id: string | null
}

interface AlbumStyleKnowledgeAssessmentProps {
  nodes: KnowledgeNode[]
  subjectId: string
  documentId: string
}

export default function AlbumStyleKnowledgeAssessment({ 
  nodes, 
  subjectId, 
  documentId
}: AlbumStyleKnowledgeAssessmentProps) {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [selectedLevel1Node, setSelectedLevel1Node] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingStudyGuide, setIsGeneratingStudyGuide] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'
  const [correlationId] = useState(() => Logger.generateCorrelationId())
  const [sessionStartTime] = useState(() => Date.now())

  // Level 1 노드들만 필터링
  const level1Nodes = useMemo(() => 
    nodes.filter(node => node.level === 1).sort((a, b) => (a.position || 0) - (b.position || 0)),
    [nodes]
  )

  // 선택된 Level 1 노드의 자식 노드들 가져오기
  const getChildNodes = (parentId: string) => {
    return nodes
      .filter(node => node.parent_id === parentId)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
  }

  // 현재 선택된 Level 1 노드의 자식들
  const currentLevel2Nodes = useMemo(() => 
    selectedLevel1Node ? getChildNodes(selectedLevel1Node) : [],
    [selectedLevel1Node, nodes]
  )

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }

  const handleLevel1NodeClick = (nodeId: string) => {
    // Level 1 노드 선택/해제
    if (selectedLevel1Node === nodeId) {
      setSelectedLevel1Node(null)
    } else {
      setSelectedLevel1Node(nodeId)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const saveTimer = assessmentLogger.startTimer()
    
    const sessionDuration = Date.now() - sessionStartTime
    
    assessmentLogger.info('Saving album-style assessment results', {
      correlationId,
      documentId,
      duration: sessionDuration,
      metadata: {
        selectedCount: selectedNodes.size,
        totalNodes: nodes.length
      }
    })

    try {
      // 모든 노드의 understanding_level 설정
      const statusData = nodes.map(node => ({
        user_id: FIXED_USER_ID,
        node_id: node.id,
        understanding_level: selectedNodes.has(node.id) ? 70 : 0,
        last_reviewed: new Date().toISOString(),
        review_count: 1,
        assessment_method: 'quiz' as const
      }))

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
      
      assessmentLogger.info('Album-style assessment results saved', {
        correlationId,
        documentId,
        duration: saveDuration,
        metadata: {
          totalItems: statusData.length,
          successCount,
          failCount,
          selectedNodes: selectedNodes.size
        }
      })

      // 평가 완료 및 학습 가이드 생성
      setIsGeneratingStudyGuide(true)
      
      try {
        assessmentLogger.info('Completing assessment and generating study guide', {
          correlationId,
          documentId,
          metadata: {
            selectedCount: selectedNodes.size
          }
        })
        
        const response = await fetch(`/api/documents/${documentId}/complete-assessment`, {
          method: 'POST'
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.warn('Failed to complete assessment:', errorText)
        } else {
          assessmentLogger.info('Assessment completed and study guide generated successfully', {
            correlationId,
            documentId
          })
        }
      } catch (error: any) {
        console.warn('Error completing assessment:', error)
      } finally {
        setIsGeneratingStudyGuide(false)
      }
      
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
      
    } catch (error: any) {
      const saveDuration = saveTimer()
      assessmentLogger.error('Exception while saving assessments', {
        correlationId,
        documentId,
        error,
        duration: saveDuration
      })
      
      await new Promise(resolve => setTimeout(resolve, 500))
      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          알고 있는 개념을 선택해주세요
        </h2>
        <p className="text-gray-600">
          이미 알고 있는 개념들을 선택하면 맞춤형 학습 계획을 생성해드립니다
        </p>
      </div>

      {/* Level 1 노드들 - 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {level1Nodes.map(level1Node => {
          const isSelected = selectedLevel1Node === level1Node.id
          const childNodes = getChildNodes(level1Node.id)
          const hasChildren = childNodes.length > 0

          return (
            <button
              key={level1Node.id}
              onClick={() => handleLevel1NodeClick(level1Node.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedNodes.has(level1Node.id)
                      ? 'bg-emerald-500'
                      : 'bg-gray-200'
                  }`}>
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {level1Node.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {level1Node.description}
                    </p>
                    {hasChildren && (
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        {childNodes.length}개 하위 개념 {isSelected ? '표시됨' : '보기'}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleNodeSelection(level1Node.id)
                  }}
                  className="ml-2 p-1.5 rounded hover:bg-gray-100"
                  title={selectedNodes.has(level1Node.id) ? '알고 있음 해제' : '알고 있음 표시'}
                >
                  <Check className={`w-4 h-4 ${
                    selectedNodes.has(level1Node.id) ? 'text-emerald-500' : 'text-gray-400'
                  }`} />
                </button>
              </div>
            </button>
          )
        })}
      </div>

      {/* Level 2 노드들 - 선택된 Level 1 노드의 자식들만 표시 */}
      {selectedLevel1Node && currentLevel2Nodes.length > 0 && (
        <div className="mb-8">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {level1Nodes.find(n => n.id === selectedLevel1Node)?.name}의 하위 개념
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentLevel2Nodes.map(childNode => (
                <button
                  key={childNode.id}
                  onClick={() => toggleNodeSelection(childNode.id)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedNodes.has(childNode.id)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  title={childNode.description}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      selectedNodes.has(childNode.id)
                        ? 'bg-emerald-500'
                        : 'bg-gray-200'
                    }`}>
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 text-center line-clamp-2">
                      {childNode.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 하단 상태 바 및 제출 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedNodes.size > 0 && (
              <span className="text-gray-500">
                선택한 개념들은 이미 알고 있는 것으로 표시됩니다
              </span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isGeneratingStudyGuide}
            className="px-6 py-2.5 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(isSubmitting || isGeneratingStudyGuide) && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            평가 완료하고 학습 시작
          </button>
        </div>
      </div>

      {/* 로딩 모달 */}
      {(isSubmitting || isGeneratingStudyGuide) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
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