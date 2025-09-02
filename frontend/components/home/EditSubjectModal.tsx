'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/ToastProvider'

interface EditSubjectModalProps {
  isOpen: boolean
  onClose: () => void
  subjectId: string
  initialName: string
  onUpdated?: () => void
}

export default function EditSubjectModal({
  isOpen,
  onClose,
  subjectId,
  initialName,
  onUpdated,
}: EditSubjectModalProps) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteState, setDeleteState] = useState<{ open: boolean; loading: boolean }>({ open: false, loading: false })
  const { showToast } = useToast()

  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setError(null)
      setLoading(false)
    }
  }, [isOpen, initialName])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('subjects')
        .update({ name })
        .eq('id', subjectId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      onClose()
      if (onUpdated) {
        onUpdated()
      } else {
        // Fallback: reload to reflect changes
        window.location.reload()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!subjectId) return
    try {
      setDeleteState({ open: true, loading: true })
      const supabase = createClient()
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

      showToast({ type: 'success', title: '삭제 완료', message: '과목이 삭제되었습니다.', duration: 3000 })
      setDeleteState({ open: false, loading: false })
      onClose()
      if (onUpdated) onUpdated()
      else window.location.reload()
    } catch (err: any) {
      showToast({ type: 'error', title: '삭제 실패', message: err?.message || '과목 삭제 중 오류가 발생했습니다.', duration: 5000 })
      setDeleteState({ open: true, loading: false })
    }
  }

  if (!isOpen) return null

  return (
    <>
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">과목 이름 수정</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="subject-name" className="block text-sm font-medium text-gray-700 mb-1">
              과목명
            </label>
            <input
              id="subject-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="과목 이름"
              autoFocus
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setDeleteState({ open: true, loading: false })}
              className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              삭제
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#2f332f] hover:bg-gray-900 text-[#2ce477] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <ConfirmModal
      isOpen={deleteState.open}
      onClose={() => setDeleteState({ open: false, loading: false })}
      onConfirm={handleDelete}
      title="과목 삭제"
      description="정말로 이 과목을 삭제하시겠습니까? 관련 문서도 함께 삭제됩니다."
      loading={deleteState.loading}
    />
    </>
  )
}

{/* Confirm Delete Modal */}
// (no-op)
