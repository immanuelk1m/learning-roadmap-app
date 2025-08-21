'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import PDFViewerSkeleton from './PDFViewerSkeleton'

interface PDFViewerProps {
  documentId: string
  filePath: string
}

export default function PDFViewer({ documentId, filePath }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

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
            message: error.message,
            name: error.name,
            stack: error.stack,
            cause: error.cause,
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
          message: err.message,
          name: err.name,
          stack: err.stack,
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
    <div className="h-full w-full">
      {pdfUrl && (
        <iframe
          src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
          className="w-full h-full"
          title="PDF Viewer"
        />
      )}
    </div>
  )
}