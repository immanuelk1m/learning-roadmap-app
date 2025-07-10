'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface DocumentStatusProps {
  documentId: string
  initialStatus: string
}

export default function DocumentStatus({ documentId, initialStatus }: DocumentStatusProps) {
  const [status, setStatus] = useState(initialStatus)
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to document status updates
    const channel = supabase
      .channel(`document-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${documentId}`,
        },
        (payload) => {
          setStatus(payload.new.status)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documentId, supabase])

  const getStatusDisplay = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: '대기 중',
          className: 'text-yellow-600 bg-yellow-50',
        }
      case 'processing':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: '분석 중',
          className: 'text-blue-600 bg-blue-50',
        }
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: '완료',
          className: 'text-green-600 bg-green-50',
        }
      case 'failed':
        return {
          icon: <XCircle className="h-4 w-4" />,
          text: '실패',
          className: 'text-red-600 bg-red-50',
        }
      default:
        return {
          icon: null,
          text: status,
          className: 'text-gray-600 bg-gray-50',
        }
    }
  }

  const { icon, text, className } = getStatusDisplay()

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {text}
    </span>
  )
}