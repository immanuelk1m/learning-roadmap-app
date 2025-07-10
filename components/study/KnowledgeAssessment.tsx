'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface KnowledgeNode {
  id: string
  name: string
  description: string
  level: number
  prerequisites: string[]
}

interface KnowledgeAssessmentProps {
  nodes: KnowledgeNode[]
  subjectId: string
  documentId: string
}

export default function KnowledgeAssessment({ 
  nodes, 
  subjectId, 
  documentId 
}: KnowledgeAssessmentProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [assessments, setAssessments] = useState<Record<string, 'known' | 'unknown'>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const currentNode = nodes[currentIndex]
  const progress = ((currentIndex + 1) / nodes.length) * 100

  // Build dependency map: prerequisite name -> dependent node IDs
  const buildDependencyMap = () => {
    const dependencyMap = new Map<string, string[]>()
    
    nodes.forEach(node => {
      node.prerequisites.forEach(prerequisiteName => {
        if (!dependencyMap.has(prerequisiteName)) {
          dependencyMap.set(prerequisiteName, [])
        }
        dependencyMap.get(prerequisiteName)!.push(node.id)
      })
    })
    
    return dependencyMap
  }

  const dependencyMap = buildDependencyMap()

  // Mark all dependent concepts as unknown when a prerequisite is marked unknown
  const markDependentsAsUnknown = (nodeId: string, currentAssessments: Record<string, 'known' | 'unknown'>) => {
    const newAssessments = { ...currentAssessments }
    const node = nodes.find(n => n.id === nodeId)
    
    if (!node) return newAssessments
    
    // Find all concepts that depend on this node (by name)
    const dependentIds = dependencyMap.get(node.name) || []
    
    // Queue for breadth-first search
    const queue = [...dependentIds]
    const processed = new Set<string>()
    
    while (queue.length > 0) {
      const currentId = queue.shift()!
      
      if (processed.has(currentId)) continue
      processed.add(currentId)
      
      // Mark as unknown if not already assessed
      if (!(currentId in newAssessments)) {
        newAssessments[currentId] = 'unknown'
        
        // Find this node's dependents and add to queue
        const currentNode = nodes.find(n => n.id === currentId)
        if (currentNode) {
          const moreDependents = dependencyMap.get(currentNode.name) || []
          queue.push(...moreDependents)
        }
      }
    }
    
    return newAssessments
  }

  const handleAssessment = async (status: 'known' | 'unknown') => {
    let newAssessments = { ...assessments, [currentNode.id]: status }
    
    // If marked as unknown, automatically mark dependent concepts as unknown
    if (status === 'unknown') {
      newAssessments = markDependentsAsUnknown(currentNode.id, newAssessments)
    }
    
    setAssessments(newAssessments)

    if (currentIndex < nodes.length - 1) {
      // Move to next node
      setCurrentIndex(currentIndex + 1)
    } else {
      // All assessments complete, save to database
      await saveAssessments(newAssessments)
    }
  }

  const generateStudyGuide = async (userId: string, documentId: string) => {
    try {
      const response = await fetch('/api/study-guide/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error generating study guide:', errorData)
        // Don't throw error - guide generation is optional
      }
    } catch (error) {
      console.error('Error generating study guide:', error)
      // Don't throw error - guide generation is optional
    }
  }

  const saveAssessments = async (finalAssessments: Record<string, 'known' | 'unknown'>) => {
    setIsSubmitting(true)
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    try {
      // First, ensure all nodes have assessments (fill missing ones with 'unknown')
      const completeAssessments = { ...finalAssessments }
      nodes.forEach(node => {
        if (!(node.id in completeAssessments)) {
          completeAssessments[node.id] = 'unknown'
        }
      })

      // Prepare data for bulk insert
      const statusData = Object.entries(completeAssessments).map(([nodeId, status]) => ({
        user_id: FIXED_USER_ID,
        node_id: nodeId,
        status: status
      }))

      // Try individual inserts if bulk upsert fails
      for (const data of statusData) {
        const { error } = await supabase
          .from('user_knowledge_status')
          .upsert([data], { 
            onConflict: 'user_id,node_id'
          })

        if (error) {
          console.error('Error saving individual assessment:', error, data)
          // Continue with other assessments even if one fails
        }
      }

      // Generate study guide after saving assessments
      await generateStudyGuide(FIXED_USER_ID, documentId)

      // Redirect to study page regardless of individual errors
      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
    } catch (error) {
      console.error('Error saving assessments:', error)
      // Still redirect to study page to avoid getting stuck
      router.push(`/subjects/${subjectId}/study?doc=${documentId}`)
    }
  }

  const knownCount = Object.values(assessments).filter(v => v === 'known').length
  const unknownCount = Object.values(assessments).filter(v => v === 'unknown').length

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>진행률</span>
          <span>{currentIndex + 1} / {nodes.length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Assessment Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <span className="text-2xl font-bold text-blue-600">
              {nodes.length - currentIndex}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {currentNode.name}
          </h3>
          <p className="text-gray-600 text-lg">
            {currentNode.description}
          </p>
          {currentNode.prerequisites.length > 0 && (
            <p className="text-sm text-gray-500 mt-3">
              선수 지식: {currentNode.prerequisites.join(', ')}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => handleAssessment('known')}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-6 w-6" />
            <span className="text-lg font-medium">알아요</span>
          </button>
          <button
            onClick={() => handleAssessment('unknown')}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            <XCircle className="h-6 w-6" />
            <span className="text-lg font-medium">몰라요</span>
          </button>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">현재까지 평가 결과</h4>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">아는 개념: {knownCount}개</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">모르는 개념: {unknownCount}개</span>
          </div>
        </div>
      </div>

      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700">평가 결과를 저장하고 있습니다...</p>
          </div>
        </div>
      )}
    </div>
  )
}