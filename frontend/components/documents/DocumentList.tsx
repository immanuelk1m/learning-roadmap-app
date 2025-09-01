'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { FileText, Brain, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import DocumentStatus from './DocumentStatus'
import DeleteDocumentButton from './DeleteDocumentButton'
import DocumentItemSkeleton from './DocumentItemSkeleton'

interface Document {
  id: string
  title: string
  status: string
  processing_status?: string
  processing_error?: string
  created_at: string
  subject_id: string
  file_path: string
  file_size: number | null
  page_count: number | null
  assessment_completed: boolean | null
}

interface DocumentListProps {
  initialDocuments: Document[]
  subjectId: string
  refreshTrigger?: Document[]
}

export default function DocumentList({ initialDocuments, subjectId, refreshTrigger }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [retryingDoc, setRetryingDoc] = useState<string | null>(null)
  const prevDocumentsRef = useRef<Document[]>(initialDocuments)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const realtimeChannelRef = useRef<any>(null)
  const [isPollingActive, setIsPollingActive] = useState(false)
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

  // Function to fetch latest documents
  const fetchDocuments = async (isPolling = false) => {
    console.log(`[DocumentList] ${isPolling ? 'Polling' : 'Fetching'} documents for subject:`, subjectId)
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
      console.log(`[DocumentList] ${isPolling ? 'Polled' : 'Fetched'} documents:`, data.length, 'items')
      
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
      
      // Check if we need to start or stop polling
      const hasProcessingDocs = data.some(doc => doc.status === 'processing' || doc.status === 'pending')
      if (hasProcessingDocs && !isPollingActive) {
        startPolling()
      } else if (!hasProcessingDocs && isPollingActive) {
        stopPolling()
      }
    }
  }

  // Start polling for processing documents
  const startPolling = () => {
    console.log('[DocumentList] Starting polling for processing documents')
    setIsPollingActive(true)
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    
    pollingIntervalRef.current = setInterval(() => {
      console.log('[DocumentList] Polling documents...')
      fetchDocuments(true)
    }, 5000) // Poll every 5 seconds
  }

  // Stop polling
  const stopPolling = () => {
    console.log('[DocumentList] Stopping polling')
    setIsPollingActive(false)
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  // Handle retry analysis for failed documents
  const handleRetryAnalysis = async (docId: string) => {
    setRetryingDoc(docId)
    
    try {
      const response = await fetch(`/api/documents/${docId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        showToast({
          type: 'success',
          title: '분석 재시작',
          message: '문서 분석을 다시 시작했습니다.',
          duration: 5000
        })
        
        // Update document status locally
        setDocuments(prev => prev.map(doc => 
          doc.id === docId 
            ? { ...doc, status: 'processing', processing_status: undefined, processing_error: undefined }
            : doc
        ))
        
        // Start polling to track progress
        startPolling()
      } else {
        const errorData = await response.json()
        
        if (response.status === 429) {
          showToast({
            type: 'warning',
            title: 'API 할당량 초과',
            message: '아직 API 할당량이 회복되지 않았습니다. 잠시 후 다시 시도해주세요.',
            duration: 7000
          })
        } else {
          showToast({
            type: 'error',
            title: '재시도 실패',
            message: errorData.message || '문서 분석을 재시작할 수 없습니다.',
            duration: 5000
          })
        }
      }
    } catch (error) {
      console.error('Retry analysis error:', error)
      showToast({
        type: 'error',
        title: '오류 발생',
        message: '재시도 중 오류가 발생했습니다.',
        duration: 5000
      })
    } finally {
      setRetryingDoc(null)
    }
  }

  useEffect(() => {
    // Fetch initial data
    fetchDocuments()

    // Subscribe to document changes with enhanced error handling
    console.log('[DocumentList] Setting up enhanced realtime subscription for subject:', subjectId)
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
            console.log('[DocumentList] Refetching documents due to realtime event')
            fetchDocuments()
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[DocumentList] Realtime subscription status:', status)
        if (err) {
          console.error('[DocumentList] Realtime subscription error:', err)
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('[DocumentList] Successfully subscribed to realtime updates')
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('[DocumentList] Realtime subscription failed with status:', status)
          if (err) {
            console.error('[DocumentList] Error details:', err)
          }
          // Fallback to polling if realtime fails
          console.log('[DocumentList] Falling back to polling due to realtime error')
          const hasProcessingDocs = documents.some(doc => doc.status === 'processing' || doc.status === 'pending')
          if (hasProcessingDocs) {
            startPolling()
          }
        } else if (status === 'TIMED_OUT') {
          console.warn('[DocumentList] Realtime subscription timed out')
          // Retry subscription or fallback to polling
          const hasProcessingDocs = documents.some(doc => doc.status === 'processing' || doc.status === 'pending')
          if (hasProcessingDocs) {
            startPolling()
          }
        }
      })

    realtimeChannelRef.current = channel

    // Cleanup function
    return () => {
      console.log('[DocumentList] Cleaning up realtime subscription and polling')
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
      stopPolling()
    }
  }, [subjectId, supabase, showToast])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

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
        <div className="px-8 py-6 border-b border-slate-200/60 bg-slate-50/50">
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
              <div className="absolute inset-0 bg-gray-300 rounded-2xl rotate-6 opacity-60" />
              <div className="absolute inset-0 bg-gray-400 rounded-2xl -rotate-6 opacity-40" />
              <div className="relative w-full h-full bg-[#2f332f] rounded-2xl flex items-center justify-center shadow-lg">
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
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-emerald-600">
                {documents.length}개
              </span>
              {documents.filter(doc => doc.status === 'completed').length > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                  {documents.filter(doc => doc.status === 'completed').length}개 완료
                </span>
              )}
              {isPollingActive && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
                  실시간 업데이트 중
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {documents.map((doc) => {
        console.log(`[DocumentList] Rendering document: ${doc.title}, status: ${doc.status}`)
        const statusColors = {
          pending: { bg: '#FEF3C7', text: '#92400E' },
          processing: { bg: '#DBEAFE', text: '#1E40AF' },
          completed: { bg: '#D1FAE5', text: '#065F46' },
          failed: { bg: '#FEE2E2', text: '#991B1B' }
        }
        const status = statusColors[doc.status as keyof typeof statusColors] || statusColors.pending
        
        return (
          <div 
            key={doc.id} 
            className="group relative bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer h-full flex flex-col hover:transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-300/30 hover:border-slate-300/80 hover:bg-white ring-1 ring-white/20"
          >
            {/* Modern Preview Area */}
            <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-[radial-gradient(at_30%_30%,rgba(34,197,94,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(at_70%_70%,rgba(16,185,129,0.08),transparent_50%)]" />
              </div>
              
              {/* Floating PDF Icon */}
              <div className="relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#2f332f] rounded-2xl transform rotate-6 opacity-20 group-hover:rotate-12 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-[#2f332f] rounded-2xl transform -rotate-6 opacity-30 group-hover:-rotate-12 transition-transform duration-500" />
                  <div className="relative w-16 h-16 bg-[#2f332f] rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                    <FileText className="w-8 h-8 text-white" />
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
            <div className="p-5 flex-1 flex flex-col">
              {/* Title with Tooltip */}
              <div className="mb-3">
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors duration-300 line-clamp-2 leading-tight">
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
              <div className="flex flex-wrap gap-2 mb-4">
                {doc.page_count && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-lg text-xs font-medium text-slate-600">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    {doc.page_count} 페이지
                  </div>
                )}
                {/* Show error message for failed documents */}
                {(doc.status === 'failed' || doc.status === 'error') && (
                  <div className="w-full px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-red-700">분석 실패</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          {doc.processing_error || '문서 분석 중 오류가 발생했습니다.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Show quota exceeded message */}
                {doc.processing_status === 'rate_limited' && (
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-emerald-700">API 할당량 초과</p>
                        <p className="text-xs text-emerald-600 mt-0.5">
                          잠시 후 재시도 버튼을 눌러주세요.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Enhanced Action Area */}
              <div className="mt-auto">
                {doc.status === 'completed' ? (
                  <Link
                    href={doc.assessment_completed ? `/subjects/${subjectId}/study?doc=${doc.id}` : `/subjects/${subjectId}/study/assessment?doc=${doc.id}`}
                    className="group/btn relative flex items-center justify-center gap-2 w-full p-3 bg-[#2f332f] text-[#2ce477] font-semibold rounded-xl no-underline transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 overflow-hidden text-sm"
                  >
                    {/* Button Background Animation */}
                    <div className="absolute inset-0 bg-gray-900 transform scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-300 origin-left" />
                    
                    {/* Button Content */}
                    <div className="relative flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      <span>{doc.assessment_completed ? '학습 시작하기' : '학습 전 배경지식 체크'}</span>
                    </div>
                    
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 -skew-x-12 bg-white/10 opacity-0 group-hover/btn:opacity-10" />
                  </Link>
                ) : doc.status === 'failed' || doc.status === 'error' || doc.processing_status === 'rate_limited' ? (
                  <button
                    onClick={() => handleRetryAnalysis(doc.id)}
                    disabled={retryingDoc === doc.id}
                    className="group/btn relative flex items-center justify-center gap-2 w-full p-3 bg-[#2f332f] text-[#2ce477] font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 overflow-hidden text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {/* Button Background Animation */}
                    <div className="absolute inset-0 bg-gray-900 transform scale-x-0 group-hover/btn:scale-x-100 transition-transform duration-300 origin-left" />
                    
                    {/* Button Content */}
                    <div className="relative flex items-center gap-2">
                      {retryingDoc === doc.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>재시도 중...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>재시도</span>
                        </>
                      )}
                    </div>
                    
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 -skew-x-12 bg-white/10 opacity-0 group-hover/btn:opacity-10" />
                  </button>
                ) : (
                  <div className="relative flex items-center justify-center gap-2 w-full p-3 bg-slate-100 text-slate-600 font-medium rounded-xl border border-slate-200 text-sm">
                    {/* Animated Processing Indicator */}
                    {doc.status === 'processing' && (
                      <div className="absolute inset-0 bg-gray-100/50 animate-pulse rounded-xl" />
                    )}
                    
                    <div className="relative flex items-center gap-2">
                      {doc.status === 'processing' ? (
                        <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                      ) : (
                        <div className="w-4 h-4 bg-emerald-400 rounded-full animate-pulse" />
                      )}
                      <span>
                        {doc.status === 'pending' ? 'AI 분석 대기 중' : '개념 트리 생성중'}
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