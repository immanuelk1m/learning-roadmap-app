'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, TreePine, FileText, Brain } from 'lucide-react'

interface StudyLayoutProps {
  document: any
  mode: string
  children: React.ReactNode
}

export default function StudyLayout({ document, mode, children }: StudyLayoutProps) {
  const pathname = usePathname()
  const baseUrl = pathname.split('?')[0]

  const tabs = [
    { id: 'tree', label: '지식 트리', icon: TreePine },
    { id: 'pdf', label: 'PDF 뷰어', icon: FileText },
    { id: 'quiz', label: '퀴즈', icon: Brain },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/subjects/${document.subject_id}`}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {document.subjects.name}
            </Link>
            <div className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2 bg-neutral-600"
              />
              <h1 className="text-xl font-semibold text-gray-900">
                {document.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = mode === tab.id
            return (
              <Link
                key={tab.id}
                href={`${baseUrl}?mode=${tab.id}`}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-900 border-b-2 border-neutral-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-50">
        {children}
      </div>
    </div>
  )
}