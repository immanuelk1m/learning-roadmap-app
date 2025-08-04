'use client'

import { useMemo } from 'react'

// Fixed mock data generator using date as seed for consistent results
function generateCommitCount(dateStr: string): number {
  // Use date string to generate consistent pseudo-random number
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  const pseudoRandom = Math.abs(hash) % 100 / 100
  const date = new Date(dateStr)
  const dayOfWeek = date.getDay()
  
  // More commits on weekdays
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    if (pseudoRandom > 0.8) return 0
    if (pseudoRandom > 0.6) return 1
    if (pseudoRandom > 0.4) return 2
    if (pseudoRandom > 0.2) return 3
    return 4
  } else {
    // Weekends have fewer commits
    if (pseudoRandom > 0.4) return 0
    if (pseudoRandom > 0.2) return 1
    return 2
  }
}

export default function CommitGraph() {
  // Generate mock commit data for the last 365 days
  const commitData = useMemo(() => {
    const data: { date: string; count: number }[] = []
    const today = new Date()
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      data.push({
        date: dateStr,
        count: generateCommitCount(dateStr)
      })
    }
    
    return data
  }, [])

  // Group data by weeks
  const weeks = useMemo(() => {
    const weeks: { date: string; count: number }[][] = []
    let currentWeek: { date: string; count: number }[] = []
    
    commitData.forEach((day, index) => {
      currentWeek.push(day)
      
      if (currentWeek.length === 7 || index === commitData.length - 1) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })
    
    return weeks
  }, [commitData])

  // Get color based on commit count - Professional color scheme
  const getColor = (count: number) => {
    if (count === 0) return 'var(--color-neutral-200)'
    if (count === 1) return 'var(--color-primary-200)'
    if (count === 2) return 'var(--color-primary-300)'
    if (count === 3) return 'var(--color-primary-400)'
    if (count === 4) return 'var(--color-primary-500)'
    return 'var(--color-primary-600)'
  }

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; position: number }[] = []
    let lastMonth = ''
    
    weeks.forEach((week, weekIndex) => {
      const firstDay = new Date(week[0].date)
      const month = firstDay.toLocaleDateString('ko-KR', { month: 'short' })
      
      if (month !== lastMonth) {
        labels.push({ month, position: weekIndex })
        lastMonth = month
      }
    })
    
    return labels
  }, [weeks])

  const dayLabels = ['월', '화', '수', '목', '금', '토', '일']

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
        {/* Day labels */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '3px',
          paddingRight: 'var(--spacing-2)'
        }}>
          <div style={{ height: 'var(--spacing-5)' }}></div> {/* Spacer for month labels */}
          {dayLabels.map((day, i) => (
            <div 
              key={i} 
              style={{ 
                height: '12px',
                display: 'flex',
                alignItems: 'center',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-neutral-500)',
                visibility: i % 2 === 0 ? 'visible' : 'hidden'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Commit grid */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <div style={{ minWidth: 'max-content' }}>
            {/* Month labels */}
            <div style={{ 
              display: 'flex', 
              height: 'var(--spacing-5)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-neutral-500)',
              marginBottom: 'var(--spacing-1)',
              position: 'relative'
            }}>
              {monthLabels.map(({ month, position }) => (
                <div
                  key={`${month}-${position}`}
                  style={{ 
                    position: 'absolute',
                    left: `${position * 15}px`
                  }}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: getColor(day.count),
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        position: 'relative'
                      }}
                      title={`${day.date}: ${day.count}개 학습 활동`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)'
                        e.currentTarget.style.outline = '2px solid var(--color-primary-500)'
                        e.currentTarget.style.outlineOffset = '1px'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.outline = 'none'
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-3)',
        marginTop: 'var(--spacing-6)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-neutral-500)'
      }}>
        <span>적음</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          <div style={{ 
            width: '12px',
            height: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-neutral-200)'
          }}></div>
          <div style={{ 
            width: '12px',
            height: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-primary-200)'
          }}></div>
          <div style={{ 
            width: '12px',
            height: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-primary-300)'
          }}></div>
          <div style={{ 
            width: '12px',
            height: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-primary-400)'
          }}></div>
          <div style={{ 
            width: '12px',
            height: '12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-primary-500)'
          }}></div>
        </div>
        <span>많음</span>
      </div>
    </div>
  )
}