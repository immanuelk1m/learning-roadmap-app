'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'

interface DocumentStatusProps {
  documentId: string
  initialStatus: string
  documentTitle?: string
}

export default function DocumentStatus({ documentId, initialStatus, documentTitle }: DocumentStatusProps) {
  const [status, setStatus] = useState(initialStatus)
  const supabase = createClient()
  const { showToast } = useToast()

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
          const newStatus = payload.new.status
          const oldStatus = status
          
          setStatus(newStatus)
          
          // Show toast when analysis completes
          if (oldStatus === 'processing' && newStatus === 'completed') {
            showToast({
              type: 'success',
              title: 'PDF 분석 완료',
              message: `"${documentTitle || '문서'}"의 분석이 완료되었습니다. 이제 학습을 시작할 수 있습니다!`,
              duration: 5000
            })
          }
          
          // Show toast when analysis fails
          if (oldStatus === 'processing' && newStatus === 'failed') {
            showToast({
              type: 'error',
              title: 'PDF 분석 실패',
              message: `"${documentTitle || '문서'}"의 분석에 실패했습니다. 다시 시도해주세요.`,
              duration: 5000
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documentId, supabase, status, documentTitle, showToast])

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