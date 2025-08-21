'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, FilePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import { uploadLogger } from '@/lib/logger'
import Logger from '@/lib/logger'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

interface UploadPDFButtonProps {
  subjectId: string
  onUploadSuccess?: () => void
}

export default function UploadPDFButton({ subjectId, onUploadSuccess }: UploadPDFButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { showToast } = useToast()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('PDF 파일만 업로드할 수 있습니다.')
        return
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('파일 크기는 50MB 이하여야 합니다.')
        return
      }
      
      // Check page count limit (40 pages max)
      try {
        setError('PDF 페이지 수 확인 중...')
        
        const arrayBuffer = await selectedFile.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const pageCount = pdf.numPages
        
        console.log(`PDF page count: ${pageCount}`)
        
        if (pageCount > 40) {
          setError(`PDF는 최대 40페이지까지만 업로드 가능합니다. (현재: ${pageCount}페이지)`)
          setFile(null)
          return
        }
        
        // Store page count for later use
        ;(selectedFile as any).pageCount = pageCount
        
      } catch (error) {
        console.error('Failed to check PDF page count:', error)
        setError('PDF 파일을 확인하는 중 오류가 발생했습니다.')
        return
      }
      
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    const correlationId = Logger.generateCorrelationId()
    const timer = uploadLogger.startTimer()

    uploadLogger.info('PDF upload started', {
      correlationId,
      metadata: {
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        fileType: file.type,
        subjectId,
      }
    })

    setLoading(true)
    setError(null)

    try {
      // Use fixed user ID
      const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${FIXED_USER_ID}/${subjectId}/${Date.now()}.${fileExt}`

      uploadLogger.info('Uploading to Supabase Storage', {
        correlationId,
        metadata: {
          storagePath: fileName,
          bucketName: 'pdf-documents'
        }
      })

      console.log('Starting storage upload...', {
        bucket: 'pdf-documents',
        fileName,
        fileSize: file.size,
        fileType: file.type
      })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-documents')
        .upload(fileName, file, {
          contentType: 'application/pdf',
          upsert: false
        })

      console.log('Storage upload result:', {
        data: uploadData,
        error: uploadError
      })

      if (uploadError) {
        console.error('Storage upload error details:', {
          errorMessage: uploadError.message,
          errorName: uploadError.name,
          errorStack: uploadError.stack,
          errorCause: uploadError.cause,
          ...uploadError
        })
        
        uploadLogger.error('Storage upload failed', {
          correlationId,
          error: uploadError,
          metadata: {
            errorMessage: uploadError.message,
            errorDetails: JSON.stringify(uploadError),
            storagePath: fileName
          }
        })
        throw uploadError
      }

      const uploadDuration = timer()
      uploadLogger.info('Storage upload successful', {
        correlationId,
        duration: uploadDuration,
        metadata: {
          uploadData,
          uploadSpeed: `${((file.size / 1024 / 1024) / (uploadDuration / 1000)).toFixed(2)} MB/s`
        }
      })

      // Create document record in database
      uploadLogger.info('Creating document record', {
        correlationId,
        metadata: {
          operation: 'database_insert',
          table: 'documents'
        }
      })
      
      const documentData = {
        subject_id: subjectId,
        user_id: FIXED_USER_ID,
        title: file.name.replace('.pdf', ''),
        file_path: fileName,
        file_size: file.size,
        page_count: (file as any).pageCount || null,
        status: 'processing',
      }
      
      uploadLogger.debug('Document data prepared', {
        correlationId,
        metadata: { documentData }
      })

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single()

      if (dbError) {
        uploadLogger.error('Database insert failed', {
          correlationId,
          error: dbError,
          metadata: {
            errorMessage: dbError.message,
            table: 'documents'
          }
        })
        throw dbError
      }

      uploadLogger.info('Document record created', {
        correlationId,
        documentId: newDoc.id,
        metadata: {
          documentRecord: newDoc,
          willTriggerRealtime: true
        }
      })

      setIsOpen(false)
      setFile(null)
      
      // Show success toast
      showToast({
        type: 'success',
        title: 'PDF 업로드 완료',
        message: '문서를 분석하고 있습니다. 잠시 후 결과를 확인하세요.',
        duration: 5000
      })
      
      // Call the callback to refresh the document list immediately
      if (onUploadSuccess) {
        onUploadSuccess()
      }

      // Trigger AI analysis in background
      if (newDoc) {
        const analysisEndpoint = `/api/documents/${newDoc.id}/analyze`
        uploadLogger.info('Triggering AI analysis', {
          correlationId,
          documentId: newDoc.id,
          metadata: {
            endpoint: analysisEndpoint,
            method: 'POST'
          }
        })
        
        // Add retry logic for analysis API
        const maxRetries = 3
        let retryCount = 0
        
        const triggerAnalysis = async () => {
          try {
            const analysisTimer = uploadLogger.startTimer()
            const response = await fetch(analysisEndpoint, {
              method: 'POST',
              headers: {
                'x-correlation-id': correlationId
              }
            })
            
            const analysisDuration = analysisTimer()
            
            if (!response.ok) {
              const errorText = await response.text()
              let errorData: any = {}
              try {
                errorData = JSON.parse(errorText)
              } catch {
                errorData = { message: errorText }
              }
              
              uploadLogger.error('Analysis API failed', {
                correlationId,
                documentId: newDoc.id,
                duration: analysisDuration,
                metadata: {
                  status: response.status,
                  statusText: response.statusText,
                  errorResponse: errorData,
                  retryCount,
                  willRetry: false // No automatic retry for 429
                }
              })
              
              // Handle 429 error specifically - show user action required
              if (response.status === 429 && errorData.error === 'API_QUOTA_EXCEEDED') {
                showToast({
                  type: 'warning',
                  title: 'API 할당량 초과',
                  message: '잠시 후 문서 목록에서 재시도 버튼을 눌러주세요.',
                  duration: 10000
                })
                
                // Update the document status to show retry button
                await supabase
                  .from('documents')
                  .update({ 
                    status: 'error',
                    processing_status: 'rate_limited',
                    processing_error: errorData.message || 'API 할당량이 초과되었습니다.'
                  })
                  .eq('id', newDoc.id)
                
                // Don't retry automatically
                return
              }
              
              // For other errors, no automatic retry either
              showToast({
                type: 'error',
                title: '문서 분석 실패',
                message: '문서 분석 중 오류가 발생했습니다. 문서 목록에서 재시도해주세요.',
                duration: 7000
              })
            } else {
              uploadLogger.info('Analysis API triggered successfully', {
                correlationId,
                documentId: newDoc.id,
                duration: analysisDuration,
                metadata: {
                  status: response.status,
                  retryCount
                }
              })
            }
          } catch (error: any) {
            uploadLogger.error('Failed to trigger analysis API', {
              correlationId,
              documentId: newDoc.id,
              error,
              metadata: {
                errorMessage: error.message,
                errorType: error.name,
                retryCount,
                willRetry: retryCount < maxRetries
              }
            })
            
            if (retryCount < maxRetries) {
              retryCount++
              const retryDelay = Math.pow(2, retryCount) * 1000
              setTimeout(triggerAnalysis, retryDelay)
            }
          }
        }
        
        // Trigger analysis with retry logic
        triggerAnalysis()
      }

      const totalDuration = timer()
      uploadLogger.info('PDF upload completed successfully', {
        correlationId,
        documentId: newDoc?.id,
        duration: totalDuration,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          uploadSpeed: `${((file.size / 1024 / 1024) / (totalDuration / 1000)).toFixed(2)} MB/s`
        }
      })
    } catch (error: any) {
      const duration = timer()
      uploadLogger.error('PDF upload failed', {
        correlationId,
        error,
        duration,
        metadata: {
          errorType: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          fileName: file.name,
          fileSize: file.size,
          subjectId
        }
      })
      setError(error.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="group relative inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transform hover:scale-105 transition-all duration-300 ring-1 ring-white/20 overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-700 to-indigo-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        
        {/* Content */}
        <div className="relative flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors duration-300">
            <FilePlus className="h-5 w-5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold">PDF 업로드</span>
            <span className="text-xs text-blue-100 group-hover:text-white transition-colors duration-300">새 문서 추가</span>
          </div>
        </div>
        
        {/* Shimmer Effect */}
        <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 group-hover:animate-shimmer" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">PDF 업로드</h2>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setFile(null)
                    setError(null)
                  }}
                  className="w-8 h-8 rounded-lg bg-white/50 hover:bg-white transition-colors flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-6">

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-base font-medium text-gray-900 mb-2">
                  클릭하여 PDF 파일을 선택하세요
                </p>
                <p className="text-sm text-gray-500">또는 파일을 여기에 드래그하세요</p>
                <p className="text-xs text-gray-400 mt-2">최대 50MB, 40페이지까지 지원</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-green-200 bg-green-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {file.name}
                      </p>
                      <p className="text-xs text-green-600">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB • {(file as any).pageCount}페이지 • 업로드 준비 완료
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="w-8 h-8 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6 flex gap-3 justify-end border-t border-gray-100 pt-4">
              <button
                onClick={() => {
                  setIsOpen(false)
                  setFile(null)
                  setError(null)
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || loading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    업로드 중...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    업로드
                  </div>
                )}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}