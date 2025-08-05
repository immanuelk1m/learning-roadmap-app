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
            documentId: (payload.new as any)?.id || (payload.old as any)?.id,
            status: (payload.new as any)?.status,
            old: payload.old
          })
          
          // For DELETE events, immediately update the local state
          if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = (payload.old as any).id
            console.log('[DocumentList] Document deleted via realtime:', deletedId)
            setDocuments(prev => prev.filter(d => d.id !== deletedId))
            // Still refetch to ensure consistency
            fetchDocuments()
          } else {
            // For other events, refetch documents
            fetchDocuments()
          }
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
      <div className="relative">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-transparent">
          <h2 className="text-2xl font-bold text-slate-900">
            업로드된 문서
            <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              0개
            </span>
          </h2>
        </div>
        
        {/* Empty State */}
        <div className="px-8 py-20 text-center relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
          
          <div className="relative">
            {/* Illustration */}
            <div className="relative mx-auto w-24 h-24 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl rotate-6 opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-2xl -rotate-6 opacity-40" />
              <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <FileText className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-slate-900 mb-3">업로드된 문서가 없습니다</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
              PDF 문서를 업로드하면 AI가 자동으로 분석하여<br />
              학습 콘텐츠를 생성해 드립니다
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Enhanced Header */}
      <div className="px-8 py-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900">
              업로드된 문서
            </h2>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                {documents.length}개
              </span>
              {documents.filter(doc => doc.status === 'completed').length > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  {documents.filter(doc => doc.status === 'completed').length}개 완료
                </span>
              )}
            </div>
          </div>
          
          {/* Filter/Sort Options */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Enhanced Grid */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
      {documents.map((doc) => {
        console.log(`[DocumentList] Rendering document: ${doc.title}, status: ${doc.status}`)
        const statusColors = {
          pending: { bg: '#FEF3C7', text: '#92400E', icon: '⏳' },
          processing: { bg: '#DBEAFE', text: '#1E40AF', icon: '⚙️' },
          completed: { bg: '#D1FAE5', text: '#065F46', icon: '✓' },
          failed: { bg: '#FEE2E2', text: '#991B1B', icon: '✗' }
        }
        const status = statusColors[doc.status as keyof typeof statusColors] || statusColors.pending
        
        return (
          <div 
            key={doc.id} 
            className="group relative bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer h-full flex flex-col hover:transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-300/30 hover:border-slate-300/80 hover:bg-white ring-1 ring-white/20"
          >
            {/* Modern Preview Area */}
            <div className="relative h-56 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-[radial-gradient(at_30%_30%,rgba(59,130,246,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(at_70%_70%,rgba(99,102,241,0.08),transparent_50%)]" />
              </div>
              
              {/* Floating PDF Icon */}
              <div className="relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl transform rotate-6 opacity-20 group-hover:rotate-12 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl transform -rotate-6 opacity-30 group-hover:-rotate-12 transition-transform duration-500" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
              
              {/* Enhanced Status Badge */}
              <div 
                className="absolute top-4 right-4 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg backdrop-blur-sm ring-1 ring-white/30 group-hover:scale-105 transition-transform duration-300"
                style={{
                  backgroundColor: status.bg,
                  color: status.text
                }}
              >
                <span className="text-sm">{status.icon}</span>
                <DocumentStatus 
                  documentId={doc.id} 
                  initialStatus={doc.status}
                  documentTitle={doc.title}
                />
              </div>
              
              {/* Enhanced Delete Button */}
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <DeleteDocumentButton 
                  documentId={doc.id} 
                  documentTitle={doc.title} 
                  onDeleteSuccess={() => {
                    setDocuments(prev => prev.filter(d => d.id !== doc.id))
                  }}
                />
              </div>
              
              {/* File Size Indicator */}
              {doc.file_size && (
                <div className="absolute bottom-4 left-4 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-medium text-slate-600 ring-1 ring-slate-200/50">
                  {(doc.file_size / 1024 / 1024).toFixed(1)}MB
                </div>
              )}
            </div>
            
            {/* Enhanced Content Area */}
            <div className="p-6 flex-1 flex flex-col">
              {/* Title with Tooltip */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors duration-300 line-clamp-2 leading-tight">
                  {doc.title}
                </h3>
                
                {/* Quick Stats Bar */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium">
                      {new Date(doc.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  {doc.page_count && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium">{doc.page_count}p</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Enhanced Metadata Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {doc.page_count && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-lg text-xs font-medium text-slate-600">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    {doc.page_count} 페이지
                  </div>
                )}
              </div>
              
              {/* Enhanced Action Area */}
              <div className="mt-auto">
                {doc.status === 'completed' ? (
                  <Link
                    href={`/subjects/${subjectId}/study/assessment?doc=${doc.id}`}
                    className="group/btn relative flex items-center justify-center gap-3 w-full p-4 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-semibold rounded-xl no-underline transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 overflow-hidden"
                  >
                    {/* Button Background Animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 transform scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-300 origin-left" />
                    
                    {/* Button Content */}
                    <div className="relative flex items-center gap-3">
                      <div className="p-1 bg-white/20 rounded-lg group-hover/btn:bg-white/30 transition-colors duration-300">
                        <Brain className="w-4 h-4" />
                      </div>
                      <span>학습 시작하기</span>
                    </div>
                    
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover/btn:opacity-10" />
                  </Link>
                ) : (
                  <div className="relative flex items-center justify-center gap-3 w-full p-4 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-600 font-medium rounded-xl border border-slate-200">
                    {/* Animated Processing Indicator */}
                    {doc.status === 'processing' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-indigo-100/50 animate-pulse rounded-xl" />
                    )}
                    
                    <div className="relative flex items-center gap-3">
                      {doc.status === 'processing' ? (
                        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                      ) : (
                        <div className="w-4 h-4 bg-amber-400 rounded-full animate-pulse" />
                      )}
                      <span>
                        {doc.status === 'pending' ? 'AI 분석 대기 중' : 'AI 분석 진행 중'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
        </div>
      </div>
    </div>
  )
}