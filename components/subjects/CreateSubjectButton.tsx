'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
export default function CreateSubjectButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const defaultColor = '#3B82F6'
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || null,
          color: defaultColor,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subject')
      }

      setIsOpen(false)
      setName('')
      setDescription('')
      router.refresh()
    } catch (error) {
      console.error('Error creating subject:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
      alert(`과목 생성 중 오류가 발생했습니다.\n\n${errorMessage}\n\nSupabase 대시보드에서 다음 SQL을 실행해주세요:\nALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;`)
    } finally {
      setLoading(false)
    }
  }


  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 rounded-xl shadow-modern hover:shadow-modern-hover transition-all duration-300 transform hover:scale-105 btn-modern"
      >
        <Plus className="h-5 w-5 mr-2" />
        새 과목 추가
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl max-w-md w-full p-8 shadow-modern border border-white/20">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">새 과목 추가</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-neutral-700 mb-2"
                >
                  과목명
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/50 backdrop-blur-sm transition-all duration-300"
                  placeholder="예: 데이터구조"
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-neutral-700 mb-2"
                >
                  설명 (선택)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/50 backdrop-blur-sm transition-all duration-300 resize-none"
                  rows={3}
                  placeholder="과목에 대한 간단한 설명"
                />
              </div>


              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-3 text-sm font-semibold text-neutral-700 bg-white/70 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all duration-300 transform hover:scale-105"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl hover:from-primary-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105 btn-modern shadow-modern"
                >
                  {loading ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}