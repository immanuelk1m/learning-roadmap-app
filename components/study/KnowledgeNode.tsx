'use client'

import { Handle, Position } from 'reactflow'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

interface KnowledgeNodeProps {
  data: {
    label: string
    description?: string
    status: 'known' | 'unclear' | 'unknown'
    level: number
    onStatusChange: (status: string) => void
  }
}

export default function KnowledgeNodeComponent({ data }: KnowledgeNodeProps) {
  const statusColors = {
    known: 'border-green-500 bg-green-50',
    unclear: 'border-yellow-500 bg-yellow-50',
    unknown: 'border-red-500 bg-red-50',
  }

  const statusIcons = {
    known: CheckCircle,
    unclear: AlertCircle,
    unknown: XCircle,
  }

  const Icon = statusIcons[data.status]

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div
        className={`px-4 py-3 rounded-lg border-2 shadow-md transition-all ${
          statusColors[data.status]
        } min-w-[180px]`}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-sm flex-1">{data.label}</h3>
          <Icon className="h-5 w-5 ml-2 flex-shrink-0" />
        </div>
        
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => data.onStatusChange('known')}
            className={`px-2 py-1 text-xs rounded ${
              data.status === 'known'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
            title="앎"
          >
            🟢
          </button>
          <button
            onClick={() => data.onStatusChange('unclear')}
            className={`px-2 py-1 text-xs rounded ${
              data.status === 'unclear'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
            title="애매함"
          >
            🟠
          </button>
          <button
            onClick={() => data.onStatusChange('unknown')}
            className={`px-2 py-1 text-xs rounded ${
              data.status === 'unknown'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
            title="모름"
          >
            🔴
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  )
}