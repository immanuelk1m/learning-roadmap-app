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

  // Get color based on commit count - GitHub dark theme style
  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-800'
    if (count === 1) return 'bg-green-900'
    if (count === 2) return 'bg-green-700'
    if (count === 3) return 'bg-green-500'
    if (count === 4) return 'bg-green-400'
    return 'bg-green-300'
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
    <div className="w-full">
      <div className="flex gap-1 sm:gap-2">
        {/* Day labels */}
        <div className="flex flex-col gap-1 text-xs text-gray-400 pr-2">
          <div className="h-4"></div> {/* Spacer for month labels */}
          {dayLabels.map((day, i) => (
            <div key={i} className={`h-4 flex items-center ${i % 2 === 0 ? '' : 'invisible'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Commit grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-max">
            {/* Month labels */}
            <div className="flex h-3 sm:h-4 text-[10px] sm:text-xs text-gray-400 mb-1">
              {monthLabels.map(({ month, position }) => (
                <div
                  key={`${month}-${position}`}
                  className="absolute"
                  style={{ left: `${position * 16}px` }}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div className="flex gap-1 relative">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-4 h-4 rounded-sm ${getColor(day.count)} hover:ring-1 hover:ring-gray-600 cursor-pointer transition-all`}
                      title={`${day.date}: ${day.count}개 커밋`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1 sm:gap-2 mt-3 sm:mt-4 text-[10px] sm:text-xs text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-gray-800"></div>
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-900"></div>
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-700"></div>
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-500"></div>
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-400"></div>
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-sm bg-green-300"></div>
        </div>
        <span>More</span>
      </div>
    </div>
  )
}