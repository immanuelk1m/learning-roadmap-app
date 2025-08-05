'use client'

import Link from 'next/link'

// Mock subjects data to find the most urgent one
const mockSubjects = [
  { id: '1', name: 'Design Research 1', progress: 60, daysUntilExam: 30 },
  { id: '2', name: 'Design Research 2', progress: 90, daysUntilExam: 45 },
  { id: '3', name: 'SID Chapter', progress: 25, daysUntilExam: 20 },
  { id: '4', name: 'Data Structure', progress: 97, daysUntilExam: 15 }
]

export default function LearningRecommendation() {
  // Find the most urgent subject (combination of low progress and approaching deadline)
  const getUrgencyScore = (subject: typeof mockSubjects[0]) => {
    const progressWeight = (100 - subject.progress) * 0.7 // Lower progress = higher urgency
    const deadlineWeight = (60 - subject.daysUntilExam) * 0.3 // Closer deadline = higher urgency
    return progressWeight + deadlineWeight
  }

  const mostUrgentSubject = mockSubjects.reduce((prev, current) => 
    getUrgencyScore(current) > getUrgencyScore(prev) ? current : prev
  )

  const getUrgencyLevel = () => {
    if (mostUrgentSubject.daysUntilExam <= 20 && mostUrgentSubject.progress < 50) {
      return { level: 'critical', color: 'var(--color-error)', bgColor: 'rgba(239, 68, 68, 0.1)' }
    } else if (mostUrgentSubject.progress < 50) {
      return { level: 'high', color: 'var(--color-warning)', bgColor: 'rgba(245, 158, 11, 0.1)' }
    }
    return { level: 'normal', color: 'var(--color-info)', bgColor: 'rgba(59, 130, 246, 0.1)' }
  }

  const urgency = getUrgencyLevel()

  return (
    <div 
      className="surface-elevated"
      style={{ 
        padding: 'var(--spacing-8)',
        background: `linear-gradient(135deg, ${urgency.bgColor}, var(--color-neutral-0))`,
        border: `1px solid ${urgency.color}20`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-5)' }}>
        {/* Urgency Indicator */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: urgency.color,
          opacity: '0.15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative'
        }}>
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none"
            style={{ 
              position: 'absolute',
              color: urgency.color
            }}
          >
            <path 
              d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Header with personalized greeting */}
          <div style={{ marginBottom: 'var(--spacing-4)' }}>
            <h2 className="text-heading-3" style={{ 
              color: 'var(--color-neutral-900)',
              marginBottom: 'var(--spacing-1)'
            }}>
              안녕하세요, Taehee님! 👋
            </h2>
            <p className="text-body" style={{ 
              color: 'var(--color-neutral-700)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              {mostUrgentSubject.name} 학습을 이어가보는 건 어떠세요?
            </p>
          </div>

          {/* Urgency Details */}
          <div style={{ 
            display: 'flex', 
            gap: 'var(--spacing-6)',
            marginBottom: 'var(--spacing-5)',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: urgency.color
              }}></div>
              <span style={{ 
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-neutral-600)'
              }}>
                진행률 {mostUrgentSubject.progress}%
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-neutral-500)' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span style={{ 
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-neutral-600)'
              }}>
                마감까지 {mostUrgentSubject.daysUntilExam}일
              </span>
            </div>
          </div>

          {/* Call to Action */}
          <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
            <Link
              href={`/subjects/${mostUrgentSubject.id}`}
              style={{ textDecoration: 'none' }}
            >
              <button 
                className="btn-base btn-primary"
                style={{
                  padding: 'var(--spacing-3) var(--spacing-6)',
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 'var(--font-weight-semibold)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)'
                }}
              >
                지금 바로 학습하기
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </Link>
            <span style={{ 
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-neutral-500)'
            }}>
              {urgency.level === 'critical' ? '긴급한 학습이 필요합니다' : 
               urgency.level === 'high' ? '집중 학습을 권장합니다' : 
               '꾸준한 학습을 이어가세요'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}