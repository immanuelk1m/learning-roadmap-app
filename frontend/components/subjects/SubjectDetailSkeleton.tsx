export default function SubjectDetailSkeleton() {
  return (
    <div className="bg-[#f8f8f8] w-full min-h-screen">
      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto">
        <div className="pt-[20px] px-[42px]">
          {/* Back Navigation Skeleton */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          
          {/* Subject Header Card Skeleton */}
          <div className="bg-white rounded-[5px] shadow-lg p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Subject Icon Skeleton */}
                <div className="w-16 h-16 rounded-[10px] bg-gray-200 animate-pulse"></div>
                
                <div>
                  {/* Subject Name */}
                  <div className="h-5 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  {/* Description */}
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                  
                  {/* Stats Skeleton */}
                  <div className="flex gap-4 mt-3">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              {/* Upload Button Skeleton */}
              <div className="flex items-center">
                <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
            
            {/* Progress Bar Skeleton */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden animate-pulse"></div>
            </div>
          </div>

          {/* Main Content Tabs Skeleton */}
          <div className="bg-white rounded-[5px] shadow-lg overflow-hidden">
            {/* Tab Header Skeleton */}
            <div className="border-b border-gray-200 bg-white">
              <div className="flex">
                {/* First Tab */}
                <div className="relative px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-200 animate-pulse"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
                
                {/* Second Tab */}
                <div className="relative px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gray-200 animate-pulse"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Document List Skeleton */}
            <div className="p-6">
              {[1, 2, 3].map((i) => (
                <div key={`doc-skeleton-${i}`} className="mb-4 last:mb-0">
                  <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Document Title */}
                        <div className="h-5 w-64 bg-gray-200 rounded mb-3 animate-pulse"></div>
                        
                        {/* Document Info */}
                        <div className="flex items-center gap-4">
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-9 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}