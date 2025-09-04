export default async function UpgradeSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = (await searchParams) ?? {}
  const checkoutId = (sp.checkout_id as string) || ''
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-center">
      <h1 className="text-3xl font-bold text-gray-900">결제가 완료되었습니다 🎉</h1>
      <p className="mt-3 text-gray-600">프로 구독이 활성화 처리 중입니다. 잠시 후 새로고침하면 반영됩니다.</p>
      {checkoutId && (
        <p className="mt-2 text-sm text-gray-500">Checkout ID: {checkoutId}</p>
      )}
      <div className="mt-8">
        <a href="/" className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white hover:bg-gray-900">홈으로 가기</a>
      </div>
    </main>
  )
}
