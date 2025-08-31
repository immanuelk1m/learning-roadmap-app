'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock,
  Award,
  FileText,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react'

interface Stats {
  totalSubjects: number
  totalDocuments: number
  averageUnderstanding: number
  totalQuizSessions: number
  quizAccuracy: number
  missedQuestionsCount: number
}

interface SubjectProgress {
  id: string
  name: string
  description: string | null
  exam_date: string | null
  documentCount: number
  averageUnderstanding: number
  color: string
}

interface RecentActivity {
  id: string
  title: string
  type: 'document' | 'quiz' | 'study_guide'
  date: string
  status?: string
}

export default function MyPage() {
  const [stats, setStats] = useState<Stats>({
    totalSubjects: 0,
    totalDocuments: 0,
    averageUnderstanding: 0,
    totalQuizSessions: 0,
    quizAccuracy: 0,
    missedQuestionsCount: 0
  })
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([])
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // 전체 통계 가져오기
      const [
        subjectsData,
        documentsData,
        knowledgeData,
        quizSessionsData,
        quizAttemptsData,
        missedQuestionsData
      ] = await Promise.all([
        // 과목 수
        supabase
          .from('subjects')
          .select('id')
          .eq('user_id', FIXED_USER_ID),
        
        // 문서 수
        supabase
          .from('documents')
          .select('id')
          .eq('user_id', FIXED_USER_ID),
        
        // 평균 이해도
        supabase
          .from('knowledge_nodes')
          .select('understanding_level')
          .eq('user_id', FIXED_USER_ID)
          .gt('understanding_level', 0),
        
        // 퀴즈 세션
        supabase
          .from('quiz_sessions')
          .select('id, status')
          .eq('user_id', FIXED_USER_ID),
        
        // 퀴즈 정답률
        supabase
          .from('quiz_attempts')
          .select('is_correct')
          .eq('user_id', FIXED_USER_ID),
        
        // 틀린 문제
        supabase
          .from('missed_questions')
          .select('id, mastered')
          .eq('user_id', FIXED_USER_ID)
          .eq('mastered', false)
      ])

      // 평균 이해도 계산
      const avgUnderstanding = knowledgeData.data?.length 
        ? knowledgeData.data.reduce((sum, node) => sum + (node.understanding_level || 0), 0) / knowledgeData.data.length
        : 0

      // 퀴즈 정답률 계산
      const correctAnswers = quizAttemptsData.data?.filter(a => a.is_correct).length || 0
      const totalAttempts = quizAttemptsData.data?.length || 0
      const accuracy = totalAttempts > 0 ? (correctAnswers / totalAttempts) * 100 : 0

      setStats({
        totalSubjects: subjectsData.data?.length || 0,
        totalDocuments: documentsData.data?.length || 0,
        averageUnderstanding: Math.round(avgUnderstanding),
        totalQuizSessions: quizSessionsData.data?.filter(s => s.status === 'completed').length || 0,
        quizAccuracy: Math.round(accuracy),
        missedQuestionsCount: missedQuestionsData.data?.length || 0
      })

      // 과목별 진행률 가져오기
      const { data: subjects } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', FIXED_USER_ID)
        .order('created_at', { ascending: false })

      if (subjects) {
        const progressData = await Promise.all(
          subjects.map(async (subject) => {
            // 해당 과목의 문서 수
            const { data: docs } = await supabase
              .from('documents')
              .select('id')
              .eq('subject_id', subject.id)
              .eq('user_id', FIXED_USER_ID)

            // 해당 과목의 지식 노드 이해도
            const { data: nodes } = await supabase
              .from('knowledge_nodes')
              .select('understanding_level')
              .eq('subject_id', subject.id)
              .eq('user_id', FIXED_USER_ID)

            const avgNodeUnderstanding = nodes?.length
              ? nodes.reduce((sum, n) => sum + (n.understanding_level || 0), 0) / nodes.length
              : 0

            return {
              id: subject.id,
              name: subject.name,
              description: subject.description,
              exam_date: subject.exam_date,
              documentCount: docs?.length || 0,
              averageUnderstanding: Math.round(avgNodeUnderstanding),
              color: subject.color || '#3B82F6'
            }
          })
        )
        setSubjectProgress(progressData)
      }

      // 최근 활동 가져오기
      const [recentDocs, recentQuizzes, recentGuides] = await Promise.all([
        supabase
          .from('documents')
          .select('id, title, updated_at')
          .eq('user_id', FIXED_USER_ID)
          .order('updated_at', { ascending: false })
          .limit(3),
        
        supabase
          .from('quiz_sessions')
          .select('id, created_at, status')
          .eq('user_id', FIXED_USER_ID)
          .order('created_at', { ascending: false })
          .limit(3),
        
        supabase
          .from('study_guides')
          .select('id, document_title, created_at')
          .eq('user_id', FIXED_USER_ID)
          .order('created_at', { ascending: false })
          .limit(3)
      ])

      const activities: RecentActivity[] = [
        ...(recentDocs.data?.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: 'document' as const,
          date: doc.updated_at
        })) || []),
        ...(recentQuizzes.data?.map(quiz => ({
          id: quiz.id,
          title: '퀴즈 세션',
          type: 'quiz' as const,
          date: quiz.created_at,
          status: quiz.status
        })) || []),
        ...(recentGuides.data?.map(guide => ({
          id: guide.id,
          title: guide.document_title || '학습 가이드',
          type: 'study_guide' as const,
          date: guide.created_at
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

      setRecentActivities(activities)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDday = (examDate: string | null) => {
    if (!examDate) return null
    const today = new Date()
    const exam = new Date(examDate)
    const diffTime = exam.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4" />
      case 'quiz':
        return <Target className="w-4 h-4" />
      case 'study_guide':
        return <BookOpen className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
          <p className="text-gray-600 mt-2">학습 현황을 한눈에 확인하세요</p>
        </div>

        {/* 통계 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-8 h-8 text-blue-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.totalSubjects}</span>
            </div>
            <p className="text-sm text-gray-600">총 과목 수</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.totalDocuments}</span>
            </div>
            <p className="text-sm text-gray-600">총 문서 수</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.averageUnderstanding}%</span>
            </div>
            <p className="text-sm text-gray-600">평균 이해도</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.totalQuizSessions}</span>
            </div>
            <p className="text-sm text-gray-600">완료한 퀴즈</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.quizAccuracy}%</span>
            </div>
            <p className="text-sm text-gray-600">퀴즈 정답률</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-8 h-8 text-red-500" />
              <span className="text-2xl font-bold text-gray-900">{stats.missedQuestionsCount}</span>
            </div>
            <p className="text-sm text-gray-600">복습 필요</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 과목별 진행 현황 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">과목별 진행 현황</h2>
              <div className="space-y-4">
                {subjectProgress.length > 0 ? (
                  subjectProgress.map((subject) => {
                    const dday = calculateDday(subject.exam_date)
                    return (
                      <div key={subject.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                            {subject.description && (
                              <p className="text-sm text-gray-600 mt-1">{subject.description}</p>
                            )}
                          </div>
                          {dday !== null && (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              dday <= 7 ? 'bg-red-100 text-red-700' :
                              dday <= 30 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              D-{dday}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {subject.documentCount}개 문서
                          </span>
                          {subject.exam_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(subject.exam_date)}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">이해도</span>
                            <span className="font-semibold">{subject.averageUnderstanding}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${subject.averageUnderstanding}%`,
                                backgroundColor: subject.color 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>아직 등록된 과목이 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">최근 활동</h2>
              <div className="space-y-3">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="p-2 rounded-lg bg-gray-100">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(activity.date)}
                        </p>
                        {activity.status && (
                          <span className={`inline-flex items-center gap-1 text-xs mt-1 ${
                            activity.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {activity.status === 'completed' ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {activity.status === 'completed' ? '완료' : '진행중'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>최근 활동이 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}