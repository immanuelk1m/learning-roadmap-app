'use client'

import CommitGraph from '@/components/CommitGraph'
import SubjectProgress from '@/components/SubjectProgress'
import LearningRecommendation from '@/components/LearningRecommendation'
import NavigationBar from '@/components/NavigationBar'

export default function HomePage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-neutral-50)' }}>
      {/* Navigation Bar */}
      <NavigationBar />

      {/* Main Content */}
      <div className="container" style={{ paddingTop: 'calc(64px + var(--spacing-16))', paddingBottom: 'var(--spacing-16)' }}>
        <div className="grid-12">
          {/* Welcome Section - Spans 12 columns */}
          <div className="col-span-12" style={{ marginBottom: 'var(--spacing-10)' }}>
            <div className="surface-primary" style={{ padding: 'var(--spacing-10)' }}>
              <h1 className="text-heading-1" style={{ color: 'var(--color-neutral-900)', marginBottom: 'var(--spacing-3)' }}>
                안녕하세요, Taehee님
              </h1>
              <p className="text-body-lg" style={{ color: 'var(--color-neutral-600)' }}>
                오늘도 학습을 시작해볼까요?
              </p>
            </div>
          </div>

          {/* Left Section - Spans 7 columns */}
          <div className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>
            {/* Commit Graph */}
            <div className="surface-primary" style={{ padding: 'var(--spacing-8)', flex: '1' }}>
              <h2 className="text-heading-3" style={{ color: 'var(--color-neutral-900)', marginBottom: 'var(--spacing-6)' }}>
                학습 활동 기록
              </h2>
              <p className="text-body-sm" style={{ color: 'var(--color-neutral-600)', marginBottom: 'var(--spacing-2)' }}>
                최근 1년간의 학습 활동을 한눈에 확인하세요
              </p>
              <div style={{ marginTop: 'var(--spacing-6)' }}>
                <CommitGraph />
              </div>
            </div>

            {/* Learning Recommendation */}
            <div className="surface-secondary" style={{ padding: 'var(--spacing-8)' }}>
              <LearningRecommendation />
            </div>
          </div>

          {/* Right Section - Spans 5 columns */}
          <div className="col-span-5">
            <div className="surface-primary" style={{ padding: 'var(--spacing-8)', height: '100%' }}>
              <SubjectProgress />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}