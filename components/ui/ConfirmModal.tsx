'use client'

import { X } from 'lucide-react'
import { FC, MouseEvent } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  loading?: boolean
}

const ConfirmModal: FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, description, loading = false }) => {
  if (!isOpen) return null

  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0 duration-300"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl animate-in zoom-in-95 fade-in-0 duration-300">
        <div className="flex flex-col items-center text-center">
          <h3 className="mb-2 text-2xl font-bold text-neutral-900">{title}</h3>
          <p className="mb-8 text-base text-neutral-600 [word-break:keep-all] [overflow-wrap:break-word] text-center">
            {description}
          </p>

          <div className="flex w-full gap-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg bg-neutral-200 px-6 py-3 text-base font-medium text-neutral-800 transition-colors hover:bg-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 rounded-lg bg-red-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  처리 중...
                </span>
              ) : (
                '삭제'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal