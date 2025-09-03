import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AlbumStyleKnowledgeAssessment from '@/components/study/AlbumStyleKnowledgeAssessment'
import AssessmentWaiter from '@/components/study/AssessmentWaiter'
import { assessmentLogger, supabaseLogger } from '@/lib/logger'
import Logger from '@/lib/logger'

interface AssessmentPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    doc: string
  }>
}

export default async function AssessmentPage({ params, searchParams }: AssessmentPageProps) {
  const startTime = Date.now()
  const correlationId = Logger.generateCorrelationId()
  const timer = assessmentLogger.startTimer()
  
  const { id } = await params
  const { doc: documentId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }
  
  assessmentLogger.info('Assessment page loading', {
    correlationId,
    metadata: {
      subjectId: id,
      documentId,
      timestamp: new Date().toISOString()
    }
  })
  
  if (!documentId) {
    assessmentLogger.warn('No document ID provided, redirecting', {
      correlationId,
      metadata: {
        subjectId: id,
        redirectTo: `/subjects/${id}`
      }
    })
    redirect(`/subjects/${id}`)
  }

  // Get subject info
  supabaseLogger.info('Fetching subject info', {
    correlationId,
    metadata: {
      subjectId: id,
      operation: 'select',
      table: 'subjects'
    }
  })
  
  const subjectTimer = supabaseLogger.startTimer()
  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  
  const subjectDuration = subjectTimer()
  
  if (!subject) {
    assessmentLogger.error('Subject not found', {
      correlationId,
      duration: subjectDuration,
      metadata: {
        subjectId: id,
        userId: user.id
      }
    })
    notFound()
  }
  
  supabaseLogger.info('Subject fetched successfully', {
    correlationId,
    duration: subjectDuration,
    metadata: {
      subjectName: subject.name
    }
  })

  // Get document info
  supabaseLogger.info('Fetching document info', {
    correlationId,
    documentId,
    metadata: {
      operation: 'select',
      table: 'documents'
    }
  })
  
  const docTimer = supabaseLogger.startTimer()
  const { data: document } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('subject_id', id)
    .single()
  
  const docDuration = docTimer()
  
  if (!document) {
    assessmentLogger.warn('Document not found for assessment', {
      correlationId,
      documentId,
      duration: docDuration,
    })
    notFound()
  }
  
  if (document.status !== 'completed') {
    assessmentLogger.info('Document not completed yet, rendering AssessmentWaiter', {
      correlationId,
      documentId,
      duration: docDuration,
      metadata: { documentStatus: document.status }
    })
    return <AssessmentWaiter subjectId={id} documentId={documentId} />
  }
  
  supabaseLogger.info('Document fetched successfully', {
    correlationId,
    documentId,
    duration: docDuration,
    metadata: {
      documentTitle: document.title,
      documentStatus: document.status
    }
  })

  // Get knowledge nodes (we'll sort them by dependency later)
  supabaseLogger.info('Fetching knowledge nodes', {
    correlationId,
    documentId,
    metadata: {
      operation: 'select',
      table: 'knowledge_nodes'
    }
  })
  
  const nodesTimer = supabaseLogger.startTimer()
  const { data: rawKnowledgeNodes } = await supabase
    .from('knowledge_nodes')
    .select('*')
    .eq('document_id', documentId)
  
  const nodesDuration = nodesTimer()
  
  if (!rawKnowledgeNodes || rawKnowledgeNodes.length === 0) {
    assessmentLogger.info('Knowledge nodes not ready yet, rendering AssessmentWaiter', {
      correlationId,
      documentId,
      duration: nodesDuration,
    })
    return <AssessmentWaiter subjectId={id} documentId={documentId} />
  }
  
  supabaseLogger.info('Knowledge nodes fetched', {
    correlationId,
    documentId,
    duration: nodesDuration,
    metadata: {
      nodeCount: rawKnowledgeNodes.length
    }
  })

  // Sort nodes by dependency (root nodes first)
  const sortNodesByDependency = (nodes: any[]) => {
    const nodeMap = new Map(nodes.map(node => [node.name, node]))
    const visited = new Set<string>()
    const sorted: any[] = []
    
    const visit = (nodeName: string) => {
      if (visited.has(nodeName)) return
      
      const node = nodeMap.get(nodeName)
      if (!node) return
      
      visited.add(nodeName)
      
      // Visit prerequisites first
      if (node.prerequisites && node.prerequisites.length > 0) {
        node.prerequisites.forEach((prereq: string) => {
          if (nodeMap.has(prereq)) {
            visit(prereq)
          }
        })
      }
      
      sorted.push(node)
    }
    
    // Start with root nodes (no prerequisites)
    const rootNodes = nodes.filter(node => !node.prerequisites || node.prerequisites.length === 0)
    rootNodes
      .sort((a, b) => a.level - b.level || a.position - b.position)
      .forEach(node => visit(node.name))
    
    // Visit remaining nodes
    nodes.forEach(node => visit(node.name))
    
    return sorted
  }

  const sortTimer = assessmentLogger.startTimer()
  const knowledgeNodes = sortNodesByDependency(rawKnowledgeNodes)
  const sortDuration = sortTimer()
  
  assessmentLogger.info('Knowledge nodes sorted by dependency', {
    correlationId,
    documentId,
    duration: sortDuration,
    metadata: {
      originalCount: rawKnowledgeNodes.length,
      sortedCount: knowledgeNodes.length,
      rootNodes: knowledgeNodes.filter(n => !n.prerequisites || n.prerequisites.length === 0).length
    }
  })

  // 기존 평가 체크를 제거하여 항상 새로운 평가를 허용
  
  const totalDuration = timer()
  assessmentLogger.info('Assessment page ready', {
    correlationId,
    documentId,
    duration: totalDuration,
    metadata: {
      subjectName: subject.name,
      documentTitle: document.title,
      nodeCount: knowledgeNodes.length,
      pageLoadTime: `${totalDuration}ms`
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Assessment Component */}
      <div className="px-4 py-8">
        <AlbumStyleKnowledgeAssessment
          nodes={knowledgeNodes}
          subjectId={id}
          documentId={documentId}
        />
      </div>
    </div>
  )
}
