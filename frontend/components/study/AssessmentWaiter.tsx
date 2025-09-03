'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AlbumAssessmentSkeleton from './AlbumAssessmentSkeleton'

interface AssessmentWaiterProps {
  subjectId: string
  documentId: string
}

export default function AssessmentWaiter({ subjectId, documentId }: AssessmentWaiterProps) {
  const router = useRouter()
  const supabase = createClient()
  const [message, setMessage] = useState('AI가 문서를 분석하고 있습니다...')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<any>(null)

  const checkReady = async () => {
    const { data: doc } = await supabase
      .from('documents')
      .select('id, status')
      .eq('id', documentId)
      .single()

    if (!doc) return false
    if (doc.status !== 'completed') return false

    const { data: nodes } = await supabase
      .from('knowledge_nodes')
      .select('id')
      .eq('document_id', documentId)
      .limit(1)

    return !!(nodes && nodes.length > 0)
  }

  const tryFinish = async () => {
    const ready = await checkReady()
    if (ready) {
      // Refresh the route to render the assessment page content
      router.refresh()
    }
  }

  useEffect(() => {
    // Initial check
    tryFinish()

    // Realtime subscription to document status
    const channel = supabase
      .channel(`assessment-doc-${documentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents', filter: `id=eq.${documentId}` }, () => {
        setMessage('개념 트리를 구성 중입니다...')
        tryFinish()
      })
      .subscribe()

    channelRef.current = channel

    // Polling fallback every 4s
    pollingRef.current = setInterval(() => {
      tryFinish()
    }, 4000)

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, subjectId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4 text-center">
          <p className="text-sm text-slate-600">{message}</p>
          <p className="text-xs text-slate-500 mt-1">완료되면 자동으로 시작합니다.</p>
        </div>
        <AlbumAssessmentSkeleton />
      </div>
    </div>
  )
}
