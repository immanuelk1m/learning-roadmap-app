'use client'

import Link from 'next/link'
import CreateSubjectButton from './subjects/CreateSubjectButton'

interface Subject {
  id: string
  name: string
  progress: number
  fileCount: number
  daysUntilExam: number
}

// Mock data
const mockSubjects: Subject[] = [
  {
    id: '1',
    name: 'Design Research 1',
    progress: 60,
    fileCount: 44,
    daysUntilExam: 30,
  },
  {
    id: '2',
    name: 'Design Research 2',
    progress: 90,
    fileCount: 32,
    daysUntilExam: 45,
  },
  {
    id: '3',
    name: 'SID Chapter',
    progress: 25,
    fileCount: 12,
    daysUntilExam: 20,
  },
  {
    id: '4',
    name: 'Data Structure',
    progress: 97,
    fileCount: 58,
    daysUntilExam: 15,
  }
]

export default function SubjectProgress() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-6)'
      }}>
        <h2 className="text-heading-3" style={{ color: 'var(--color-neutral-900)' }}>
          과목별 진행률
        </h2>
        <CreateSubjectButton />
      </div>

      {/* Subject List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        marginRight: '-8px',
        paddingRight: '8px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          {mockSubjects.map((subject) => (
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
                  gap: 'var(--spacing-4)'
                }}
              >
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
                      stroke={
                        subject.progress >= 80 
                          ? 'var(--color-success)' 
                          : subject.progress >= 50 
                          ? 'var(--color-info)' 
                          : 'var(--color-error)'
                      }
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
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-neutral-900)'
                    }}>
                      {subject.progress}%
                    </span>
                  </div>
                </div>

                {/* Subject Info */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-neutral-900)',
                    marginBottom: 'var(--spacing-1)'
                  }}>
                    {subject.name}
                  </h3>
                  <div style={{ 
                    display: 'flex', 
                    gap: 'var(--spacing-4)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-neutral-600)'
                  }}>
                    <span>{subject.fileCount}개 파일</span>
                    <span>D-{subject.daysUntilExam}</span>
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
          ))}
        </div>
      </div>
    </div>
  )
}