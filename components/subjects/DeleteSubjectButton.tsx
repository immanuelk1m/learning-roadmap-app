'use client'

import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'

interface DeleteSubjectButtonProps {
  subjectId: string
  subjectName: string
  onDelete?: () => void
}

export default function DeleteSubjectButton({ subjectId, subjectName, onDelete }: DeleteSubjectButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { showToast } = useToast()

  const handleDelete = async () => {
    try {
      setLoading(true)

      // Delete all documents in the subject first
      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .eq('subject_id', subjectId)

      if (docsError) throw docsError

      // Then delete the subject
      const { error: subjectError } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId)

      if (subjectError) throw subjectError

      showToast({
        type: 'success',
        title: '과목 삭제 완료',
        message: `"${subjectName}" 과목이 삭제되었습니다.`,
        duration: 3000
      })

      setIsOpen(false)
      
      if (onDelete) {
        onDelete()
      } else {
        router.refresh()
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: '삭제 실패',
        message: error.message || '과목 삭제 중 오류가 발생했습니다.',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen(true)
        }}
        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
        aria-label="과목 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl max-w-md w-full p-8 shadow-modern border border-white/20 animate-in zoom-in-95 fade-in duration-200">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-semibold text-neutral-900">과목 삭제</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors rounded-lg p-1 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-neutral-600 mb-8 leading-relaxed">
              정말로 "<span className="font-semibold text-neutral-900">{subjectName}</span>" 과목을 삭제하시겠습니까?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-5 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    삭제 중...
                  </span>
                ) : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}