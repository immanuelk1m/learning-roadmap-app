'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/ToastProvider'

interface DeleteQuizSetButtonProps {
  quizSetId: string
  quizSetName: string
  onDeleted?: () => void
}

export default function DeleteQuizSetButton({ quizSetId, quizSetName, onDeleted }: DeleteQuizSetButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleDelete = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/quiz/sets/${quizSetId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '문제집 삭제에 실패했습니다.')
      }
      showToast({ type: 'success', title: '문제집 삭제', message: '문제집이 삭제되었습니다.' })
      setOpen(false)
      onDeleted?.()
    } catch (e: any) {
      showToast({ type: 'error', title: '삭제 실패', message: e.message || '오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className="p-2 rounded-lg text-red-600 hover:bg-red-50"
        aria-label="문제집 삭제"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
        title="문제집 삭제"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <ConfirmModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="문제집 삭제"
        description={`정말로 "${quizSetName}" 문제집을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        loading={loading}
      />
    </>
  )
}

