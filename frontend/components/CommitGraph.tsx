'use client'

import { useMemo, useState } from 'react'

// Fixed mock data generator using date as seed for consistent results
function generateCommitData(dateStr: string) {
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
  
  // Generate learning time in minutes
  let learningTime = 0
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // Weekdays - more learning
    if (pseudoRandom > 0.8) learningTime = 0
    else if (pseudoRandom > 0.6) learningTime = Math.floor(pseudoRandom * 30) + 10 // 10-40 min
    else if (pseudoRandom > 0.4) learningTime = Math.floor(pseudoRandom * 60) + 30 // 30-90 min
    else learningTime = Math.floor(pseudoRandom * 120) + 60 // 60-180 min
  } else {
    // Weekends - less learning
    if (pseudoRandom > 0.6) learningTime = 0
    else if (pseudoRandom > 0.3) learningTime = Math.floor(pseudoRandom * 45) + 15 // 15-60 min
    else learningTime = Math.floor(pseudoRandom * 90) + 30 // 30-120 min
  }

  // Generate mock subjects studied
  const subjects = ['SID Chapter', 'Design Research 1', 'Data Structure', 'Design Research 2']
  const studiedSubjects = []
  
  if (learningTime > 0) {
    const numSubjects = learningTime > 60 ? 2 : 1
    for (let i = 0; i < numSubjects; i++) {
      const subjectIndex = Math.floor((pseudoRandom * 1000 + i * 250) % subjects.length)
      if (!studiedSubjects.includes(subjects[subjectIndex])) {
        studiedSubjects.push(subjects[subjectIndex])
      }
    }
  }

  return {
    learningTime,
    subjects: studiedSubjects
  }
}

type PeriodType = '1month' | '3months' | '6months' | '1year' | '2years'

export default function CommitGraph() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('2years')

  // Generate mock commit data based on selected period
  const commitData = useMemo(() => {
    const data: { date: string; learningTime: number; subjects: string[] }[] = []
    const today = new Date()
    
    const days = selectedPeriod === '1month' ? 30 : selectedPeriod === '3months' ? 90 : selectedPeriod === '6months' ? 180 : selectedPeriod === '1year' ? 365 : 730
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayData = generateCommitData(dateStr)
      
      data.push({
        date: dateStr,
        learningTime: dayData.learningTime,
        subjects: dayData.subjects
      })
    }
    
    return data
  }, [selectedPeriod])

  // Group data by weeks
  const weeks = useMemo(() => {
    const weeks: { date: string; learningTime: number; subjects: string[] }[][] = []
    let currentWeek: { date: string; learningTime: number; subjects: string[] }[] = []
    
    commitData.forEach((day, index) => {
      currentWeek.push(day)
      
      if (currentWeek.length === 7 || index === commitData.length - 1) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })
    
    return weeks
  }, [commitData])

  // Get color based on learning time
  const getColor = (learningTime: number) => {
    if (learningTime === 0) return 'var(--color-neutral-200)'
    if (learningTime < 30) return 'var(--color-primary-200)'
    if (learningTime < 60) return 'var(--color-primary-300)'
    if (learningTime < 120) return 'var(--color-primary-400)'
    return 'var(--color-primary-500)'
  }

  // Get month labels for vertical layout
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

  const formatLearningTime = (minutes: number) => {
    if (minutes === 0) return '학습 없음'
    if (minutes < 60) return `${minutes}분 학습`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분 학습` : `${hours}시간 학습`
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', flex: 1, minHeight: 0 }}>
        {/* Day labels - Left side */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '3px',
          paddingRight: 'var(--spacing-2)',
          width: '20px'
        }}>
          <div style={{ height: '20px' }}></div> {/* Spacer for month labels */}
          {dayLabels.map((day, i) => (
            <div 
              key={i} 
              style={{ 
                height: '14px',
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

        {/* Commit grid - Horizontal layout with scroll */}
        <div style={{ 
          flex: 1, 
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: '8px' // Space for scrollbar
        }}>
          <div style={{ 
            minWidth: 'max-content',
            width: `${weeks.length * 17}px` // Dynamic width based on data
          }}>
            {/* Month labels */}
            <div style={{ 
              display: 'flex', 
              height: '20px',
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
                    left: `${position * 17}px`
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
                        width: '14px',
                        height: '14px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: getColor(day.learningTime),
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        position: 'relative'
                      }}
                      title={`${day.date}: ${formatLearningTime(day.learningTime)}${day.subjects.length > 0 ? `\n학습 과목: ${day.subjects.join(', ')}` : ''}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)'
                        e.currentTarget.style.outline = '2px solid var(--color-primary-500)'
                        e.currentTarget.style.outlineOffset = '1px'
                        e.currentTarget.style.zIndex = '10'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.outline = 'none'
                        e.currentTarget.style.zIndex = '0'
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
        justifyContent: 'center',
        marginTop: 'var(--spacing-3)',
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-neutral-500)'
      }}>
        {/* Learning Time Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <span>학습 시간:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
            <div style={{ display: 'flex', gap: '3px' }}>
              <div style={{ 
                width: '14px',
                height: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-neutral-200)'
              }}></div>
              <div style={{ 
                width: '14px',
                height: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-200)'
              }}></div>
              <div style={{ 
                width: '14px',
                height: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-300)'
              }}></div>
              <div style={{ 
                width: '14px',
                height: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-400)'
              }}></div>
              <div style={{ 
                width: '14px',
                height: '14px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary-500)'
              }}></div>
            </div>
            <span>0분 → 30분 → 1시간 → 2시간 → 2시간+</span>
          </div>
        </div>
      </div>
    </div>
  )
}