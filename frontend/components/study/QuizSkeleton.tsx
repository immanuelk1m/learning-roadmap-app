export default function QuizSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4">
      {/* Quiz Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded mb-2 animate-pulse"></div>
        <div className="h-5 w-64 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Progress Bar Skeleton */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2"></div>
      </div>

      {/* Question Card Skeleton */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <div className="h-5 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-5/6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-5 w-4/6 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Answer Options Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={`option-${i}`}
              className="p-4 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="h-5 w-full bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button Skeleton */}
        <div className="mt-6">
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </div>

      {/* Score Summary Skeleton */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}