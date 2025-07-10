'use client'

import Link from 'next/link'
import { FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface Document {
  id: string
  subject_id: string
  title: string
  file_size: number | null
  page_count: number | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

export default function DocumentList({ documents }: { documents: Document[] }) {
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-gray-700" />
      case 'processing':
        return <Clock className="h-5 w-5 text-gray-600 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-gray-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (status: Document['status']) => {
    switch (status) {
      case 'completed':
        return '분석 완료'
      case 'processing':
        return '분석 중...'
      case 'failed':
        return '분석 실패'
      default:
        return '대기 중'
    }
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Link
          key={doc.id}
          href={`/subjects/${doc.subject_id}/study?id=${doc.id}`}
          className={`block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
            doc.status !== 'completed' ? 'opacity-75 pointer-events-none' : ''
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <FileText className="h-6 w-6 text-gray-400 mr-3 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {doc.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {doc.page_count && <span>{doc.page_count} 페이지</span>}
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>{new Date(doc.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(doc.status)}
              <span className="text-sm text-gray-600">{getStatusText(doc.status)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}