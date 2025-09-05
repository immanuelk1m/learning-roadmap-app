'use client'

export default function HomeSkeleton() {
  return (
    <main className="bg-[var(--color-background)] w-full min-h-full flex flex-col">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col flex-1">
        <div className="py-6 lg:py-8 flex-1 flex flex-col gap-8 min-h-0 lg:grid lg:grid-cols-[320px_1fr] lg:items-start">
          <div className="lg:w-auto lg:flex-none flex flex-col gap-4 min-h-0 h-full">
            <div className="bg-white border border-gray-200 h-[140px] rounded-[10px] p-5 shadow-sm animate-pulse">
              <div className="flex items-center gap-4 h-full">
                <div className="w-[72px] h-[72px] rounded-[8px] bg-gray-200" />
                <div className="flex-1">
                  <div className="w-16 h-3 bg-gray-200 rounded mb-2" />
                  <div className="w-40 h-4 bg-gray-200 rounded mb-2" />
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                </div>
              </div>
            </div>

            <div className="flex-[2.7] min-h-0 flex flex-col">
              <div className="bg-white border border-gray-200 rounded-[10px] px-5 py-5 flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden shadow-sm">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                  <div className="w-28 h-4 bg-gray-200 rounded" />
                  <div className="flex gap-3">
                    <div className="w-16 h-4 bg-gray-200 rounded" />
                    <div className="w-12 h-4 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3 overflow-y-auto flex-1 pr-2 min-h-0 animate-pulse">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 mb-3">
                      <div className="flex-1 bg-[var(--color-primary-dark)]/70 rounded-[10px] h-[60px] flex items-center px-4 relative">
                        <div className="flex-1">
                          <div className="w-40 h-3 bg-white/50 rounded mb-2" />
                          <div className="w-24 h-2 bg-white/30 rounded" />
                        </div>
                        <div className="w-[45px] h-[45px] rounded-full bg-white/30" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-6 min-w-0 min-h-0">
            <div className="flex-[1.7] min-h-[300px] bg-white border border-gray-200 rounded-[10px] shadow-sm p-5 animate-pulse">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[135px] gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-full h-[135px] rounded-[12px] bg-gray-200" />
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-[200px] bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm animate-pulse">
              <div className="mb-4 flex justify-between items-center">
                <div className="w-24 h-4 bg-gray-200 rounded" />
                <div className="w-14 h-6 bg-gray-200 rounded" />
              </div>
              <div className="h-[180px] bg-gray-100 rounded border border-gray-100" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}


