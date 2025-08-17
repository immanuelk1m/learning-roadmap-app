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
    <div className="bg-[#f8f8f8] w-full min-h-screen">
      {/* Navigation Header - Same as main page */}
      <div className="fixed bg-white h-[65px] left-0 top-0 w-full z-50 border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto relative h-full">
          {/* Logo and Welcome */}
          <div className="absolute left-[46px] top-6 flex items-center gap-[13px]">
            <div className="text-[#212529] text-[17.398px] font-semibold">
              Commit
            </div>
            <div className="w-px h-[9.5px] border-l border-gray-300"></div>
            <div className="text-[#94aac0] text-[12px] font-normal">
              환영합니다, Taehee님
            </div>
          </div>

          {/* Center Navigation */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-[60px]">
            <Link href="/" className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">Main</Link>
            <span className="text-[#94aac0] text-[17.398px] font-semibold cursor-pointer">My Course</span>
            <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">자료별 진행률</span>
            <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">내커밋 한눈에 보기</span>
          </div>

          {/* Profile */}
          <div className="absolute right-[46px] top-2 w-[50px] h-[50px] rounded-[10px] border border-[#e5e5e5] overflow-hidden bg-white">
            <img 
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAAAXcSURBVGiB1ZprbBRVGIafM7Ozs7u9bLel26XlphRKEaggokGRmxcMCCKKYAQSiSgxajRGozHxxh8TfxiNGhONRiMaQTQqF0UQRQQERJGLFATk1lIopbTd3Z2d2Zkz/mhpu7sz29mW+v/tznfO+877zjnfOeeMwP/AzJkzxyqKMhcYDQwBGBkZaQf4u7q62oHfgR+83377bcuWLVtqblhkYGv27NnjDcOYBdwJjAII9nkBAV6vB7fLhSxLCMF6g6IoQjyeIBKJ0hwO09ISJpFQ/wE2JJPJjzZu3Li/z2RMSFxmzJgxFHgOuB/HQODEhVNwuGRkWUKSJIQQCCGQJKlT0Gy1VitCUxWaQvV4HU4CPT2Ijx+/0NDQsFBV1TN9JmQiMm3atBsB3I6B3FAhOBwOZLmjE5IkdQp0CrQhREdchBAYRo4hI0ajGwYul9tMz8ypU6c0TdMOWnXQCjNnzhzrcDieb2kO8VRdBU5nBwVJkroEmgXahboJtIdQO6JhIJPTEEKgtjYx6gY3N1S62LBxQ/hs0dmXtm3bFrHqaDHMnDlzrKIo77udLnYdOkLQHzBdRxCvP2kqYuaoZkHNYo4sO+jf30dNfRMlQT/l5eXJ6urqRaqqftdX1BYYhvFcUhX/ffFjgzCMzD5FQorOojZB7fVRQgg8bg8e2YlhGNxyyy2EQqGFQJ9QGzt27Fiz3HaxeVUFT6/6BQJJONKCcOZwwRAoCtKwQh5MhbBZyNJEu4iZULuYJElMu2E8m9evZsPJJry54XJZljeYtS2KWbNmjZBlOX/XoSMECxWAwW4ckiAtG+/gH4B/+MDe6S4A4UwSCKR5hMAOITOxQjlCCEGhAiufeIKxN95IMBgcA0y12p88mDdvni+E+Dzfm5tqMuxqQiCkDGZT5GQy9TqSwLT1vhKpbWjglRde4MTx42iaxoQJE8qTyeSdVhMwawBo9+X5C2VZzuhqTTQH36AgCCdE0hSxu8xLqpqaGp5esICzZ88yefJkAE6fPl1otR0ZSKQHOzFnzhzN5/M90dLSQiKRyJhoCCQyH9ER7vhLKQmEgN5+DLOl2v8LgVjJoKZpHDt2jJqaGurr60kmk0RERFRD7w+GkpM8CKIlElBShJRKQm+K4JJb0A0Dn89HKBSiurqa1tZWhBDcyXhUhz+lDBG/Zru31yCVMAyjQ0SSyLM84DsP4QSZOzMhQJJRvT4CeSoLF87HVRBk06ZNnC06S9Rrs46J+MgklLRSLpcLVVU5YTGxMCJFREhQ30HasgBJslxySqimpsawkkiYSWRCkiQGDBjwV06E7u5fA0aOHEVxcQ+Sw6EQSMPBSiQUCtWa6dk6xdiyFrVqf8OGDfUMqLJUJIJkkhjOo1Io2L5uNQGvzJjhw7vJOZx2RCzUNDc3B4XS5bXVtk/Hy6JsJoL7quxJaB0iJBByLcQH/Yvq9GNE2pJJy0Y1TStpamo6JFQtu2NlsVhbtELrjBAQI4Y/SCBPwSHLJFI/kYzHWP/5WqJ19TjlJJKUPXSx0FBfX393VBglzGTOW/S4pwiJ9AiYIwSnrQiJcOazAh9+H6OHKMz/cBWxcIS9v+4lHo/3qdCFCxcGCeWqZBbbpJJqE5E9XQlBKCRhx4mQK5gUQqCoOdcWKrRDaNWqVUcTSn6oM9jkN9rLTPjrhtH1Dv8T61Ycpg7n/1KmMzJ0Gvta6kMhiDZ3TIxrP34K6i9yPcCGUCTCNqEkE2Y9TqaJQJfMpk2b/iwuKny1sjAP2WnN2vxGfqRuETJHe0T6Uo3qxOIqpaWlLQN9Oc+dO38+Q9RKxMzxcvToUafdbv99d+d57HG7S2VZyhKxu/9OXYb3jlA0vGjhwuqLFy9aXovPmTNneW7k4jJPAMfrYiRMJ70tEzrfIRxJ1Bx6bOm9Px07dixh0ux/MWjQoHwgkFvk9RsGOaHGcDBXSzIcDofXr1t36lpt/A9XTGJXVyHJDAAAAABJRU5ErkJggg=="
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto">
        <div className="pt-[85px] px-[42px]">
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