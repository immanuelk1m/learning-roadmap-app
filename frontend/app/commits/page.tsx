'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { ActivityData, SystemStatus } from '@/types/home'

export default function CommitsPage() {
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [activitiesResult, statusResult] = await Promise.all([
        supabase.rpc('get_activity_heatmap', { p_user_id: FIXED_USER_ID, days: 365 }),
        supabase.rpc('get_system_status', { p_user_id: FIXED_USER_ID })
      ])

      if (activitiesResult.data) {
        setActivities(activitiesResult.data)
      }
      
      if (statusResult.data && statusResult.data.length > 0) {
        setSystemStatus(statusResult.data[0])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 지난 365일간의 날짜 생성
  const dateGrid = useMemo(() => {
    const grid: { date: string; activity?: ActivityData }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
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
    
    if (quiz_count === 0) return 'transparent'
    
    if (correct_rate >= 80) {
      if (quiz_count >= 10) return '#22c55e'
      if (quiz_count >= 5) return '#4ade80'
      return '#86efac'
    } else if (correct_rate >= 60) {
      if (quiz_count >= 10) return '#3b82f6'
      if (quiz_count >= 5) return '#60a5fa'
      return '#93c5fd'
    } else {
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

  // 통계 계산
  const stats = useMemo(() => {
    const totalQuizzes = activities.reduce((sum, a) => sum + a.quiz_count, 0)
    const totalStudyTime = activities.reduce((sum, a) => sum + a.study_time, 0)
    const activeDays = activities.filter(a => a.quiz_count > 0).length
    const avgCorrectRate = activities.length > 0
      ? Math.round(activities.reduce((sum, a) => sum + a.correct_rate, 0) / activities.length)
      : 0

    // 연속 학습일수 계산
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const activity = activities.find(a => a.activity_date === dateStr)
      
      if (activity && activity.quiz_count > 0) {
        if (i === 0) currentStreak = 1
        else if (currentStreak > 0) currentStreak++
        tempStreak++
        maxStreak = Math.max(maxStreak, tempStreak)
      } else {
        if (i === 0) currentStreak = 0
        tempStreak = 0
      }
    }

    return {
      totalQuizzes,
      totalStudyTime: Math.round(totalStudyTime / 60), // 분 단위로 변환
      activeDays,
      avgCorrectRate,
      currentStreak,
      maxStreak
    }
  }, [activities])

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

  if (loading) {
    return (
      <div className="bg-[var(--color-background)] w-full h-full flex items-center justify-center min-h-[calc(100vh-65px)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">학습활동 기록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="bg-[var(--color-background)] w-full min-h-[calc(100vh-65px)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 w-full py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-[#212529] mb-2">학습활동 상세 기록</h1>
          <p className="text-gray-600">지난 365일간의 학습활동을 자세히 확인해보세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="text-2xl font-bold text-green-600">{stats.activeDays}</div>
            <div className="text-sm text-gray-600">학습일수</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">{stats.totalQuizzes}</div>
            <div className="text-sm text-gray-600">총 퀴즈</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="text-2xl font-bold text-purple-600">{stats.avgCorrectRate}%</div>
            <div className="text-sm text-gray-600">평균 정답률</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="text-2xl font-bold text-orange-600">{stats.totalStudyTime}</div>
            <div className="text-sm text-gray-600">총 학습시간(분)</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="text-2xl font-bold text-red-600">{stats.currentStreak}</div>
            <div className="text-sm text-gray-600">연속 학습일</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="text-2xl font-bold text-gray-600">{formatLastActivity(systemStatus?.last_activity)}</div>
            <div className="text-sm text-gray-600">마지막 활동</div>
          </div>
        </div>

        {/* 확장된 히트맵 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-[#212529]">365일 학습활동 히트맵</h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-sm" />
                <span>높은 정답률</span>
                <div className="w-3 h-3 bg-blue-500 rounded-sm" />
                <span>중간 정답률</span>
                <div className="w-3 h-3 bg-orange-500 rounded-sm" />
                <span>낮은 정답률</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* 월 라벨 */}
              <div className="flex gap-[3px] mb-3 ml-12">
                {getMonthLabels().map((month, i) => (
                  <div key={i} className="w-[56px] text-sm text-gray-500 text-center">
                    {i % 2 === 0 ? month : ''}
                  </div>
                ))}
              </div>
              
              <div className="flex gap-4">
                {/* 요일 라벨 */}
                <div className="flex flex-col gap-[3px]">
                  {getDayLabels().map((day, i) => (
                    <div key={i} className="h-[16px] w-[24px] text-sm text-gray-500 flex items-center">
                      {i % 2 === 1 ? day : ''}
                    </div>
                  ))}
                </div>
                
                {/* 활동 그리드 */}
                <div 
                  className="grid grid-flow-col gap-[3px] p-3 bg-gray-50 rounded-lg"
                  style={{
                    gridTemplateRows: 'repeat(7, 16px)',
                    gridTemplateColumns: 'repeat(52, 16px)'
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
                        className="w-[16px] h-[16px] rounded-[3px] transition-all hover:ring-2 hover:ring-gray-400 hover:ring-offset-1 cursor-pointer"
                        style={{
                          backgroundColor: hasActivity ? color : 'transparent',
                          border: hasActivity ? 'none' : '1px dashed #d0d0d0'
                        }}
                        title={hasActivity 
                          ? `${item.date}: ${item.activity!.quiz_count}개 문제, 정답률 ${item.activity!.correct_rate}%, 학습시간 ${Math.round(item.activity!.study_time / 60)}분`
                          : item.date}
                        aria-label={hasActivity 
                          ? `${item.date} ${item.activity!.quiz_count}개 문제 풀이`
                          : `${item.date} 활동 없음`}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 활동 목록 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-bold text-[#212529] mb-4">최근 학습 활동</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {activities
              .filter(activity => activity.quiz_count > 0)
              .slice(0, 20)
              .map((activity, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(activity.activity_date).toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: getActivityColor(activity) }}
                      />
                      <span className="text-sm text-gray-600">
                        {activity.quiz_count}개 문제
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">
                      정답률 {activity.correct_rate}%
                    </span>
                    <span className="text-gray-600">
                      {Math.round(activity.study_time / 60)}분
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </main>
  )
}