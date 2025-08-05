'use client'

import Link from 'next/link'
import { BookOpen, Calendar, ArrowRight, Folder, FileText } from 'lucide-react'
import DeleteSubjectButton from './DeleteSubjectButton'

interface Subject {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
}

interface SubjectListProps {
  subjects: Subject[]
  onSubjectDeleted?: () => void
}

export default function SubjectList({ subjects, onSubjectDeleted }: SubjectListProps) {
  const getColorAccent = (color: string) => {
    // Create a unique accent color based on the subject
    const colors = [
      { bg: 'var(--color-primary-100)', border: 'var(--color-primary-300)', icon: 'var(--color-primary-600)' },
      { bg: 'var(--color-success)', border: 'var(--color-success)', icon: 'var(--color-neutral-0)' },
      { bg: 'var(--color-warning)', border: 'var(--color-warning)', icon: 'var(--color-neutral-0)' },
      { bg: 'var(--color-info)', border: 'var(--color-info)', icon: 'var(--color-neutral-0)' },
      { bg: 'var(--color-neutral-200)', border: 'var(--color-neutral-400)', icon: 'var(--color-neutral-700)' },
      { bg: 'var(--color-error)', border: 'var(--color-error)', icon: 'var(--color-neutral-0)' },
    ]
    
    const index = Math.abs(color.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length
    return colors[index]
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: 'var(--spacing-8)',
      marginTop: 'var(--spacing-6)'
    }}>
      {subjects.map((subject, index) => {
        const colorAccent = getColorAccent(subject.color)
        return (
          <Link
            key={subject.id}
            href={`/subjects/${subject.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div 
              className="card-modern"
              style={{
                background: 'var(--color-neutral-0)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                transition: 'all 300ms ease',
                border: '1px solid var(--color-neutral-200)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06)'
                e.currentTarget.style.borderColor = 'var(--color-neutral-300)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)'
                e.currentTarget.style.borderColor = 'var(--color-neutral-200)'
              }}
            >
              {/* Album Cover Style Top Section */}
              <div style={{
                height: '180px',
                background: colorAccent.bg,
                borderBottom: `3px solid ${colorAccent.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Background Pattern */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.1,
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${colorAccent.border} 10px, ${colorAccent.border} 20px)`
                }} />
                
                {/* Subject Icon */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-2xl)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <Folder style={{ width: '40px', height: '40px', color: colorAccent.icon }} />
                </div>

                {/* Delete Button - positioned absolutely */}
                <div style={{
                  position: 'absolute',
                  top: 'var(--spacing-3)',
                  right: 'var(--spacing-3)',
                  zIndex: 2
                }}>
                  <DeleteSubjectButton 
                    subjectId={subject.id} 
                    subjectName={subject.name}
                    onDelete={onSubjectDeleted}
                  />
                </div>
              </div>

              {/* Content Section */}
              <div style={{
                flex: 1,
                padding: 'var(--spacing-6)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 className="text-heading-4" style={{ 
                  color: 'var(--color-neutral-900)',
                  marginBottom: 'var(--spacing-3)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {subject.name}
                </h3>
                
                {subject.description && (
                  <p className="text-body-sm line-clamp-3" style={{ 
                    color: 'var(--color-neutral-600)',
                    marginBottom: 'var(--spacing-4)',
                    flex: 1
                  }}>
                    {subject.description}
                  </p>
                )}

                {/* Footer Info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 'auto',
                  paddingTop: 'var(--spacing-4)',
                  borderTop: '1px solid var(--color-neutral-200)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    color: 'var(--color-neutral-500)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    <Calendar style={{ width: '14px', height: '14px' }} />
                    <span>{new Date(subject.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    color: 'var(--color-primary-500)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}>
                    <FileText style={{ width: '14px', height: '14px' }} />
                    <span>학습 시작</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}