'use client'

import { ActivityData } from '@/types/home'
import { useMemo } from 'react'

interface ActivityGraphProps {
  activities: ActivityData[]
  lastActivity?: string | null
}

export default function ActivityGraph({ activities, lastActivity }: ActivityGraphProps) {
  // 지난 365일간의 날짜 생성
  const dateGrid = useMemo(() => {
    const grid: { date: string; activity?: ActivityData }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 52주 * 7일 = 364일
    for (let week = 51; week >= 0; week--) {
      for (let day = 6; day >= 0; day--) {
        const date = new Date(today)
        date.setDate(date.getDate() - (week * 7 + day))
        const dateStr = date.toISOString().split('T')[0]
        
        const activity = activities.find(a => a.activity_date === dateStr)
        grid.push({ date: dateStr, activity })
      }
    }
    
    return grid
  }, [activities])
  
  const getActivityColor = (activity?: ActivityData) => {
    if (!activity) return 'transparent'
    
    const { quiz_count, correct_rate } = activity
    
    // 활동량과 정답률을 고려한 색상 결정
    if (quiz_count === 0) return 'transparent'
    
    // 정답률 기반 색상 강도
    if (correct_rate >= 80) {
      // 높은 정답률: 초록색
      if (quiz_count >= 10) return '#22c55e'
      if (quiz_count >= 5) return '#4ade80'
      return '#86efac'
    } else if (correct_rate >= 60) {
      // 중간 정답률: 파란색
      if (quiz_count >= 10) return '#3b82f6'
      if (quiz_count >= 5) return '#60a5fa'
      return '#93c5fd'
    } else {
      // 낮은 정답률: 주황색
      if (quiz_count >= 10) return '#f97316'
      if (quiz_count >= 5) return '#fb923c'
      return '#fdba74'
    }
  }
  
  const getMonthLabels = () => {
    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
    const today = new Date()
    const labels = []
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today)
      date.setMonth(date.getMonth() - i)
      labels.push(months[date.getMonth()])
    }
    
    return labels
  }
  
  const getDayLabels = () => ['일', '월', '화', '수', '목', '금', '토']
  
  const formatLastActivity = (dateStr?: string | null) => {
    if (!dateStr) return '활동 없음'
    
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (hours < 1) return '방금 전'
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    if (days < 30) return `${Math.floor(days / 7)}주 전`
    return `${Math.floor(days / 30)}개월 전`
  }
  
  const totalQuizzes = activities.reduce((sum, a) => sum + a.quiz_count, 0)
  const avgCorrectRate = activities.length > 0
    ? Math.round(activities.reduce((sum, a) => sum + a.correct_rate, 0) / activities.length)
    : 0
  
  return (
    <div className="flex-1 bg-white rounded-[5px] shadow-lg p-5 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-[#212529]">학습활동 기록</h2>
          <p className="text-[13px] text-gray-600">
            {activities.length > 0 
              ? `총 ${totalQuizzes}개 문제, 평균 정답률 ${avgCorrectRate}%`
              : '오늘도 한 칸 채워볼까요?'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-500">마지막 활동</div>
          <div className="text-[13px] font-semibold text-[#212529]">
            {formatLastActivity(lastActivity)}
          </div>
        </div>
      </div>

      {/* 활동 그리드 */}
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-max">
          {/* 월 라벨 */}
          <div className="flex gap-[3px] mb-2 ml-7">
            {getMonthLabels().map((month, i) => (
              <div key={i} className="w-[48px] text-[10px] text-gray-500">
                {i % 2 === 0 ? month : ''}
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            {/* 요일 라벨 */}
            <div className="flex flex-col gap-[3px]">
              {getDayLabels().map((day, i) => (
                <div key={i} className="h-[12px] w-[20px] text-[10px] text-gray-500 flex items-center">
                  {i % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>
            
            {/* 활동 그리드 */}
            <div 
              className="grid grid-flow-col gap-[3px] p-2 bg-gray-50 rounded"
              style={{
                gridTemplateRows: 'repeat(7, 12px)',
                gridTemplateColumns: 'repeat(52, 12px)'
              }}
              role="img"
              aria-label="연간 학습 활동 히트맵"
            >
              {dateGrid.map((item, i) => {
                const color = getActivityColor(item.activity)
                const hasActivity = !!item.activity
                
                return (
                  <div
                    key={i}
                    className="w-[12px] h-[12px] rounded-[2px] transition-all hover:ring-2 hover:ring-gray-400 hover:ring-offset-1"
                    style={{
                      backgroundColor: hasActivity ? color : 'transparent',
                      border: hasActivity ? 'none' : '1px dashed #d0d0d0'
                    }}
                    title={hasActivity 
                      ? `${item.date}: ${item.activity!.quiz_count}개 문제, 정답률 ${item.activity!.correct_rate}%`
                      : item.date}
                    aria-label={hasActivity 
                      ? `${item.date} ${item.activity!.quiz_count}개 문제 풀이`
                      : `${item.date} 활동 없음`}
                  />
                )
              })}
            </div>
          </div>
          
          {/* 범례 */}
          <div className="flex items-center gap-4 mt-4 text-[11px] text-gray-600">
            <span>적음</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 border border-dashed border-gray-300 rounded-sm" />
              <div className="w-3 h-3 bg-gray-200 rounded-sm" />
              <div className="w-3 h-3 bg-blue-300 rounded-sm" />
              <div className="w-3 h-3 bg-blue-500 rounded-sm" />
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
            </div>
            <span>많음</span>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>높은 정답률</span>
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span>낮은 정답률</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}