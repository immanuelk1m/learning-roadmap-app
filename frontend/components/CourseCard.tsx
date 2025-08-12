'use client'

interface CourseCardProps {
  title: string
  progress: number
  commits: number
  completed: boolean
}

export default function CourseCard({ title, progress, commits, completed }: CourseCardProps) {
  return (
    <div style={{
      width: '280px',
      height: '160px',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      {/* Title */}
      <div>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '8px'
        }}>
          {title}
        </h3>
      </div>

      {/* Progress Section */}
      <div>
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#E5E7EB',
          borderRadius: '4px',
          marginBottom: '12px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#3B82F6',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            {/* Commits */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2v20M17 7l-5-5-5 5" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: '14px', color: '#6B7280' }}>{commits}</span>
            </div>

            {/* Progress Percentage */}
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '600',
              color: progress === 100 ? '#10B981' : '#3B82F6'
            }}>
              {progress}%
            </span>
          </div>

          {/* Completion Badge */}
          {completed && (
            <div style={{
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              완료
            </div>
          )}
        </div>
      </div>
    </div>
  )
}