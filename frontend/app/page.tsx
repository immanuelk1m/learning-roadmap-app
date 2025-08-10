'use client'

import { useState } from 'react'
import CommitGraph from '@/components/CommitGraph'
import SubjectProgress from '@/components/SubjectProgress'
import LearningRecommendation from '@/components/LearningRecommendation'
import RecentDocuments from '@/components/RecentDocuments'
import NavigationBar from '@/components/NavigationBar'

export default function HomePage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSubjectCreated = () => {
    setRefreshKey(prev => prev + 1)
  }
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-neutral-50)' }}>
      {/* Navigation Bar */}
      <NavigationBar />

      {/* Main Content */}
      <div className="container" style={{ paddingTop: 'calc(64px + var(--spacing-8))', paddingBottom: 'var(--spacing-16)' }}>
        {/* Top Section - Learning Recommendation (Full Width) */}
        <div style={{ marginBottom: 'var(--spacing-8)' }}>
          <LearningRecommendation />
        </div>

        {/* Bottom Section - Two Columns */}
        <div className="grid-12" style={{ alignItems: 'stretch' }}>
          {/* Left Column - Recent Documents (4 columns) */}
          <div className="col-span-12 lg:col-span-4" style={{ display: 'flex' }}>
            <div style={{ width: '100%', display: 'flex' }}>
              <RecentDocuments />
            </div>
          </div>

          {/* Right Column - Subject List + Activity Record (8 columns) */}
          <div className="col-span-12 lg:col-span-8" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Subject List Section */}
            <div style={{ marginBottom: 'var(--spacing-8)' }}>
              <div className="surface-primary" style={{ padding: 'var(--spacing-8)' }}>
                <SubjectProgress refreshKey={refreshKey} onSubjectCreated={handleSubjectCreated} />
              </div>
            </div>

            {/* Learning Activity Record */}
            <div style={{ flex: 1 }}>
              <div className="surface-primary" style={{ padding: '0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Header with padding */}
                <div style={{ padding: 'var(--spacing-8) var(--spacing-8) var(--spacing-6) var(--spacing-8)' }}>
                  <div>
                    <h2 className="text-heading-3" style={{ color: 'var(--color-neutral-900)', marginBottom: 'var(--spacing-2)' }}>
                      학습 활동 기록
                    </h2>
                    <p className="text-body-sm" style={{ color: 'var(--color-neutral-600)' }}>
                      최근 2년간의 학습 활동을 한눈에 확인하세요
                    </p>
                  </div>
                </div>
                
                {/* Commit Graph with no padding */}
                <div style={{ flex: 1, paddingLeft: 'var(--spacing-8)', paddingRight: 'var(--spacing-8)', paddingBottom: 'var(--spacing-8)' }}>
                  <CommitGraph />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}