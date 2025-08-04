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
        zIndex: 'var(--z-50)'
      }}
    >
      <div className="container" style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '64px'
      }}>
        {/* Logo/Brand */}
        <div style={{ 
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-neutral-900)'
        }}>
          StudyHub
        </div>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
          <Link
            href="/"
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              textDecoration: 'none',
              transition: 'all 150ms ease',
              backgroundColor: pathname === '/' ? 'var(--color-primary-500)' : 'transparent',
              color: pathname === '/' ? 'var(--color-neutral-0)' : 'var(--color-neutral-700)',
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/') {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)'
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/') {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            홈
          </Link>
          <Link
            href="/subjects"
            style={{
              padding: 'var(--spacing-2) var(--spacing-4)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              textDecoration: 'none',
              transition: 'all 150ms ease',
              backgroundColor: pathname === '/subjects' ? 'var(--color-primary-500)' : 'transparent',
              color: pathname === '/subjects' ? 'var(--color-neutral-0)' : 'var(--color-neutral-700)',
            }}
            onMouseEnter={(e) => {
              if (pathname !== '/subjects') {
                e.currentTarget.style.backgroundColor = 'var(--color-neutral-100)'
              }
            }}
            onMouseLeave={(e) => {
              if (pathname !== '/subjects') {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            과목 목록
          </Link>
        </div>
      </div>
    </nav>
  )
}