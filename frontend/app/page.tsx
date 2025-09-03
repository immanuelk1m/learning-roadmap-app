'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: userRes } = await supabase.auth.getUser()
      const uid = userRes.user?.id
      if (!uid) {
        setSubjects([]); setDocuments([]); setActivities([]); setSystemStatus(null); setLoading(false); return
      }
      
      // 병렬로 데이터 패칭 (RPC 함수 사용)
      // Onboarding redirect guard: if user has no onboarding response, send to /onboarding
      const { data: ob } = await (supabase as any)
        .from('onboarding_responses')
        .select('id')
        .eq('user_id', uid)
        .maybeSingle()
      if (!ob) {
        setLoading(false)
        router.push('/onboarding')
        return
      }

      const [subjectsResult, documentsResult, activitiesResult, statusResult] = await Promise.all([
        // 과목별 진행도 조회 (최적화된 RPC 함수)
        supabase.rpc('get_subjects_with_progress', { p_user_id: uid }),
        // 문서별 진행도 조회
        supabase.rpc('get_documents_with_progress', { p_user_id: uid }),
        // 활동 히트맵 데이터 조회
        supabase.rpc('get_activity_heatmap', { p_user_id: uid, days: 365 }),
        // 시스템 상태 조회
        supabase.rpc('get_system_status', { p_user_id: uid })
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
    <main className="bg-[var(--color-background)] w-full min-h-full flex flex-col">
      {/* Main Content Container */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col flex-1">
        {/* Main Content - 반응형 레이아웃 */}
        <div className="py-6 lg:py-8 flex-1 flex flex-col gap-8 min-h-0 lg:grid lg:grid-cols-[320px_1fr] lg:items-start">
          {/* Left Column */}
          <div className="lg:w-auto lg:flex-none flex flex-col gap-4 min-h-0 h-full">
            {/* Today's Recommendation */}
            <TodayRecommendation subjects={subjects} />

            {/* Document Progress List - 학습활동 기록과 같은 높이로 맞춤 */}
            <div className="flex-[2.7] min-h-0 flex flex-col">
              <DocumentProgressList documents={documents} />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex-1 flex flex-col gap-6 min-w-0 min-h-0">
            {/* My Course Section - 반응형 비율 */}
            <div className="flex-[1.7] min-h-[300px]">
              <MyCourseCards subjects={subjects} />
            </div>

            {/* Learning Activity Graph - 반응형 비율 */}
            <div className="flex-1 min-h-[200px]">
              <ActivityGraph
                activities={activities}
                lastActivity={systemStatus?.last_activity}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
