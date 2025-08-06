'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface DeleteQuizButtonProps {
  documentId: string
  documentTitle: string
  onDeleteSuccess?: () => void
}

export default function DeleteQuizButton({ documentId, documentTitle, onDeleteSuccess }: DeleteQuizButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleDelete = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/quiz/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '문제집 삭제 중 오류가 발생했습니다.')
      }

      showToast({
        type: 'success',
        title: '문제집 삭제 완료',
        message: `"${documentTitle}"의 문제집이 삭제되었습니다.`,
        duration: 3000
      })

      setIsModalOpen(false)
      
      // Call the success callback if provided
      if (onDeleteSuccess) {
        onDeleteSuccess()
      }
    } catch (error: any) {
      showToast({
        type: 'error',
        title: '삭제 실패',
        message: error.message || '문제집 삭제 중 오류가 발생했습니다.',
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  const openModal = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsModalOpen(true)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="absolute top-4 right-4 p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100 z-10"
        aria-label="문제집 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        title="문제집 삭제"
        description={`정말로 "${documentTitle}"의 문제집을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        loading={loading}
      />
    </>
  )
}