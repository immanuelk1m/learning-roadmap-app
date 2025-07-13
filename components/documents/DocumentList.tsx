'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FileText, Brain } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import DocumentStatus from './DocumentStatus'
import DeleteDocumentButton from './DeleteDocumentButton'
import DocumentItemSkeleton from './DocumentItemSkeleton'

interface Document {
  id: string
  title: string
  status: string
  created_at: string
  subject_id: string
  file_path: string
  file_size: number | null
  page_count: number | null
}

interface DocumentListProps {
  initialDocuments: Document[]
  subjectId: string
  refreshTrigger?: Document[]
}

export default function DocumentList({ initialDocuments, subjectId, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const prevDocumentsRef = useRef<Document[]>(initialDocuments)
  const supabase = createClient()
  const { showToast } = useToast()

  // Update documents when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      console.log('[DocumentList] RefreshTrigger updated, documents:', refreshTrigger.length)
      setDocuments(refreshTrigger)
      prevDocumentsRef.current = refreshTrigger
      // Set loading to false since we have documents to display
      setIsInitialLoading(false)
    }
  }, [refreshTrigger])

  useEffect(() => {
    // Function to fetch latest documents
    const fetchDocuments = async () => {
      console.log('[DocumentList] Fetching documents for subject:', subjectId)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('[DocumentList] Error fetching documents:', error)
        return
      }
      
      if (data) {
        console.log('[DocumentList] Fetched documents:', data.length, 'items')
        // Check for status changes and show toasts (only if not initial load)
        if (!isInitialLoading) {
          data.forEach(newDoc => {
            const prevDoc = prevDocumentsRef.current.find(d => d.id === newDoc.id)
            if (prevDoc) {
              console.log(`[DocumentList] Status comparison for "${newDoc.title}": ${prevDoc.status} -> ${newDoc.status}`)
              if ((prevDoc.status === 'processing' || prevDoc.status === 'pending') && prevDoc.status !== newDoc.status) {
                if (newDoc.status === 'completed') {
                  showToast({
                    type: 'success',
                    title: 'PDF 분석 완료',
                    message: `"${newDoc.title}"의 분석이 완료되었습니다. 이제 학습을 시작할 수 있습니다!`,
                    duration: 5000
                  })
                } else if (newDoc.status === 'failed') {
                  showToast({
                    type: 'error',
                    title: 'PDF 분석 실패',
                    message: `"${newDoc.title}"의 분석에 실패했습니다. 다시 시도해주세요.`,
                    duration: 5000
                  })
                }
              }
            }
          })
        }
        
        prevDocumentsRef.current = data
        setDocuments(data)
        setIsInitialLoading(false)
      }
    }
    
    // Fetch initial data
    fetchDocuments()

    // Subscribe to document changes
    console.log('[DocumentList] Setting up realtime subscription for subject:', subjectId)
    const channel = supabase
      .channel(`documents-${subjectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `subject_id=eq.${subjectId}`,
        },
        (payload) => {
          console.log('[DocumentList] Realtime event received:', payload.eventType, payload.new)
          console.log('[DocumentList] Event details:', {
            eventType: payload.eventType,
            documentId: (payload.new as any)?.id,
            status: (payload.new as any)?.status,
            old: payload.old
          })
          // Refetch documents when any change occurs
          fetchDocuments()
        }
      )
      .subscribe((status) => {
        console.log('[DocumentList] Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[DocumentList] Successfully subscribed to realtime updates')
        }
      })

    return () => {
      console.log('[DocumentList] Cleaning up realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [subjectId, supabase, showToast])

  // Show loading skeleton on initial load
  if (isInitialLoading) {
    return (
      <div className="divide-y divide-gray-100">
        {[1, 2, 3].map((i) => (
          <DocumentItemSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg text-gray-500 font-medium">아직 업로드된 문서가 없습니다</p>
        <p className="text-sm text-gray-400 mt-2">
          상단의 업로드 버튼을 눌러 PDF 문서를 추가하세요
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {documents.map((doc) => {
        console.log(`[DocumentList] Rendering document: ${doc.title}, status: ${doc.status}`)
        return (
          <div key={doc.id} className="px-6 py-5 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className="h-10 w-10 bg-neutral-100 rounded-lg flex items-center justify-center mr-4">
                  <FileText className="h-5 w-5 text-neutral-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-gray-900">
                    {doc.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <DocumentStatus 
                      documentId={doc.id} 
                      initialStatus={doc.status}
                      documentTitle={doc.title}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.status === 'completed' ? (
                  <Link
                    href={`/subjects/${subjectId}/study/assessment?doc=${doc.id}`}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    학습하기
                  </Link>
                ) : (
                  <div className="text-sm text-gray-500">
                    {doc.status === 'pending' ? '대기 중' : ''}
                  </div>
                )}
                <DeleteDocumentButton 
                  documentId={doc.id} 
                  documentTitle={doc.title} 
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}