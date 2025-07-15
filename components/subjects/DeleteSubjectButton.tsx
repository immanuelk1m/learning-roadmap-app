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
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">과목 삭제</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-6">
              정말로 "<span className="font-semibold text-gray-900">{subjectName}</span>" 과목을 삭제하시겠습니까?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}