'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface KnowledgeNode {
  id: string
  name: string
  description: string
  level: number
  parent_id: string | null
  prerequisites: string[]
}

type KnowledgeNodeWithChildren = KnowledgeNode & { children: KnowledgeNodeWithChildren[] }

interface UserStatus {
  node_id: string
  status: 'known' | 'unclear' | 'unknown'
}

interface KnowledgeTreeViewProps {
  nodes: KnowledgeNode[]
  userStatus: UserStatus[]
  documentId: string
}

export default function KnowledgeTreeView({ nodes, userStatus: initialStatus, documentId }: KnowledgeTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [userStatus, setUserStatus] = useState<UserStatus[]>(initialStatus)
  const supabase = createClient()

  // Build tree structure
  const buildTree = () => {
    const nodeMap = new Map<string, KnowledgeNodeWithChildren>()
    const rootNodes: KnowledgeNodeWithChildren[] = []

    // Initialize all nodes
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] })
    })

    // Build parent-child relationships
    nodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        nodeMap.get(node.parent_id)!.children.push(nodeWithChildren)
      } else {
        rootNodes.push(nodeWithChildren)
      }
    })

    return rootNodes
  }

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const updateNodeStatus = async (nodeId: string, status: 'known' | 'unclear' | 'unknown') => {
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Update in database
    const { error } = await supabase
      .from('user_knowledge_status')
      .upsert({
        user_id: FIXED_USER_ID,
        node_id: nodeId,
        status: status,
        updated_at: new Date().toISOString()
      })

    if (!error) {
      // Update local state
      setUserStatus(prev => {
        const existing = prev.find(s => s.node_id === nodeId)
        if (existing) {
          return prev.map(s => s.node_id === nodeId ? { ...s, status } : s)
        } else {
          return [...prev, { node_id: nodeId, status }]
        }
      })
    }
  }

  const getNodeStatus = (nodeId: string) => {
    return userStatus.find(s => s.node_id === nodeId)?.status || 'unknown'
  }

  const renderNode = (node: KnowledgeNodeWithChildren, depth: number = 0) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const status = getNodeStatus(node.id)

    // Modern color scheme
    const statusStyles = {
      known: 'bg-green-50 border-green-200 hover:bg-green-100',
      unclear: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
      unknown: 'bg-red-50 border-red-200 hover:bg-red-100'
    }

    return (
      <div key={node.id} className="mb-2">
        <div
          className={`flex items-start p-4 rounded-xl border-2 transition-all duration-200 ${
            statusStyles[status]
          } ${depth > 0 ? 'ml-6' : ''}`}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpand(node.id)}
              className="mr-2 mt-0.5 text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">{node.name}</h3>
                    <p className="text-sm text-gray-700 mt-1">{node.description}</p>
                    {node.prerequisites.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        선수 지식: {node.prerequisites.join(', ')}
                      </p>
                    )}
                  </div>
                  {/* Status indicator */}
                  <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                    status === 'known' ? 'bg-green-500 text-white' :
                    status === 'unclear' ? 'bg-amber-500 text-white' :
                    'bg-red-500 text-white'
                  }`}>
                    {status === 'known' ? '✓ 앎' :
                     status === 'unclear' ? '? 애매함' :
                     '✗ 모름'}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => updateNodeStatus(node.id, 'known')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      status === 'known' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-green-100 border border-gray-300'
                    }`}
                  >
                    알아요
                  </button>
                  <button
                    onClick={() => updateNodeStatus(node.id, 'unclear')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      status === 'unclear' 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-amber-100 border border-gray-300'
                    }`}
                  >
                    애매해요
                  </button>
                  <button
                    onClick={() => updateNodeStatus(node.id, 'unknown')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      status === 'unknown' 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white text-gray-700 hover:bg-red-100 border border-gray-300'
                    }`}
                  >
                    몰라요
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const treeData = buildTree()

  return (
    <div className="space-y-2">
      {treeData.map(node => renderNode(node))}
    </div>
  )
}