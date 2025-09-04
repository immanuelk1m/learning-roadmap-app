'use client'

import { useState } from 'react'

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  const handleProCheckout = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/billing/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '결제 세션 생성 실패')
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (e) {
      console.error(e)
      alert('결제 세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">요금제</h1>
      <p className="mt-2 text-gray-600">필요에 맞는 플랜을 선택하세요. 프로는 월 $5입니다.</p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="border border-gray-200 rounded-xl p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">스타터</h2>
            <div className="text-gray-900 text-lg font-semibold">무료</div>
          </div>
          <p className="mt-1 text-sm text-gray-500">개인 학습을 시작하기 위한 기본 기능</p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>과목 관리</li>
            <li>문서 업로드</li>
            <li>기본 퀴즈</li>
          </ul>
          <button className="mt-6 w-full py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50">현재 플랜</button>
        </section>

        <section className="border border-gray-900 rounded-xl p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">프로</h2>
            <div className="text-gray-900 text-xl font-bold">$5<span className="text-sm font-normal text-gray-600">/월</span></div>
          </div>
          <p className="mt-1 text-sm text-gray-500">성장을 가속하는 고급 기능</p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>스마트 퀴즈 생성</li>
            <li>학습 가이드 고급 기능</li>
            <li>우선 지원</li>
          </ul>
          <button onClick={handleProCheckout} disabled={loading} className="mt-6 w-full py-2 rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-60">
            {loading ? '진행 중...' : '프로 신청'}
          </button>
        </section>
      </div>
    </main>
  )
}

