export default function OXQuizSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar Skeleton */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2"></div>
      </div>

      {/* Quiz Card Skeleton */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <div className="text-center mb-8">
          {/* Quiz Number Circle */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4 animate-pulse"></div>
          
          {/* Node Name */}
          <div className="h-6 w-48 bg-gray-200 rounded mx-auto mb-2 animate-pulse"></div>
          
          {/* Node Description */}
          <div className="space-y-2 mb-6">
            <div className="h-4 w-64 bg-gray-200 rounded mx-auto animate-pulse"></div>
            <div className="h-4 w-56 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
          
          {/* Quiz Question Box */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="space-y-2">
              <div className="h-5 w-full bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-5/6 bg-gray-200 rounded mx-auto animate-pulse"></div>
            </div>
          </div>

          {/* Answer Buttons */}
          <div className="flex gap-4">
            <div className="flex-1 h-14 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="flex-1 h-14 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Current Status Skeleton */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="h-4 w-32 bg-gray-200 rounded mb-3 animate-pulse"></div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}