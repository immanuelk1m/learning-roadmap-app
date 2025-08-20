'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { SubjectWithProgress, DocumentWithProgress, ActivityData, SystemStatus } from '@/types/home'
import TodayRecommendation from '@/components/home/TodayRecommendation'
import DocumentProgressList from '@/components/home/DocumentProgressList'
import MyCourseCards from '@/components/home/MyCourseCards'
import ActivityGraph from '@/components/home/ActivityGraph'

export default function HomePage() {
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([])
  const [documents, setDocuments] = useState<DocumentWithProgress[]>([])
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const supabase = createBrowserClient()
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // 병렬로 데이터 패칭 (RPC 함수 사용)
      const [subjectsResult, documentsResult, activitiesResult, statusResult] = await Promise.all([
        // 과목별 진행도 조회 (최적화된 RPC 함수)
        supabase.rpc('get_subjects_with_progress', { p_user_id: FIXED_USER_ID }),
        // 문서별 진행도 조회
        supabase.rpc('get_documents_with_progress', { p_user_id: FIXED_USER_ID }),
        // 활동 히트맵 데이터 조회
        supabase.rpc('get_activity_heatmap', { p_user_id: FIXED_USER_ID, days: 365 }),
        // 시스템 상태 조회
        supabase.rpc('get_system_status', { p_user_id: FIXED_USER_ID })
      ])

      if (subjectsResult.data) {
        setSubjects(subjectsResult.data)
      }
      
      if (documentsResult.data) {
        setDocuments(documentsResult.data)
      }
      
      if (activitiesResult.data) {
        setActivities(activitiesResult.data)
      }
      
      if (statusResult.data && statusResult.data.length > 0) {
        setSystemStatus(statusResult.data[0])
      }
      
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // 30초마다 자동 새로고침 (문서 처리 중일 때)
    const interval = setInterval(() => {
      if (systemStatus?.processing_documents && systemStatus.processing_documents > 0) {
        fetchData()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])
  
  // 시스템 상태 변경 감지
  useEffect(() => {
    if (systemStatus?.processing_documents && systemStatus.processing_documents > 0) {
      const timer = setTimeout(fetchData, 30000)
      return () => clearTimeout(timer)
    }
  }, [systemStatus?.processing_documents])

  if (loading) {
    return (
      <div className="bg-[var(--color-background)] w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="bg-[var(--color-background)] w-full min-h-screen flex flex-col">
      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col">
        {/* Main Content - 반응형 레이아웃 */}
        <div className="pt-4 pb-0 flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Left Column */}
          <div className="flex-1 lg:max-w-[400px] flex flex-col h-full min-h-0">
            {/* Today's Recommendation */}
            <TodayRecommendation subjects={subjects} />

            {/* Document Progress List */}
            <DocumentProgressList documents={documents} />
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-5 h-full min-h-0">
            {/* My Course Section */}
            <div className="flex-[1.3]">
              <MyCourseCards subjects={subjects} />
            </div>

            {/* Learning Activity Graph */}
            <ActivityGraph
              activities={activities}
              lastActivity={systemStatus?.last_activity}
            />
          </div>
        </div>
      </div>
    </main>
  )
}