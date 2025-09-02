'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, FileText, X, FilePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import { uploadLogger } from '@/lib/logger'
import Logger from '@/lib/logger'
import { pdf, Document as PDFDoc, Page as PDFPage, Image as PDFImage, StyleSheet } from '@react-pdf/renderer'
// Dynamic import for PDF.js to avoid SSR issues
let pdfjsLib: any = null
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((pdfjs) => {
    pdfjsLib = pdfjs
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  })
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
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [thumbnails, setThumbnails] = useState<{ page: number; url: string }[]>([])
  const [selectedPages, setSelectedPages] = useState<number[]>([])
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const pdfDocRef = useRef<any>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [rangeInput, setRangeInput] = useState<string>('')

  const MAX_SELECTABLE = 20

  const styles = useMemo(() => StyleSheet.create({
    page: { padding: 0 },
    img: { width: '100%', height: '100%' }
  }), [])

  // Helper: parse range input like "1-12, 15, 19"
  function parsePageRanges(input: string, total: number, limit: number): number[] {
    const cleaned = input.replace(/~/g, '-').replace(/–/g, '-').replace(/\s+/g, '')
    if (!cleaned) return []
    const parts = cleaned.split(',').filter(Boolean)
    const set = new Set<number>()
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-')
        const start = Math.max(1, Math.min(total, parseInt(startStr, 10)))
        const end = Math.max(1, Math.min(total, parseInt(endStr, 10)))
        if (!isFinite(start) || !isFinite(end)) continue
        const [s, e] = start <= end ? [start, end] : [end, start]
        for (let i = s; i <= e; i++) {
          if (set.size >= limit) break
          set.add(i)
        }
      } else {
        const n = Math.max(1, Math.min(total, parseInt(part, 10)))
        if (isFinite(n)) {
          if (set.size >= limit) break
          set.add(n)
        }
      }
      if (set.size >= limit) break
    }
    return Array.from(set).sort((a,b)=>a-b)
  }

  // Helper: format pages like [1,2,3,5,7,8] -> "1-3,5,7-8"
  function formatPageRanges(pages: number[]): string {
    if (!pages || pages.length === 0) return ''
    const sorted = [...pages].sort((a,b)=>a-b)
    const parts: string[] = []
    let start = sorted[0]
    let prev = sorted[0]
    for (let i = 1; i < sorted.length; i++) {
      const n = sorted[i]
      if (n === prev + 1) {
        prev = n
        continue
      }
      // close previous range
      parts.push(start === prev ? `${start}` : `${start}-${prev}`)
      start = prev = n
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`)
    return parts.join(', ')
  }

  // Keep the range input in sync with current selection
  useEffect(() => {
    setRangeInput(formatPageRanges(selectedPages))
  }, [selectedPages])

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
      
      // Check page count limit (80 pages max) - only in browser
      if (typeof window !== 'undefined' && pdfjsLib) {
        try {
          setError('PDF 페이지 수 확인 중...')
          
          const arrayBuffer = await selectedFile.arrayBuffer()
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          pdfDocRef.current = pdf
          const pageCount = pdf.numPages
          
          console.log(`PDF page count: ${pageCount}`)
          
          if (pageCount > 80) {
            setError(`PDF는 최대 80페이지까지만 업로드 가능합니다. (현재: ${pageCount}페이지)`) 
            setFile(null)
            return
          }
          
          // Store page count for later use
          ;(selectedFile as any).pageCount = pageCount
          setPageCount(pageCount)
          // Generate thumbnails
          setGeneratingPreview(true)
          const thumbs: { page: number; url: string }[] = []
          for (let i = 1; i <= pageCount; i++) {
            try {
              const page = await pdf.getPage(i)
              // Generate higher-res thumbnails for album view
              const viewport = page.getViewport({ scale: 0.5 })
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              if (!ctx) continue
              canvas.width = viewport.width
              canvas.height = viewport.height
              await page.render({ canvasContext: ctx, viewport }).promise
              const url = canvas.toDataURL('image/jpeg', 0.8)
              thumbs.push({ page: i, url })
              // free canvas
              canvas.width = 0
              canvas.height = 0
            } catch (err) {
              console.warn('Thumbnail render failed for page', i, err)
            }
          }
          setThumbnails(thumbs)
          // Default selection
          if (pageCount <= MAX_SELECTABLE) {
            setSelectedPages(Array.from({ length: pageCount }, (_, idx) => idx + 1))
          } else {
            setSelectedPages(Array.from({ length: MAX_SELECTABLE }, (_, idx) => idx + 1))
            showToast({
              type: 'info',
              title: '페이지 선택 제한',
              message: `최대 ${MAX_SELECTABLE}페이지까지만 선택 가능합니다. 기본으로 처음 ${MAX_SELECTABLE}페이지가 선택되었습니다.`,
              duration: 5000
            })
          }
          setGeneratingPreview(false)
          
        } catch (error) {
          console.error('Failed to check PDF page count:', error)
          // Don't block upload if page count check fails
          console.warn('Proceeding without page count validation')
          setGeneratingPreview(false)
        }
      } else {
        console.warn('PDF.js not loaded, skipping page count validation')
      }
      
      setFile(selectedFile)
      setError(null)
    }
  }

  // Album view only (no separate large preview)

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

      // If user selected pages, generate a sliced PDF from selected pages only
      let fileToUpload: File | Blob = file
      let usedPageCount = (file as any).pageCount || null
      if (pageCount && selectedPages.length > 0 && selectedPages.length <= MAX_SELECTABLE) {
        try {
          if (!pdfjsLib) throw new Error('PDF.js not loaded')
          const arrayBuffer = await file.arrayBuffer()
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
          // Render selected pages to images
          const images: string[] = []
          // Render at higher scale for readability
          for (const p of selectedPages) {
            const page = await pdfDoc.getPage(p)
            const viewport = page.getViewport({ scale: 1.5 })
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) continue
            canvas.width = viewport.width
            canvas.height = viewport.height
            await page.render({ canvasContext: ctx, viewport }).promise
            const url = canvas.toDataURL('image/jpeg', 0.9)
            images.push(url)
            canvas.width = 0
            canvas.height = 0
          }

          // Build a new PDF from images
          const Sliced = () => (
            <PDFDoc>
              {images.map((src, idx) => (
                <PDFPage key={idx} size="A4" style={styles.page}>
                  <PDFImage src={src} style={styles.img} />
                </PDFPage>
              ))}
            </PDFDoc>
          )
          const slicedBlob = await pdf(<Sliced />).toBlob()
          const slicedFile = new File([slicedBlob], file.name.replace(/\.pdf$/i, '') + '_selected.pdf', { type: 'application/pdf' })
          fileToUpload = slicedFile
          usedPageCount = selectedPages.length
        } catch (genErr: any) {
          console.warn('Failed to generate sliced PDF, fallback to original:', genErr)
        }
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-documents')
        .upload(fileName, fileToUpload, {
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
        title: file.name.replace(/\.pdf$/i, ''),
        file_path: fileName,
        file_size: (fileToUpload as any).size || file.size,
        page_count: usedPageCount,
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
        className="group relative inline-flex items-center gap-3 px-6 py-3 bg-[#2f332f] text-[#2ce477] font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transform hover:scale-105 transition-all duration-300 ring-1 ring-white/20 overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gray-900 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        
        {/* Content */}
        <div className="relative flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors duration-300">
            <FilePlus className="h-5 w-5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold">PDF 업로드</span>
            <span className="text-xs text-emerald-100 group-hover:text-white transition-colors duration-300">새 문서 추가</span>
          </div>
        </div>
        
        {/* Shimmer Effect */}
        <div className="absolute inset-0 -skew-x-12 bg-white/10 opacity-0 group-hover:opacity-10 group-hover:animate-shimmer" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-[80%] max-w-4xl shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Upload className="h-5 w-5 text-emerald-600" />
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
              {file && (
                <div className="mt-4 flex items-start gap-3">
                  <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-gray-600 mt-1">{(file.size / (1024 * 1024)).toFixed(1)} MB {pageCount ? `• ${pageCount}페이지` : ''}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6">

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-200 rounded-xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 group"
              >
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-base font-medium text-gray-900 mb-2">
                  클릭하여 PDF 파일을 선택하세요
                </p>
                <p className="text-sm text-gray-500">또는 파일을 여기에 드래그하세요</p>
                <p className="text-xs text-gray-400 mt-2">최대 50MB, 80페이지까지 지원</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              // Single-column body: album-style selection (meta is in header)
              <div className="grid grid-cols-1 gap-6">
                <div className="border rounded-xl p-4 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">페이지 선택</h3>
                    <div className="flex items-center gap-3 text-sm">
                      {pageCount && pageCount > 0 && (
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedPages.length === Math.min(pageCount, MAX_SELECTABLE)}
                            onChange={(e) => {
                              if (!pageCount) return
                            if (e.target.checked) {
                              const cnt = Math.min(pageCount, MAX_SELECTABLE)
                              const arr = Array.from({ length: cnt }, (_, i) => i + 1)
                              setSelectedPages(arr)
                              if (pageCount > MAX_SELECTABLE) {
                                showToast({ type: 'info', title: '선택 제한', message: `처음 ${MAX_SELECTABLE}페이지만 선택됩니다.`, duration: 3500 })
                              }
                            } else {
                              setSelectedPages([])
                            }
                          }}
                          />
                          전체 선택
                        </label>
                      )}
                      <button
                        onClick={() => setSelectedPages([])}
                        className="text-gray-600 hover:text-gray-900"
                      >초기화</button>
                      <span className="text-gray-600">선택: <span className="font-semibold">{selectedPages.length}</span> / {MAX_SELECTABLE}</span>
                    </div>
                  </div>

                  {/* Range input */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-600">구간 입력 (예: 1-12, 15, 19)</label>
                    <div className="flex items-stretch gap-2">
                      <input
                        type="text"
                        placeholder="1-12, 15, 19"
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const total = pageCount ?? (file as any).pageCount ?? 0
                            const pages = parsePageRanges(rangeInput, total, MAX_SELECTABLE)
                            if (pages.length === 0) {
                              setRangeError('유효한 페이지 범위를 입력하세요.')
                            } else {
                              setRangeError(null)
                            }
                            setSelectedPages(pages)
                          }
                        }}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => {
                          const total = pageCount ?? (file as any).pageCount ?? 0
                          const pages = parsePageRanges(rangeInput, total, MAX_SELECTABLE)
                          if (pages.length === 0) {
                            setRangeError('유효한 페이지 범위를 입력하세요.')
                          } else {
                            setRangeError(null)
                          }
                          setSelectedPages(pages)
                        }}
                      >적용</button>
                    </div>
                    {rangeError && <p className="text-xs text-red-600">{rangeError}</p>}
                  </div>

                  {/* Album grid */}
                  <div className="mt-3 max-h-[520px] overflow-auto border border-emerald-100 rounded-lg p-3 bg-white">
                    {generatingPreview ? (
                      <div className="text-sm text-gray-500 p-4">페이지 미리보기 생성 중...</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {thumbnails.map((t) => {
                          const active = selectedPages.includes(t.page)
                          return (
                            <button
                              type="button"
                              key={t.page}
                              className={`relative border ${active ? 'border-emerald-500' : 'border-gray-200'} rounded-lg overflow-hidden group shadow-sm`}
                              onClick={() => {
                                setSelectedPages((prev) => {
                                  const exists = prev.includes(t.page)
                                  if (exists) return prev.filter((p) => p !== t.page)
                                  if (prev.length >= MAX_SELECTABLE) {
                                    showToast({ type: 'warning', title: '최대 선택 수 초과', message: `최대 ${MAX_SELECTABLE}페이지까지 선택할 수 있습니다.`, duration: 3000 })
                                    return prev
                                  }
                                  return [...prev, t.page].sort((a,b)=>a-b)
                                })
                              }}
                              title={`페이지 ${t.page}`}
                            >
                              <div style={{ aspectRatio: '3 / 4' }} className="w-full bg-gray-50">
                                <img src={t.url} alt={`p${t.page}`} className="w-full h-full object-contain" />
                              </div>
                              <span className={`absolute top-1 left-1 text-[11px] px-1.5 py-0.5 rounded ${active ? 'bg-emerald-600 text-white' : 'bg-black/60 text-white'}`}>{t.page}</span>
                              {active && (
                                <>
                                  <span className="absolute inset-0 bg-emerald-500/20" />
                                  <span className="absolute bottom-2 right-2 text-xs bg-emerald-600 text-white rounded px-2 py-0.5">선택됨</span>
                                </>
                              )}
                            </button>
                          )
                        })}
                        {thumbnails.length === 0 && (
                          <div className="text-xs text-gray-500 p-2">미리보기를 생성할 수 없습니다.</div>
                        )}
                      </div>
                    )}
                  </div>
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
                className="px-5 py-2.5 text-sm font-medium text-[#2ce477] bg-[#2f332f] rounded-xl hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
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
