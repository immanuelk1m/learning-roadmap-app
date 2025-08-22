'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Download, FileText } from 'lucide-react'
import PDFViewerSkeleton from './PDFViewerSkeleton'

interface PDFViewerProps {
  documentId: string
  filePath: string
}

export default function PDFViewer({ documentId, filePath }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()

  // 모바일 환경 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const loadPDF = async () => {
      try {
        console.log('Loading PDF from path:', filePath)
        
        // First check if file exists
        const { data: fileList, error: listError } = await supabase.storage
          .from('pdf-documents')
          .list(filePath.split('/').slice(0, -1).join('/'), {
            limit: 100,
            search: filePath.split('/').pop()
          })
        
        console.log('File list result:', fileList, 'Error:', listError)
        
        // Use download method to get file data and create blob URL
        const { data: fileData, error } = await supabase.storage
          .from('pdf-documents')
          .download(filePath)

        if (error) {
          console.error('PDF download error:', error)
          console.error('Error details:', {
            errorMessage: error.message,
            errorName: error.name,
            errorStack: error.stack,
            errorCause: error.cause,
            ...error
          })
          const errorMessage = error.message || error.name || JSON.stringify(error) || 'Unknown error'
          setError(`PDF를 불러올 수 없습니다: ${errorMessage}`)
          return
        }

        if (fileData) {
          console.log('PDF loaded successfully, size:', fileData.size)
          // Create blob URL for PDF viewing
          const blob = new Blob([fileData], { type: 'application/pdf' })
          const url = URL.createObjectURL(blob)
          setPdfUrl(url)
        } else {
          setError('PDF 파일 데이터를 불러올 수 없습니다.')
        }
      } catch (err: any) {
        console.error('PDF loading error:', err)
        console.error('Error details:', {
          errorMessage: err.message,
          errorName: err.name,
          errorStack: err.stack,
          ...err
        })
        setError(`PDF 로딩 중 오류가 발생했습니다: ${err.message || err.name || 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    loadPDF()

    // Cleanup blob URL when component unmounts
    return () => {
      if (pdfUrl && pdfUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [filePath, supabase])

  if (loading) {
    return <PDFViewerSkeleton />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      {pdfUrl && (
        <>
          {isMobile ? (
            // 모바일: object 태그 사용
            <div className="h-full w-full flex flex-col overflow-auto">
              <object
                data={pdfUrl}
                type="application/pdf"
                className="flex-1 w-full min-h-0"
                style={{ height: '100%', minHeight: '600px' }}
              >
                {/* PDF를 표시할 수 없을 때 대체 콘텐츠 */}
                <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-50">
                  <FileText className="h-16 w-16 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4 text-center">
                    모바일 브라우저에서 PDF를 직접 표시할 수 없습니다.
                  </p>
                  <a
                    href={pdfUrl}
                    download={`document-${documentId}.pdf`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    PDF 다운로드
                  </a>
                  <p className="text-xs text-gray-500 mt-2">
                    다운로드 후 PDF 뷰어 앱에서 열어보세요
                  </p>
                </div>
              </object>
            </div>
          ) : (
            // 데스크톱: iframe 사용
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full"
              title="PDF Viewer"
            />
          )}
        </>
      )}
    </div>
  )
}