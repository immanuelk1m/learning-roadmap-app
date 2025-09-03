export default function UpgradePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900">플랜 업그레이드</h1>
      <p className="mt-2 text-gray-600">임시 페이지입니다. 곧 더 풍부한 요금제 비교와 결제 연동이 제공됩니다.</p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-1 text-sm text-gray-500">기본 기능</p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>과목 관리</li>
            <li>문서 업로드</li>
            <li>기본 퀴즈</li>
          </ul>
          <button className="mt-6 w-full py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50">현재 플랜</button>
        </section>
        <section className="border border-gray-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold">Plus</h2>
          <p className="mt-1 text-sm text-gray-500">고급 기능</p>
          <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li>스마트 퀴즈 생성</li>
            <li>학습 가이드 고급 기능</li>
            <li>우선 지원</li>
          </ul>
          <button className="mt-6 w-full py-2 rounded-md bg-black text-white hover:bg-gray-900">업그레이드</button>
        </section>
      </div>
    </main>
  )
}

