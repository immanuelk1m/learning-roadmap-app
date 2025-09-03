import AlbumAssessmentSkeleton from '@/components/study/AlbumAssessmentSkeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4 text-center">
          <p className="text-sm text-slate-600">페이지를 불러오는 중...</p>
        </div>
        <AlbumAssessmentSkeleton />
      </div>
    </div>
  )
}
