'use client'

export default function DocumentItemSkeleton() {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          {/* Icon skeleton */}
          <div className="h-10 w-10 bg-gray-200 rounded-lg mr-4 animate-pulse" />
          
          <div className="flex-1">
            {/* Title skeleton */}
            <div className="h-5 w-48 bg-gray-200 rounded mb-2 animate-pulse" />
            
            <div className="flex items-center gap-3">
              {/* Date skeleton */}
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              
              {/* Status badge skeleton */}
              <div className="h-5 w-16 bg-blue-100 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Button skeleton */}
          <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse" />
          
          {/* Delete button skeleton */}
          <div className="h-9 w-9 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}