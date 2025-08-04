'use client'

export default function LearningRecommendation() {
  // Mock recommendation based on lowest progress subject
  const recommendation = "Design Research 수업에서 페르소나 생성 및 인사이트 도출 과정의 방법론 추가 학습 필요."

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-4)' }}>
      {/* Icon Container */}
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--color-warning)',
        opacity: '0.1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative'
      }}>
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          style={{ 
            position: 'absolute',
            color: 'var(--color-warning)'
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
        <h3 className="text-heading-4" style={{ 
          color: 'var(--color-neutral-900)',
          marginBottom: 'var(--spacing-2)'
        }}>
          학습 추천
        </h3>
        <p className="text-body" style={{ 
          color: 'var(--color-neutral-700)',
          marginBottom: 'var(--spacing-3)'
        }}>
          {recommendation}
        </p>
        <p className="text-caption" style={{ 
          color: 'var(--color-neutral-500)'
        }}>
          가장 진행률이 낮은 과목 기준
        </p>
      </div>
    </div>
  )
}