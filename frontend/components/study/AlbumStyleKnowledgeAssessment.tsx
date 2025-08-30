'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
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

// 재귀적 노드 아이템 컴포넌트
interface NodeItemProps {
  node: KnowledgeNode
  nodes: KnowledgeNode[]
  selectedNodes: Set<string>
  expandedNodes: Set<string>
  onToggleSelection: (nodeId: string) => void
  onToggleExpansion: (nodeId: string) => void
  depth: number
}

function NodeItem({ 
  node, 
  nodes, 
  selectedNodes, 
  expandedNodes, 
  onToggleSelection, 
  onToggleExpansion,
  depth 
}: NodeItemProps) {
  const childNodes = nodes
    .filter(n => n.parent_id === node.id)
    .sort((a, b) => (a.position || 0) - (b.position || 0))
  
  const hasChildren = childNodes.length > 0
  const isExpanded = expandedNodes.has(node.id)
  const isSelected = selectedNodes.has(node.id)

  return (
    <div className="w-full">
      {/* 노드 카드 */}
      <div 
        className="w-full mb-3"
        style={{ paddingLeft: `${depth * 24}px` }}
      >
        <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {/* 확장 버튼 */}
                {hasChildren && (
                  <button
                    onClick={() => onToggleExpansion(node.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors mt-0.5"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                )}
                {!hasChildren && (
                  <div className="w-7" /> 
                )}

                {/* 체크 아이콘 */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-emerald-500' : 'bg-gray-200'
                }`}>
                  <Check className="w-5 h-5 text-white" />
                </div>

                {/* 노드 정보 */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {node.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {node.description}
                  </p>
                  {hasChildren && (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      {childNodes.length}개 하위 개념
                    </p>
                  )}
                </div>
              </div>

              {/* 선택 버튼 */}
              <button
                onClick={() => onToggleSelection(node.id)}
                className="ml-2 p-2 rounded hover:bg-gray-100"
                title={isSelected ? '알고 있음 해제' : '알고 있음 표시'}
              >
                <Check className={`w-5 h-5 ${
                  isSelected ? 'text-emerald-500' : 'text-gray-400'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 자식 노드들 - 애니메이션 적용 */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        {isExpanded && childNodes.map(childNode => (
          <NodeItem
            key={childNode.id}
            node={childNode}
            nodes={nodes}
            selectedNodes={selectedNodes}
            expandedNodes={expandedNodes}
            onToggleSelection={onToggleSelection}
            onToggleExpansion={onToggleExpansion}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  )
}

export default function AlbumStyleKnowledgeAssessment({ 
  nodes, 
  subjectId, 
  documentId
}: AlbumStyleKnowledgeAssessmentProps) {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set())
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
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

  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
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
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          알고 있는 개념을 선택해주세요
        </h2>
        <p className="text-gray-600">
          이미 알고 있는 개념들을 선택하면 맞춤형 학습 계획을 생성해드립니다
        </p>
      </div>

      {/* 노드 트리 */}
      <div className="mb-8">
        {level1Nodes.map(node => (
          <NodeItem
            key={node.id}
            node={node}
            nodes={nodes}
            selectedNodes={selectedNodes}
            expandedNodes={expandedNodes}
            onToggleSelection={toggleNodeSelection}
            onToggleExpansion={toggleNodeExpansion}
            depth={0}
          />
        ))}
      </div>

      {/* 하단 상태 바 및 제출 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedNodes.size > 0 && (
              <span className="text-gray-500">
                {selectedNodes.size}개 개념을 알고 있는 것으로 표시했습니다
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