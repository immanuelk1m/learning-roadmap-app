'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
  isSelectable: boolean
  onToggleSelection: () => void
  onToggleExpansion: () => void
  level: number
  containerRef?: React.Ref<HTMLDivElement>
}

function NodeCard({ 
  node, 
  isSelected, 
  hasChildren,
  isExpanded,
  isSelectable,
  onToggleSelection,
  onToggleExpansion,
  level,
  containerRef
}: NodeCardProps) {
  // 모든 카드 컨테이너 동일 사이즈
  const sizeClass = 'w-56 h-36'
  
  // 제목 길이에 따라 폰트 크기 동적 조정 (카드 영역을 최대한 채움)
  const titleFontPx = useMemo(() => {
    const len = (node.name || '').replace(/\s+/g, '').length
    if (len <= 6) return 22
    if (len <= 10) return 20
    if (len <= 14) return 18
    if (len <= 20) return 16
    if (len <= 28) return 14
    return 13
  }, [node.name])
  
  // Level 기반 색상 팔레트: Level 1 = 연한 파랑, Level 2+ = 초록
  const isLevel1 = level === 1
  
  // 기본 배경은 level에 따라 항상 적용
  const bgClass = isLevel1 ? 'bg-sky-50' : 'bg-emerald-50'
  
  // 선택/확장 시 팔레트 색으로 강조, 기본은 중립 테두리
  const borderClass = (isSelected || isExpanded)
    ? (isLevel1 
        ? 'border-sky-500 shadow-xl ring-2 ring-sky-500/50'
        : 'border-emerald-500 shadow-xl ring-2 ring-emerald-500/50')
    : 'border-gray-200 hover:border-gray-400'
  
  // 커서 스타일
  const cursorClass = 'cursor-pointer'
  
  return (
    <div 
      className={`${sizeClass} animate-slideIn`}
      ref={containerRef}
    >
      <div 
        className={`relative ${bgClass} rounded-xl border transition-all ${cursorClass} hover:shadow-lg h-full ${borderClass}`}
        onClick={() => {
          if (hasChildren) {
            onToggleExpansion()
            // Level 1 노드는 확장과 동시에 선택도 가능
            if (level === 1) {
              onToggleSelection()
            }
          } else {
            onToggleSelection()
          }
        }}
      >
        <div className="p-3 h-full flex items-center justify-center text-center">
          {/* 노드 이름만 가운데 정렬로 표시 */}
          <h3 
            className="font-semibold text-gray-900 break-words hyphens-auto leading-tight line-clamp-3"
            style={{ fontSize: `${titleFontPx}px` }}
          >
            {node.name}
          </h3>
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
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    setSelectedNodes(prev => {
      const newSet = new Set(prev)
      
      if (newSet.has(nodeId)) {
        // 노드 선택 해제 시 자식 노드들도 함께 해제
        newSet.delete(nodeId)
        
        // 직접 자식 노드들 찾기 (Level 2)
        const childNodes = nodes.filter(n => n.parent_id === nodeId)
        childNodes.forEach(child => {
          newSet.delete(child.id)
          
          // 손자 노드들 찾기 (Level 3)
          const grandchildNodes = nodes.filter(n => n.parent_id === child.id)
          grandchildNodes.forEach(grandchild => {
            newSet.delete(grandchild.id)
          })
        })
      } else {
        // 노드 선택 시 부모 노드가 선택되거나 확장되어 있는지 확인
        if (node.level > 1) {
          const parentNode = nodes.find(n => n.id === node.parent_id)
          if (parentNode && !prev.has(parentNode.id) && !expandedNodes.has(parentNode.id)) {
            // 부모 노드가 선택되거나 확장되지 않았으면 선택 불가
            toast.error(`먼저 상위 개념 "${parentNode.name}"을(를) 클릭해주세요`)
            return prev
          }
        }
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

  // 렌더링할 모든 노드들을 평면 배열로 생성 (앨범형 유지)
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

  // 연결선(SVG) 계산을 위한 레퍼런스 수집
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [lines, setLines] = useState<{ fromId: string; toId: string; x1: number; y1: number; x2: number; y2: number }[]>([])

  useEffect(() => {
    const computeLines = () => {
      const container = containerRef.current
      if (!container) return
      const containerRect = container.getBoundingClientRect()

      const visibleIds = new Set(renderNodes.map(r => r.node.id))
      const newLines: { fromId: string; toId: string; x1: number; y1: number; x2: number; y2: number }[] = []

      // Level 3 -> Level 2 부모로 연결
      renderNodes.forEach(({ node }) => {
        if (node.level !== 3 || !node.parent_id) return
        if (!visibleIds.has(node.parent_id)) return

        const fromEl = nodeRefs.current.get(node.parent_id)
        const toEl = nodeRefs.current.get(node.id)
        if (!fromEl || !toEl) return

        const fromRect = fromEl.getBoundingClientRect()
        const toRect = toEl.getBoundingClientRect()

        const x1 = fromRect.left - containerRect.left + fromRect.width / 2
        const y1 = fromRect.top - containerRect.top + fromRect.height / 2
        const x2 = toRect.left - containerRect.left + toRect.width / 2
        const y2 = toRect.top - containerRect.top + toRect.height / 2

        newLines.push({ fromId: node.parent_id, toId: node.id, x1, y1, x2, y2 })
      })

      setLines(newLines)
    }

    computeLines()
    window.addEventListener('resize', computeLines)
    return () => window.removeEventListener('resize', computeLines)
  }, [renderNodes])

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
      <div className="mb-8 relative" ref={containerRef}>
        {/* 연결선 SVG 오버레이 */}
        <svg className="pointer-events-none absolute inset-0 w-full h-full">
          {lines.map(line => (
            <line
              key={`${line.fromId}-${line.toId}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#cbd5e1" /* slate-300 */
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* 앨범형 그리드 */}
        <div className="flex flex-wrap gap-4 justify-start px-2">
          {renderNodes.map(({ node, key }) => {
            const childNodes = nodes.filter(n => n.parent_id === node.id)
            const hasChildren = childNodes.length > 0
            
            // 부모 노드 선택 여부 확인 - 부모가 선택되거나 확장된 경우 모두 선택 가능
            let isSelectable = true
            if (node.level > 1) {
              const parentNode = nodes.find(n => n.id === node.parent_id)
              isSelectable = parentNode ? (selectedNodes.has(parentNode.id) || expandedNodes.has(parentNode.id)) : false
            }
            
            return (
              <NodeCard
                key={key}
                node={node}
                isSelected={selectedNodes.has(node.id)}
                hasChildren={hasChildren}
                isExpanded={expandedNodes.has(node.id)}
                isSelectable={isSelectable}
                onToggleSelection={() => toggleNodeSelection(node.id)}
                onToggleExpansion={() => toggleNodeExpansion(node.id)}
                level={node.level}
                containerRef={(el) => {
                  const map = nodeRefs.current
                  if (el) {
                    map.set(node.id, el)
                  } else {
                    map.delete(node.id)
                  }
                }}
              />
            )
          })}
        </div>
      </div>

      {/* 하단 상태 바 및 제출 버튼 */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-end">
          {selectedNodes.size === 0 ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isGeneratingStudyGuide}
              className="px-6 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {(isSubmitting || isGeneratingStudyGuide) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              전부 다 모르겠어요!
            </button>
          ) : (
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
          )}
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
