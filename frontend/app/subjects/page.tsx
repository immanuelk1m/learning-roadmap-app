'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import Link from 'next/link'
import SubjectList from '@/components/subjects/SubjectList'
import CreateSubjectButton from '@/components/subjects/CreateSubjectButton'
import SubjectListSkeleton from '@/components/subjects/SubjectListSkeleton'

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()
  
  const fetchSubjects = async () => {
    const { data: userRes } = await supabase.auth.getUser()
    const uid = userRes.user?.id
    if (!uid) {
      setSubjects([])
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', uid)
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
    <div className="bg-[#f8f8f8] w-full min-h-screen">
      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto">
        <div className="pt-[20px] px-[42px]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-[17px] font-bold text-[#212529]">
                내 과목
              </h1>
              <p className="text-[#737373] text-[13px] mt-1">AI와 함께하는 스마트 학습 여정</p>
            </div>
            <CreateSubjectButton />
          </div>

          {loading ? (
            <SubjectListSkeleton />
          ) : subjects && subjects.length > 0 ? (
            <SubjectList subjects={subjects} onSubjectDeleted={fetchSubjects} />
          ) : (
            <div className="text-center py-20 bg-white rounded-[5px] shadow-lg">
              <div className="mb-8">
                <div className="w-24 h-24 bg-[#f8f8f8] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-[#737373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-[17px] font-bold text-[#212529] mb-2">학습 여정을 시작해보세요</h3>
                <p className="text-[#737373] text-[13px] mb-8 max-w-md mx-auto">
                  첫 번째 과목을 추가하고 AI가 도와주는 효율적인 학습을 경험해보세요.
                </p>
              </div>
              <CreateSubjectButton />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
