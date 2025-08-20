import { createServiceClient } from '@/lib/supabase/service'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import OXKnowledgeAssessment from '@/components/study/OXKnowledgeAssessment'
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
  const supabase = createServiceClient()
  
  assessmentLogger.info('Assessment page loading', {
    correlationId,
    metadata: {
      subjectId: id,
      documentId,
      timestamp: new Date().toISOString()
    }
  })
  
  // Use fixed user ID
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

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
    .eq('user_id', FIXED_USER_ID)
    .single()
  
  const subjectDuration = subjectTimer()
  
  if (!subject) {
    assessmentLogger.error('Subject not found', {
      correlationId,
      duration: subjectDuration,
      metadata: {
        subjectId: id,
        userId: FIXED_USER_ID
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
  
  if (!document || document.status !== 'completed') {
    assessmentLogger.warn('Document not ready for assessment', {
      correlationId,
      documentId,
      duration: docDuration,
      metadata: {
        documentExists: !!document,
        documentStatus: document?.status,
        redirectTo: `/subjects/${id}`
      }
    })
    redirect(`/subjects/${id}`)
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
    assessmentLogger.error('No knowledge nodes found', {
      correlationId,
      documentId,
      duration: nodesDuration,
      metadata: {
        redirectTo: `/subjects/${id}`
      }
    })
    redirect(`/subjects/${id}`)
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href={`/subjects/${id}`}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                과목으로 돌아가기
              </Link>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-lg font-semibold text-gray-900">{subject.name}</h1>
                <p className="text-sm text-gray-600">지식 평가</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Component */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            학습 전 지식 평가
          </h2>
          <p className="text-gray-600">
            각 개념을 알고 있는지 선택하여 지식을 평가합니다.
            '알고 있음'을 선택하면 해당 개념을 아는 것으로, '모름'을 선택하면 모르는 것으로 기록됩니다.
          </p>
        </div>

        <OXKnowledgeAssessment
          nodes={knowledgeNodes}
          subjectId={id}
          documentId={documentId}
        />
      </div>
    </div>
  )
}