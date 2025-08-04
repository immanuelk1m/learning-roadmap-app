'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateSubjectButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const defaultColor = '#737373'
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
        className="btn-base btn-primary"
        style={{
          padding: 'var(--spacing-2) var(--spacing-4)',
          fontSize: 'var(--font-size-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        새 과목
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 'var(--z-50)'
          }}
        >
          <div 
            className="surface-elevated"
            style={{ 
              maxWidth: '480px',
              width: '100%',
              padding: 'var(--spacing-8)'
            }}
          >
            <h2 className="text-heading-3" style={{ 
              color: 'var(--color-neutral-900)',
              marginBottom: 'var(--spacing-6)'
            }}>
              새 과목 추가
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 'var(--spacing-5)' }}>
                <label
                  htmlFor="name"
                  className="text-body-sm"
                  style={{ 
                    display: 'block',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                    marginBottom: 'var(--spacing-2)'
                  }}
                >
                  과목명
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    fontSize: 'var(--font-size-base)',
                    border: '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-neutral-0)',
                    color: 'var(--color-neutral-900)',
                    transition: 'all 150ms ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary-500)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(40, 114, 245, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-neutral-300)'
                    e.target.style.boxShadow = 'none'
                  }}
                  placeholder="예: 데이터구조"
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <label
                  htmlFor="description"
                  className="text-body-sm"
                  style={{ 
                    display: 'block',
                    fontWeight: 'var(--font-weight-medium)',
                    color: 'var(--color-neutral-700)',
                    marginBottom: 'var(--spacing-2)'
                  }}
                >
                  설명 (선택)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-3) var(--spacing-4)',
                    fontSize: 'var(--font-size-base)',
                    border: '1px solid var(--color-neutral-300)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-neutral-0)',
                    color: 'var(--color-neutral-900)',
                    transition: 'all 150ms ease',
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '80px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'var(--color-primary-500)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(40, 114, 245, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--color-neutral-300)'
                    e.target.style.boxShadow = 'none'
                  }}
                  rows={3}
                  placeholder="과목에 대한 간단한 설명"
                />
              </div>

              <div style={{ 
                display: 'flex', 
                gap: 'var(--spacing-3)', 
                justifyContent: 'flex-end' 
              }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-base btn-secondary"
                  style={{
                    padding: 'var(--spacing-2) var(--spacing-5)',
                    fontSize: 'var(--font-size-sm)'
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-base btn-primary"
                  style={{
                    padding: 'var(--spacing-2) var(--spacing-5)',
                    fontSize: 'var(--font-size-sm)',
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
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