'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavigationBar() {
  const pathname = usePathname()

  return (
    <nav 
      className="fixed top-0 left-0 right-0" 
      style={{ 
        backgroundColor: 'var(--color-neutral-0)',
        borderBottom: '1px solid var(--color-neutral-200)',
        zIndex: 'var(--z-50)',
        width: '100vw'
      }}
    >
      <div className="container" style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '64px',
        overflow: 'hidden'
      }}>
        {/* Logo/Brand with greeting */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-4)',
          flexShrink: 1,
          minWidth: 0
        }}>
          <div style={{ 
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-neutral-900)'
          }}>
            Commit
          </div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-neutral-600)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)'
          }}>
            <span>|</span>
            <span>환영합니다, Taehee님</span>
          </div>
        </div>

        {/* Simplified Navigation */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-4)',
          flexShrink: 0
        }}>
          {/* Breadcrumb */}
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-neutral-500)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)'
          }}>
            <Link 
              href="/" 
              style={{ 
                color: pathname === '/' ? 'var(--color-primary-500)' : 'var(--color-neutral-500)',
                textDecoration: 'none',
                fontWeight: pathname === '/' ? 'var(--font-weight-medium)' : 'var(--font-weight-regular)'
              }}
            >
              대시보드
            </Link>
            {pathname !== '/' && (
              <>
                <span>/</span>
                <span style={{ color: 'var(--color-neutral-700)', fontWeight: 'var(--font-weight-medium)' }}>
                  {pathname === '/subjects' ? '과목 목록' : '과목 상세'}
                </span>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
            {pathname !== '/subjects' && (
              <Link
                href="/subjects"
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  textDecoration: 'none',
                  color: 'var(--color-neutral-600)',
                  border: '1px solid var(--color-neutral-300)',
                  backgroundColor: 'var(--color-neutral-0)',
                  transition: 'all 150ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-50)'
                  e.currentTarget.style.borderColor = 'var(--color-neutral-400)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-neutral-0)'
                  e.currentTarget.style.borderColor = 'var(--color-neutral-300)'
                }}
              >
                과목 관리
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}