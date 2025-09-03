'use client'

export default function AlbumAssessmentSkeleton() {
  const placeholders = Array.from({ length: 12 })
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="h-7 w-72 bg-gray-200 rounded mx-auto mb-3 animate-pulse" />
        <div className="h-5 w-96 max-w-[80%] bg-gray-200 rounded mx-auto animate-pulse" />
      </div>

      {/* Album grid */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-4 justify-start px-2">
          {placeholders.map((_, i) => (
            <div key={i} className="w-56 h-36">
              <div className="relative bg-white rounded-xl border-3 border-gray-200 h-full overflow-hidden">
                <div className="p-3 h-full flex items-center justify-center">
                  <div className="w-40 h-6 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-end">
          <div className="h-10 w-56 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
