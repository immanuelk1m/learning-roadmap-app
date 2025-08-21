'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

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
  understanding_level: number
}

interface KnowledgeTreeViewProps {
  nodes: KnowledgeNode[]
  userStatus: UserStatus[]
  documentId: string
}

export default function KnowledgeTreeView({ nodes, userStatus, documentId }: KnowledgeTreeViewProps) {
  // Initialize with root nodes expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const rootNodes = nodes.filter(node => !node.parent_id)
    return new Set(rootNodes.map(node => node.id))
  })

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


  const getNodeStatus = (nodeId: string): 'known' | 'unknown' => {
    const level = userStatus.find(s => s.node_id === nodeId)?.understanding_level
    if (level === undefined) return 'unknown'
    if (level >= 70) return 'known'  // Changed from 50 to 70 to match assessment scoring
    return 'unknown'
  }

  const renderNode = (node: KnowledgeNodeWithChildren, depth: number = 0) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const status = getNodeStatus(node.id)

    // Calculate indentation based on depth
    const indentWidth = depth * 32 // 32px per level
    const isRootLevel = depth === 0

    // Modern green and red color scheme with depth-based styling
    const getNodeStyles = () => {
      const baseStyles = {
        known: 'bg-green-50 border-green-300 text-green-900',
        unknown: 'bg-red-50 border-red-300 text-red-900'
      }

      // Root level nodes get stronger styling
      if (isRootLevel) {
        return {
          known: 'bg-green-500 border-green-600 text-white',
          unknown: 'bg-red-500 border-red-600 text-white'
        }
      }

      return baseStyles
    }

    const statusStyles = getNodeStyles()

    return (
      <div key={node.id} className="relative">
        {/* Connecting lines for hierarchy visualization */}
        {depth > 0 && (
          <div className="absolute left-0 top-0 bottom-0 flex items-center" style={{ marginLeft: `${(depth - 1) * 32 + 16}px` }}>
            <div className="w-4 h-px bg-neutral-300"></div>
          </div>
        )}
        {depth > 0 && (
          <div className="absolute left-0 top-0 h-6 flex items-center" style={{ marginLeft: `${(depth - 1) * 32 + 16}px` }}>
            <div className="w-px h-6 bg-neutral-300"></div>
          </div>
        )}

        <div
          className={`relative flex items-start p-4 rounded-lg border-2 transition-all duration-200 mb-3 ${
            statusStyles[status]
          } ${isRootLevel ? 'shadow-sm' : 'shadow-xs'}`}
          style={{ marginLeft: `${indentWidth}px` }}
        >
          {/* Expand/Collapse button */}
          {hasChildren && (
            <button
              onClick={() => toggleExpand(node.id)}
              className={`mr-3 mt-0.5 p-1 rounded-full transition-colors ${
                isRootLevel 
                  ? 'text-white/70 hover:text-white hover:bg-white/10' 
                  : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-8" />}

          {/* Level indicator */}
          <div className={`mr-3 mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
            isRootLevel ? 'bg-white/50' : 'bg-neutral-400'
          }`}></div>

          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${
                        isRootLevel ? 'text-lg' : 'text-base'
                      }`}>
                        {node.name}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isRootLevel 
                          ? 'bg-white/20 text-white/70' 
                          : 'bg-neutral-200 text-neutral-600'
                      }`}>
                        Level {node.level}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${
                      isRootLevel ? 'text-white/90' : 'text-neutral-600'
                    }`}>
                      {node.description}
                    </p>
                    {node.prerequisites.length > 0 && (
                      <p className={`text-xs mt-2 ${
                        isRootLevel ? 'text-white/70' : 'text-neutral-500'
                      }`}>
                        선수 지식: {node.prerequisites.join(', ')}
                      </p>
                    )}
                  </div>
                  {/* Status indicator */}
                  <div className={`ml-4 px-3 py-1 rounded-full text-xs font-medium ${
                    status === 'known' ? 'bg-green-600 text-white' :
                    'bg-red-600 text-white'
                  }`}>
                    {status === 'known' ? '✓ 아는 개념' : '✗ 모르는 개념'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const treeData = buildTree()

  return (
    <div className="space-y-1 p-2">
      {treeData.map(node => renderNode(node))}
    </div>
  )
}