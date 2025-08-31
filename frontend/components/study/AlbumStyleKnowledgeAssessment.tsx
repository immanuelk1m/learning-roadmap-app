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

// 노드 카드 컴포넌트
interface NodeCardProps {
  node: KnowledgeNode
  isSelected: boolean
  hasChildren: boolean
  isExpanded: boolean
  onToggleSelection: () => void
  onToggleExpansion: () => void
  level: number
}

function NodeCard({ 
  node, 
  isSelected, 
  hasChildren,
  isExpanded,
  onToggleSelection,
  onToggleExpansion,
  level
}: NodeCardProps) {
  // 모든 레벨 카드 크기 통일
  const sizeClass = 'w-48'
  
  return (
    <div 
      className={`${sizeClass} animate-slideIn`}
    >
      <div 
        className={`relative bg-white rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg h-full ${
          isExpanded ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={hasChildren ? onToggleExpansion : onToggleSelection}
      >
        <div className="p-4">
          <div className="flex flex-col gap-3">
            {/* 체크 표시 */}
            <div className="flex items-start">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isSelected ? 'bg-emerald-500' : 'bg-gray-200'
              }`}>
                <Check className={`w-5 h-5 ${
                  isSelected ? 'text-white' : 'text-gray-400'
                }`} />
              </div>
            </div>

            {/* 노드 정보 */}
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {node.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                {node.description}
              </p>
            </div>
          </div>
        </div>
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

  // 렌더링할 모든 노드들을 평면 배열로 생성
  const renderNodes = useMemo(() => {
    const result: { node: KnowledgeNode; key: string }[] = []
    
    // Level 1 노드들과 그 자식들을 순서대로 추가
    level1Nodes.forEach(level1Node => {
      // Level 1 노드 추가
      result.push({
        node: level1Node,
        key: level1Node.id
      })
      
      // Level 1이 확장된 경우 Level 2 자식들 추가
      if (expandedNodes.has(level1Node.id)) {
        const level2Children = nodes
          .filter(n => n.parent_id === level1Node.id)
          .sort((a, b) => (a.position || 0) - (b.position || 0))
        
        level2Children.forEach(level2Node => {
          result.push({
            node: level2Node,
            key: level2Node.id
          })
          
          // Level 2가 확장된 경우 Level 3 자식들 추가
          if (expandedNodes.has(level2Node.id)) {
            const level3Children = nodes
              .filter(n => n.parent_id === level2Node.id)
              .sort((a, b) => (a.position || 0) - (b.position || 0))
            
            level3Children.forEach(level3Node => {
              result.push({
                node: level3Node,
                key: level3Node.id
              })
            })
          }
        })
      }
    })
    
    return result
  }, [level1Nodes, nodes, expandedNodes])

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
      <style jsx global>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>

      {/* 헤더 */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          알고 있는 개념을 선택해주세요
        </h2>
        <p className="text-gray-600">
          이미 알고 있는 개념들을 선택하면 맞춤형 학습 계획을 생성해드립니다
        </p>
      </div>

      {/* 앨범 형태 노드 그리드 */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-4">
          {renderNodes.map(({ node, key }) => {
            const childNodes = nodes.filter(n => n.parent_id === node.id)
            const hasChildren = childNodes.length > 0
            
            return (
              <NodeCard
                key={key}
                node={node}
                isSelected={selectedNodes.has(node.id)}
                hasChildren={hasChildren}
                isExpanded={expandedNodes.has(node.id)}
                onToggleSelection={() => toggleNodeSelection(node.id)}
                onToggleExpansion={() => toggleNodeExpansion(node.id)}
                level={node.level}
              />
            )
          })}
        </div>
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