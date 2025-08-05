'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CreateSubjectButton from './subjects/CreateSubjectButton'

interface Subject {
  id: string
  name: string
  progress: number
  fileCount: number
  completedFiles: number
  color?: string
}

interface SubjectProgressProps {
  refreshKey?: number
  onSubjectCreated?: () => void
}

export default function SubjectProgress({ refreshKey, onSubjectCreated }: SubjectProgressProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
  // Fixed user ID (same as in subject detail page)
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  useEffect(() => {
    const fetchSubjectsWithProgress = async () => {
      try {
        // Fetch subjects with document counts
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select(`
            id,
            name,
            color,
            exam_date
          `)
          .eq('user_id', FIXED_USER_ID)

        if (subjectsError) {
          console.error('Error fetching subjects:', subjectsError)
          return
        }

        if (!subjectsData || subjectsData.length === 0) {
          setSubjects([])
          setLoading(false)
          return
        }

        // Fetch document counts for each subject
        const subjectsWithProgress = await Promise.all(
          subjectsData.map(async (subject) => {
            const { data: documents, error: docsError } = await supabase
              .from('documents')
              .select('status')
              .eq('subject_id', subject.id)

            if (docsError) {
              console.error('Error fetching documents:', docsError)
              return null
            }

            const fileCount = documents?.length || 0
            const completedFiles = documents?.filter(doc => doc.status === 'completed').length || 0
            const progress = fileCount > 0 ? Math.round((completedFiles / fileCount) * 100) : 0

            return {
              id: subject.id,
              name: subject.name,
              color: subject.color,
              progress,
              fileCount,
              completedFiles
            }
          })
        )

        // Filter out any null results and sort by urgency
        const validSubjects = subjectsWithProgress.filter(s => s !== null) as Subject[]
        
        // Sort subjects by progress (lower progress = higher urgency)
        const sortedSubjects = validSubjects.sort((a, b) => {
          return a.progress - b.progress
        })

        setSubjects(sortedSubjects)
      } catch (error) {
        console.error('Error in fetchSubjectsWithProgress:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubjectsWithProgress()
  }, [refreshKey])
  const getSubjectStatus = (subject: Subject) => {
    if (subject.progress >= 95) {
      return { 
        status: 'completed', 
        color: 'var(--color-success)', 
        bgColor: 'rgba(16, 185, 129, 0.1)',
        icon: '✅',
        tag: '완료 임박'
      }
    } else if (subject.progress < 30) {
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
            className="btn-base btn-secondary"
            style={{ 
              padding: 'var(--spacing-2) var(--spacing-4)',
              fontSize: 'var(--font-size-sm)',
              textDecoration: 'none'
            }}
          >
            전체 과목 보기
          </Link>
          <CreateSubjectButton onSubjectCreated={onSubjectCreated} />
        </div>
      </div>

      {/* Subject List */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        marginRight: '-8px',
        paddingRight: '8px'
      }}>
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
            color: 'var(--color-neutral-500)'
          }}>
            <span>로딩 중...</span>
          </div>
        ) : subjects.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-8)',
            color: 'var(--color-neutral-500)'
          }}>
            <p style={{ marginBottom: 'var(--spacing-4)' }}>아직 등록된 과목이 없습니다.</p>
            <CreateSubjectButton onSubjectCreated={onSubjectCreated} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            {subjects.map((subject) => {
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
        )}
      </div>
    </div>
  )
}