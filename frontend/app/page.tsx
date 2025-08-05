'use client'

import { useState } from 'react'
import CommitGraph from '@/components/CommitGraph'
import SubjectProgress from '@/components/SubjectProgress'
import LearningRecommendation from '@/components/LearningRecommendation'
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
        <div className="grid-12">
          {/* Priority Action - Learning Recommendation (Spans 12 columns) */}
          <div className="col-span-12" style={{ marginBottom: 'var(--spacing-8)' }}>
            <LearningRecommendation />
          </div>

          {/* Subject Progress Section (Spans 12 columns) */}
          <div className="col-span-12" style={{ marginBottom: 'var(--spacing-8)' }}>
            <div className="surface-primary" style={{ padding: 'var(--spacing-8)' }}>
              <SubjectProgress refreshKey={refreshKey} onSubjectCreated={handleSubjectCreated} />
            </div>
          </div>

          {/* Learning Activity Record (Spans 12 columns) */}
          <div className="col-span-12">
            <div className="surface-primary" style={{ padding: '0', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              {/* Header with padding */}
              <div style={{ padding: 'var(--spacing-8) var(--spacing-8) var(--spacing-6) var(--spacing-8)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 className="text-heading-3" style={{ color: 'var(--color-neutral-900)', marginBottom: 'var(--spacing-2)' }}>
                      학습 활동 기록
                    </h2>
                    <p className="text-body-sm" style={{ color: 'var(--color-neutral-600)' }}>
                      최근 2년간의 학습 활동을 한눈에 확인하세요
                    </p>
                  </div>
                  {/* Period Filter */}
                  <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>기간:</span>
                    <select 
                      style={{
                        padding: 'var(--spacing-1) var(--spacing-2)',
                        border: '1px solid var(--color-neutral-300)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        backgroundColor: 'var(--color-neutral-0)',
                        color: 'var(--color-neutral-700)'
                      }}
                      defaultValue="6months"
                    >
                      <option value="1month">1개월</option>
                      <option value="3months">3개월</option>
                      <option value="6months">6개월</option>
                      <option value="1year">1년</option>
                    </select>
                  </div>
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
  )
}