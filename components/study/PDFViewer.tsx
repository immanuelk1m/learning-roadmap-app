'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface PDFViewerProps {
  documentId: string
  filePath: string
  highlights?: Array<{
    page: number
    text: string
    color?: string
  }>
}

export default function PDFViewer({ documentId, filePath, highlights = [] }: PDFViewerProps) {
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadPDF()
  }, [filePath])

  useEffect(() => {
    if (pdfDoc) {
      renderPage()
    }
  }, [pdfDoc, pageNumber, scale])

  const loadPDF = async () => {
    try {
      setLoading(true)
      
      // Get file URL from Supabase storage
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const loadingTask = pdfjsLib.getDocument(data.publicUrl)
      const pdf = await loadingTask.promise
      
      setPdfDoc(pdf)
      setNumPages(pdf.numPages)
      setLoading(false)
    } catch (error) {
      console.error('Error loading PDF:', error)
      setLoading(false)
    }
  }

  const renderPage = async () => {
    if (!pdfDoc || !canvasRef.current) return

    const page = await pdfDoc.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return

    canvas.height = viewport.height
    canvas.width = viewport.width

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    }

    await page.render(renderContext).promise

    // Apply highlights
    const textContent = await page.getTextContent()
    const pageHighlights = highlights.filter(h => h.page === pageNumber)
    
    if (pageHighlights.length > 0) {
      // TODO: Implement text highlighting
    }
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset
      return Math.min(Math.max(1, newPage), numPages)
    })
  }

  const changeScale = (delta: number) => {
    setScale(prevScale => Math.max(0.5, Math.min(2.0, prevScale + delta)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium">
            {pageNumber} / {numPages}
          </span>
          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => changeScale(-0.1)}
            className="p-2 rounded hover:bg-gray-100"
          >
            <ZoomOut className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => changeScale(0.1)}
            className="p-2 rounded hover:bg-gray-100"
          >
            <ZoomIn className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            className="shadow-lg bg-white"
          />
        </div>
      </div>
    </div>
  )
}