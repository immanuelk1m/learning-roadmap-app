'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CreateSubjectButton from './subjects/CreateSubjectButton'

interface Subject {
  id: string
  name: string
  description?: string
  color?: string
  created_at: string
  fileCount: number
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
    const fetchSubjects = async () => {
      try {
        // Fetch subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select(`
            id,
            name,
            description,
            color,
            created_at
          `)
          .eq('user_id', FIXED_USER_ID)
          .order('created_at', { ascending: false })

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
        const subjectsWithCounts = await Promise.all(
          subjectsData.map(async (subject) => {
            const { data: documents, error: docsError } = await supabase
              .from('documents')
              .select('id')
              .eq('subject_id', subject.id)

            if (docsError) {
              console.error('Error fetching documents:', docsError)
              return null
            }

            const fileCount = documents?.length || 0

            return {
              id: subject.id,
              name: subject.name,
              description: subject.description,
              color: subject.color,
              created_at: subject.created_at,
              fileCount
            }
          })
        )

        // Filter out any null results
        const validSubjects = subjectsWithCounts.filter(s => s !== null) as Subject[]
        
        setSubjects(validSubjects)
      } catch (error) {
        console.error('Error in fetchSubjects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [refreshKey])

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
            과목 목록
          </h2>
          <p className="text-body-sm" style={{ color: 'var(--color-neutral-600)' }}>
            등록된 과목을 확인하세요
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
            {subjects.map((subject) => (
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
                    background: 'var(--color-neutral-0)',
                    border: '1px solid var(--color-neutral-200)',
                    transition: 'all 200ms ease'
                  }}
                >
                  {/* Color Indicator */}
                  <div style={{ 
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    background: subject.color || 'var(--color-primary-500)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-neutral-0)' }}>
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Subject Info */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'var(--color-neutral-900)',
                      marginBottom: 'var(--spacing-1)'
                    }}>
                      {subject.name}
                    </h3>
                    
                    {subject.description && (
                      <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-neutral-600)',
                        marginBottom: 'var(--spacing-2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {subject.description}
                      </p>
                    )}
                    
                    {/* Meta Info */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: 'var(--spacing-4)',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-neutral-500)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-neutral-400)' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>{subject.fileCount}개 문서</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-neutral-400)' }}>
                          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>{new Date(subject.created_at).toLocaleDateString('ko-KR')}</span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}