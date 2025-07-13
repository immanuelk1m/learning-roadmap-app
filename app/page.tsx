'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import SubjectList from '@/components/subjects/SubjectList'
import CreateSubjectButton from '@/components/subjects/CreateSubjectButton'

export default function HomePage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()
  
  // 고정 사용자 ID 사용 (인증 없이)
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'
  
  const fetchSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', FIXED_USER_ID)
      .order('created_at', { ascending: false })
    
    if (data) {
      setSubjects(data)
    }
    setLoading(false)
  }
  
  useEffect(() => {
    fetchSubjects()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-neutral-200 rounded-full opacity-50"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-neutral-300 rounded-full opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-neutral-200 rounded-full opacity-40"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-12">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold text-neutral-900">
              내 과목
            </h1>
            <p className="text-neutral-600 text-lg">AI와 함께하는 스마트 학습 여정</p>
          </div>
          <CreateSubjectButton />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900"></div>
          </div>
        ) : subjects && subjects.length > 0 ? (
          <SubjectList subjects={subjects} onSubjectDeleted={fetchSubjects} />
        ) : (
          <div className="text-center py-20">
            <div className="mb-8">
              <div className="w-24 h-24 bg-neutral-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-700 mb-2">학습 여정을 시작해보세요</h3>
              <p className="text-neutral-500 mb-8 max-w-md mx-auto">
                첫 번째 과목을 추가하고 AI가 도와주는 효율적인 학습을 경험해보세요.
              </p>
            </div>
            <CreateSubjectButton />
          </div>
        )}
      </div>
    </div>
  )
}
