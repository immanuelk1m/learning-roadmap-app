export default function PDFViewerSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      {/* PDF Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      
      {/* PDF Content Area */}
      <div className="flex-1 p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8 space-y-4">
          {/* Page Content Skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse mt-4"></div>
            <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          
          {/* Image/Chart Placeholder */}
          <div className="h-48 w-full bg-gray-200 rounded animate-pulse mt-6"></div>
          
          {/* More text */}
          <div className="space-y-3 mt-6">
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
      
      {/* PDF Footer/Page Navigation */}
      <div className="p-4 border-t flex items-center justify-center gap-4">
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
        <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </div>
  )
}