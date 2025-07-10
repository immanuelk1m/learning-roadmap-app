'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

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
        const { data } = supabase.storage
          .from('pdf-documents')
          .getPublicUrl(filePath)

        if (data) {
          setPdfUrl(data.publicUrl)
        } else {
          setError('PDF를 불러올 수 없습니다.')
        }
      } catch (err) {
        setError('PDF 로딩 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadPDF()
  }, [filePath, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
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