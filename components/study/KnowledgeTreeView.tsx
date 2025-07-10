'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ReactFlow, {
  Node,
  Edge,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { createClient } from '@/lib/supabase/client'
import KnowledgeNodeComponent from './KnowledgeNode'

const nodeTypes = {
  knowledge: KnowledgeNodeComponent,
}

interface KnowledgeNode {
  id: string
  document_id: string
  parent_id: string | null
  name: string
  description: string | null
  level: number
  position: number
  prerequisites: string[]
}

interface UserKnowledgeStatus {
  id: string
  user_id: string
  node_id: string
  status: 'known' | 'unclear' | 'unknown'
  confidence_score: number
}

interface KnowledgeTreeViewProps {
  nodes: KnowledgeNode[]
  userStatus: UserKnowledgeStatus[]
  documentId: string
}

export default function KnowledgeTreeView({
  nodes,
  userStatus,
  documentId,
}: KnowledgeTreeViewProps) {
  const [flowNodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Build tree structure
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const statusMap = new Map(userStatus.map(s => [s.node_id, s.status]))

    // Calculate positions for nodes
    const levelGroups = nodes.reduce((acc, node) => {
      if (!acc[node.level]) acc[node.level] = []
      acc[node.level].push(node)
      return acc
    }, {} as Record<number, KnowledgeNode[]>)

    const flowNodesData: Node[] = []
    const edgesData: Edge[] = []

    Object.entries(levelGroups).forEach(([level, levelNodes]) => {
      const levelNum = parseInt(level)
      const nodeWidth = 200
      const nodeHeight = 80
      const horizontalSpacing = 250
      const verticalSpacing = 150

      levelNodes.forEach((node, index) => {
        const totalWidth = levelNodes.length * horizontalSpacing
        const startX = -totalWidth / 2 + horizontalSpacing / 2

        flowNodesData.push({
          id: node.id,
          type: 'knowledge',
          position: {
            x: startX + index * horizontalSpacing,
            y: levelNum * verticalSpacing,
          },
          data: {
            label: node.name,
            description: node.description,
            status: statusMap.get(node.id) || 'unknown',
            level: node.level,
            onStatusChange: async (newStatus: string) => {
              await handleStatusChange(node.id, newStatus)
            },
          },
        })

        // Add edges to parent
        if (node.parent_id) {
          edgesData.push({
            id: `${node.parent_id}-${node.id}`,
            source: node.parent_id,
            target: node.id,
            type: 'smoothstep',
          })
        }

        // Add edges for prerequisites
        node.prerequisites.forEach(prereq => {
          const prereqNode = nodes.find(n => n.name === prereq)
          if (prereqNode) {
            edgesData.push({
              id: `prereq-${prereqNode.id}-${node.id}`,
              source: prereqNode.id,
              target: node.id,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#94a3b8', strokeDasharray: '5 5' },
            })
          }
        })
      })
    })

    setNodes(flowNodesData)
    setEdges(edgesData)
  }, [nodes, userStatus, setNodes, setEdges])

  const handleStatusChange = async (nodeId: string, newStatus: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from('user_knowledge_status')
        .upsert({
          user_id: user.id,
          node_id: nodeId,
          status: newStatus,
          confidence_score: newStatus === 'known' ? 1.0 : newStatus === 'unclear' ? 0.5 : 0.0,
        })

      if (!error) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
  }, [])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {selectedNode && (
        <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
          <h3 className="font-semibold mb-2">학습 팁</h3>
          <p className="text-sm text-gray-600">
            이 개념을 완전히 이해하려면 선수 지식을 먼저 학습하세요.
          </p>
        </div>
      )}
    </div>
  )
}