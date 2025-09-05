'use client'

import { useState } from 'react'

export default function PricingClient({ isPro }: { isPro: boolean }) {
  const [loading, setLoading] = useState(false)
  const [openIdx, setOpenIdx] = useState<number | null>(0)

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
            <li>월 PDF 80페이지 처리</li>
            <li>월 문제 생성 8회</li>
            <li>과목 관리 및 기본 기능</li>
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
            <li>월 PDF 800페이지 처리</li>
            <li>월 문제 생성 80회</li>
            <li>스마트 퀴즈/가이드 등 고급 기능</li>
          </ul>
          <button onClick={handleProCheckout} disabled={loading || isPro} className="mt-6 w-full py-2 rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-60">
            {isPro ? '이미 프로입니다' : (loading ? '진행 중...' : '프로 신청')}
          </button>
        </section>
      </div>

      {/* FAQ Section */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold text-gray-900">자주 묻는 질문</h2>
        <div className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
          {[
            {
              q: '프로 결제 후 한도는 언제 반영되나요?',
              a: '결제가 완료되면 구독이 활성화되고 즉시 Pro 한도(월 PDF 800페이지, 문제 생성 80회)가 적용됩니다. 브라우저에서 새로고침하면 바로 확인할 수 있습니다.'
            },
            {
              q: '한도는 매달 언제 리셋되나요?',
              a: '모든 한도는 월 단위로 관리되며, 매월 1일 00:00(프로젝트 서버 시간 기준)에 자동으로 리셋됩니다.'
            },
            {
              q: '페이지 수는 어떻게 계산하나요?',
              a: '업로드 시 선택한 페이지 수를 기준으로 차감합니다. 페이지를 선택하지 않으면 파일의 전체 페이지 수가 차감됩니다.'
            },
            {
              q: '한도를 초과하면 어떻게 되나요?',
              a: '한도를 초과하면 업로드/생성이 차단되며 안내 메시지가 표시됩니다. Pro 구독으로 업그레이드하거나 다음 달 리셋을 기다려주세요.'
            },
            {
              q: '플랜 변경과 해지는 어떻게 하나요?',
              a: '요금제 페이지에서 프로 신청 또는 구독 관리 버튼을 통해 변경할 수 있습니다. 해지 시 현재 청구 기간 종료까지 Pro 혜택이 유지됩니다.'
            },
            {
              q: '영수증은 어디서 확인할 수 있나요?',
              a: '결제 완료 후 이메일로 영수증이 발송됩니다. 추가 서류가 필요하면 문의해 주세요.'
            }
          ].map((item, idx) => (
            <div key={idx} className="p-5">
              <button
                type="button"
                className="w-full flex items-center justify-between text-left"
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                aria-expanded={openIdx === idx}
              >
                <span className="text-[15px] font-semibold text-gray-900">{item.q}</span>
                <span className={`ml-4 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              {openIdx === idx && (
                <div className="mt-3 text-[14px] leading-6 text-gray-600">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
