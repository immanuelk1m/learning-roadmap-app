export default function OXQuizFeedbackSkeleton() {
  return (
    <div className="space-y-4">
      {/* Feedback Box Skeleton */}
      <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* Skipped Nodes Warning Skeleton (optional) */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="h-4 w-64 bg-gray-200 rounded mb-2 animate-pulse"></div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Next Button Skeleton */}
      <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse"></div>
    </div>
  )
}