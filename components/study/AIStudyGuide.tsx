'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Book, Brain, FileText } from 'lucide-react'
import AIStudyGuideSkeleton from './AIStudyGuideSkeleton'

interface KnowledgeNode {
  id: string
  name: string
  description: string | null
  level: number
  prerequisites: string[]
}

interface UserStatus {
  node_id: string
  status: 'known' | 'unclear' | 'unknown'
}

interface AIStudyGuideProps {
  nodes: KnowledgeNode[]
  userStatus: UserStatus[]
  documentId: string
}

export default function AIStudyGuide({ nodes, userStatus, documentId }: AIStudyGuideProps) {
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null)
  const [explanation, setExplanation] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const statusMap = new Map(userStatus.map(s => [s.node_id, s.status]))

  // Group nodes by level
  const nodesByLevel = nodes.reduce((acc, node) => {
    if (!acc[node.level]) acc[node.level] = []
    acc[node.level].push(node)
    return acc
  }, {} as Record<number, KnowledgeNode[]>)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'known':
        return 'text-gray-700 bg-gray-100'
      case 'unclear':
        return 'text-gray-600 bg-gray-50'
      case 'unknown':
        return 'text-gray-500 bg-white'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const handleNodeClick = async (node: KnowledgeNode) => {
    setSelectedNode(node)
    setLoading(true)
    setExplanation('')

    try {
      // TODO: Generate AI explanation for the concept
      setExplanation(`${node.name}은(는) ${node.description || '중요한 개념입니다.'}`)
    } catch (error) {
      console.error('Error generating explanation:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Concept List */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Book className="h-5 w-5" />
            학습 개념 목록
          </h2>
        </div>
        
        <div className="p-4">
          {Object.entries(nodesByLevel).map(([level, levelNodes]) => (
            <div key={level} className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">
                레벨 {level}
              </h3>
              <div className="space-y-2">
                {levelNodes.map(node => {
                  const status = statusMap.get(node.id) || 'unknown'
                  return (
                    <button
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                        selectedNode?.id === node.id
                          ? 'border-gray-700 bg-gray-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium">{node.name}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${getStatusColor(
                            status
                          )}`}
                        >
                          {status === 'known' ? '✓' : status === 'unclear' ? '?' : '✗'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Explanation */}
      <div className="flex-1 bg-gray-50 p-6">
        {selectedNode ? (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
              <Brain className="h-6 w-6 text-gray-600" />
              {selectedNode.name}
            </h2>
            
            {selectedNode.prerequisites.length > 0 && (
              <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  선수 지식
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {selectedNode.prerequisites.map((prereq, idx) => (
                    <li key={idx}>{prereq}</li>
                  ))}
                </ul>
              </div>
            )}

            {loading ? (
              <AIStudyGuideSkeleton />
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="prose max-w-none">
                  <p>{explanation}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800">
                연습문제 풀기
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                관련 PDF 페이지 보기
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FileText className="h-12 w-12 mb-4" />
            <p className="text-lg">학습할 개념을 선택하세요</p>
          </div>
        )}
      </div>
    </div>
  )
}