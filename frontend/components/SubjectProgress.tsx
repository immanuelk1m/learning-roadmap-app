'use client'

import Link from 'next/link'
import CreateSubjectButton from './subjects/CreateSubjectButton'

interface Subject {
  id: string
  name: string
  progress: number
  fileCount: number
  completedFiles: number
  daysUntilExam: number
}

// Mock data with completed files for clearer information
const mockSubjects: Subject[] = [
  {
    id: '3',
    name: 'SID Chapter',
    progress: 25,
    fileCount: 12,
    completedFiles: 3,
    daysUntilExam: 20,
  },
  {
    id: '4',
    name: 'Data Structure',
    progress: 97,
    fileCount: 58,
    completedFiles: 56,
    daysUntilExam: 15,
  },
  {
    id: '1',
    name: 'Design Research 1',
    progress: 60,
    fileCount: 44,
    completedFiles: 26,
    daysUntilExam: 30,
  },
  {
    id: '2',
    name: 'Design Research 2',
    progress: 90,
    fileCount: 32,
    completedFiles: 29,
    daysUntilExam: 45,
  }
]

// Sort subjects by urgency (low progress + approaching deadline)
const sortedSubjects = mockSubjects.sort((a, b) => {
  const getUrgencyScore = (subject: Subject) => {
    const progressWeight = (100 - subject.progress) * 0.7
    const deadlineWeight = (60 - subject.daysUntilExam) * 0.3
    return progressWeight + deadlineWeight
  }
  return getUrgencyScore(b) - getUrgencyScore(a)
})

export default function SubjectProgress() {
  const getSubjectStatus = (subject: Subject) => {
    if (subject.progress >= 95) {
      return { 
        status: 'completed', 
        color: 'var(--color-success)', 
        bgColor: 'rgba(16, 185, 129, 0.1)',
        icon: '✅',
        tag: '완료 임박'
      }
    } else if (subject.daysUntilExam <= 20 && subject.progress < 50) {
      return { 
        status: 'critical', 
        color: 'var(--color-error)', 
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: '🔥',
        tag: '긴급'
      }
    } else if (subject.progress < 50) {
      return { 
        status: 'attention', 
        color: 'var(--color-warning)', 
        bgColor: 'rgba(245, 158, 11, 0.1)',
        icon: '⚠️',
        tag: '집중 필요'
      }
    }
    return { 
      status: 'normal', 
      color: 'var(--color-primary-500)', 
      bgColor: 'rgba(40, 114, 245, 0.1)',
      icon: '📚',
      tag: '진행 중'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-6)'
      }}>
        <div>
          <h2 className="text-heading-3" style={{ 
            color: 'var(--color-neutral-900)',
            marginBottom: 'var(--spacing-1)'
          }}>
            과목별 진행률
          </h2>
          <p className="text-body-sm" style={{ color: 'var(--color-neutral-600)' }}>
            시급도 순으로 정렬되어 있습니다
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
          <Link 
            href="/subjects" 
            style={{ 
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-primary-500)',
              textDecoration: 'none',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            전체 과목 보기
          </Link>
          <CreateSubjectButton />
        </div>
      </div>

      {/* Subject List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        marginRight: '-8px',
        paddingRight: '8px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {sortedSubjects.map((subject) => {
            const status = getSubjectStatus(subject)
            return (
              <Link
                key={subject.id}
                href={`/subjects/${subject.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div 
                  className="card"
                  style={{ 
                    padding: 'var(--spacing-5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-4)',
                    background: status.status === 'critical' || status.status === 'attention' 
                      ? `linear-gradient(135deg, ${status.bgColor}, var(--color-neutral-0))` 
                      : 'var(--color-neutral-0)',
                    border: status.status === 'critical' || status.status === 'attention'
                      ? `1px solid ${status.color}30`
                      : '1px solid var(--color-neutral-200)'
                  }}
                >
                  {/* Status Tag */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: 'var(--spacing-1)',
                    minWidth: '60px'
                  }}>
                    <span style={{ fontSize: '24px' }}>{status.icon}</span>
                    <span style={{
                      fontSize: 'var(--font-size-xs)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: status.color,
                      textAlign: 'center'
                    }}>
                      {status.tag}
                    </span>
                  </div>

                  {/* Progress Circle */}
                  <div style={{ 
                    position: 'relative',
                    width: '64px',
                    height: '64px',
                    flexShrink: 0
                  }}>
                    <svg 
                      style={{ 
                        width: '100%', 
                        height: '100%',
                        transform: 'rotate(-90deg)'
                      }}
                    >
                      {/* Background Circle */}
                      <circle
                        cx="50%"
                        cy="50%"
                        r="28"
                        stroke="var(--color-neutral-200)"
                        strokeWidth="4"
                        fill="none"
                      />
                      {/* Progress Circle */}
                      <circle
                        cx="50%"
                        cy="50%"
                        r="28"
                        stroke={status.color}
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - subject.progress / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: 'all 700ms ease' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ 
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-neutral-900)'
                      }}>
                        {subject.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Subject Info */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-neutral-900)',
                      marginBottom: 'var(--spacing-2)'
                    }}>
                      {subject.name}
                    </h3>
                    
                    {/* Detailed Progress Info */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: 'var(--spacing-1)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-neutral-600)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-neutral-500)' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>총 {subject.fileCount}개 파일 중 {subject.completedFiles}개 완료</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-neutral-500)' }}>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>과제 마감까지 {subject.daysUntilExam}일</span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    style={{ 
                      color: 'var(--color-neutral-400)',
                      flexShrink: 0
                    }}
                  >
                    <path 
                      d="M9 18l6-6-6-6" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}