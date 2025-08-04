'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/ToastProvider'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface DeleteDocumentButtonProps {
  documentId: string
  documentTitle: string
  onDeleteSuccess?: () => void
}

export default function DeleteDocumentButton({ documentId, documentTitle, onDeleteSuccess }: DeleteDocumentButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const handleDelete = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '문서 삭제 중 오류가 발생했습니다.')
      }

      showToast({
        type: 'success',
        title: '문서 삭제 완료',
        message: `"${documentTitle}" 문서가 삭제되었습니다.`,
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
        message: error.message || '문서 삭제 중 오류가 발생했습니다.',
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
        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
        aria-label="문서 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        title="문서 삭제"
        description={`정말로 "${documentTitle}" 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 관련된 모든 학습 데이터가 함께 삭제됩니다.`}
        loading={loading}
      />
    </>
  )
}