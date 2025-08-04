'use client'

export default function StudyGuideSkeleton() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          {/* Status Summary Skeleton */}
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Title skeleton */}
          <div className="h-6 w-48 bg-gray-200 rounded mb-4 animate-pulse"></div>
          
          {/* Paragraph skeletons */}
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Section break */}
          <div className="my-6"></div>

          {/* Subtitle skeleton */}
          <div className="h-5 w-36 bg-gray-200 rounded mb-3 animate-pulse"></div>
          
          {/* More paragraph skeletons */}
          <div className="space-y-3">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-11/12 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Another section */}
          <div className="my-6"></div>

          <div className="h-5 w-40 bg-gray-200 rounded mb-3 animate-pulse"></div>
          
          <div className="space-y-3">
            <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-3/5 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Regenerate Button Skeleton */}
        <div className="mt-6 text-center">
          <div className="h-10 w-32 bg-gray-200 rounded-lg mx-auto animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}