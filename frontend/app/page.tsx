'use client'

import CommitGraph from '@/components/CommitGraph'
import SubjectProgress from '@/components/SubjectProgress'
import LearningRecommendation from '@/components/LearningRecommendation'
import NavigationBar from '@/components/NavigationBar'

export default function HomePage() {
  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Navigation Bar */}
      <NavigationBar />

      <div className="h-full p-8">
        {/* Main 2x2 Grid */}
        <div className="grid grid-cols-2 gap-8 h-full">
          {/* Left Column */}
          <div className="flex flex-col gap-8 h-full">
            {/* Welcome Message */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 shadow-lg text-white" style={{ height: '160px' }}>
              <div className="flex items-center justify-between h-full">
                <div>
                  <h1 className="text-4xl font-bold mb-3">
                    안녕하세요, Taehee님! 👋
                  </h1>
                  <p className="text-xl opacity-90">
                    오늘도 커밋하러 가볼까요 살라살라
                  </p>
                </div>
                <div className="text-6xl opacity-20">
                  📚
                </div>
              </div>
            </div>

            {/* Commit Graph */}
            <div className="bg-gray-800 rounded-2xl p-8 shadow-lg flex-1 overflow-hidden">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-white mb-3">
                  📊 18 contributions in the last year
                </h2>
                <p className="text-gray-300">
                  commit의 정체성, 트리의 색깔이 초록색으로 변하는 정도에 따라 commit
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  0,1이 아니라 그라데이션으로 표시
                </p>
              </div>
              <div className="overflow-x-auto">
                <CommitGraph />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-8 h-full">
            {/* Subject Progress */}
            <div className="bg-white rounded-2xl p-8 shadow-lg flex-1 overflow-hidden">
              <SubjectProgress />
            </div>

            {/* Learning Recommendation */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl shadow-lg" style={{ minHeight: '160px' }}>
              <LearningRecommendation />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}