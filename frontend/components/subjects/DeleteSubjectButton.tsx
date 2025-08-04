'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ToastProvider'
import ConfirmModal from '@/components/ui/ConfirmModal'

interface DeleteSubjectButtonProps {
  subjectId: string
  subjectName: string
  onDelete?: () => void
}

export default function DeleteSubjectButton({ subjectId, subjectName, onDelete }: DeleteSubjectButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const { showToast } = useToast()

  const handleDelete = async () => {
    try {
      setLoading(true)

      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .eq('subject_id', subjectId)

      if (docsError) throw docsError

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

      setIsModalOpen(false)
      
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
        aria-label="과목 삭제"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleDelete}
        title="과목 삭제"
        description={`정말로 "${subjectName}" 과목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        loading={loading}
      />
    </>
  )
}