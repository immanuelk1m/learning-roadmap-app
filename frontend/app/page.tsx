'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'

export default function HomePage() {
  const [subjects, setSubjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', FIXED_USER_ID)
          .order('created_at', { ascending: false })

        if (subjectsData) {
          setSubjects(subjectsData)
        }
      } catch (error) {
        console.error('Error fetching subjects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [])

  return (
    <div className="bg-[#f8f8f8] relative w-full min-h-screen">
      {/* Navigation */}
      <div className="absolute bg-white h-[65px] left-1/2 top-0 w-[1440px] -translate-x-1/2 overflow-hidden border-b border-gray-200">
        {/* Logo and Welcome */}
        <div className="absolute left-[46px] top-6 flex items-center gap-[13px]">
          <div className="text-[#212529] text-[17.398px] font-semibold">
            Commit
          </div>
          <div className="w-px h-[9.5px] border-l border-gray-300"></div>
          <div className="text-[#94aac0] text-[12px] font-bold">
            환영합니다, Taehee님
          </div>
        </div>

        {/* Center Navigation - positioned absolutely */}
        <div className="absolute left-[525.5px] top-[32.5px] -translate-x-1/2 -translate-y-1/2">
          <span className="text-[#212529] text-[17.398px] font-semibold">Main</span>
        </div>
        <div className="absolute left-[611.5px] top-[32.5px] -translate-x-1/2 -translate-y-1/2">
          <span className="text-[#212529] text-[17.398px] font-semibold">My Course</span>
        </div>
        <div className="absolute left-[727px] top-[32.5px] -translate-x-1/2 -translate-y-1/2">
          <span className="text-[#212529] text-[17.398px] font-semibold">과목별 진행률</span>
        </div>
        <div className="absolute left-[866px] top-[32.5px] -translate-x-1/2 -translate-y-1/2">
          <span className="text-[#212529] text-[17.398px] font-semibold">내커밋 한눈에 보기</span>
        </div>

        {/* Profile */}
        <div className="absolute left-[1346.5px] top-2 w-[50px] h-[50px] rounded-[10px] border border-[#004d47] bg-gray-200 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#004d47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="7" r="4" stroke="#004d47" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Today's Recommendation Box */}
      <div className="absolute bg-[rgba(68,68,68,0.06)] h-[159px] left-[42px] top-[93px] w-[494px] rounded-lg overflow-hidden">
        <div className="absolute bg-[#2f332f] w-[115px] h-28 rounded-[5px] top-[19px] left-[21px]"></div>
        <div className="absolute left-[156px] top-[55px]">
          <span className="text-[15px] font-bold">오늘은</span>
        </div>
        <div className="absolute bg-white left-[157px] top-[82px] w-[127px] px-2 py-2 rounded-lg shadow-md">
          <span className="font-bold text-[15.776px]">SID Chapter 4</span>
        </div>
        <div className="absolute left-[320px] top-[98px]">
          <span className="text-[15px] font-bold">이어가보는건 어때요?</span>
        </div>
      </div>

      {/* Subject List Container */}
      <div className="absolute bg-white h-[722px] left-[42px] top-[272px] w-[494px] rounded-[5px] shadow-lg overflow-hidden">
        <div className="absolute left-[18px] top-[18px]">
          <h2 className="text-[17px] font-bold">과목별 진행도</h2>
          <p className="text-[13px] text-gray-600">시급별 순으로 진행되어있습니다.</p>
        </div>
        
        <div className="absolute right-[26px] top-[34px] flex gap-4">
          <button className="text-[15px] font-bold">최신순</button>
          <button className="text-[15px] text-gray-400">낮은 진행률</button>
        </div>

        <div className="absolute left-6 right-[102px] top-[75px] h-px bg-gray-300"></div>

        {/* Subject Items */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="absolute left-5" style={{ top: `${95 + i * 94}px` }}>
            <div className="flex items-center gap-3">
              <div className="bg-[#2f332f] rounded-[10px] h-[74px] w-[368px] flex items-center justify-between px-9 relative">
                <span className="text-white text-[13px] font-semibold">SID Chapter</span>
                
                {/* Red urgent label for first item */}
                {i === 0 && (
                  <div className="absolute -top-7 left-32 bg-[rgba(255,0,0,0.16)] border border-red-500 rounded px-2 py-1">
                    <span className="text-red-500 text-[9.675px] font-semibold">급함!!!!</span>
                  </div>
                )}
                
                {/* Progress Circle */}
                <div className="relative w-[60px] h-[60px]">
                  <svg viewBox="0 0 60 60" className="transform -rotate-90">
                    <circle cx="30" cy="30" r="25" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4"/>
                    <circle cx="30" cy="30" r="25" fill="none" stroke="#2ce477" strokeWidth="4" 
                      strokeDasharray={`${2 * Math.PI * 25 * 0.32} ${2 * Math.PI * 25}`}/>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold">
                      <span className="text-[11.377px]">32</span>
                      <span className="text-[8.126px]">%</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-[68px] h-[74px] bg-[#2f332f] rounded-[10px]"></div>
            </div>
          </div>
        ))}
      </div>

      {/* My Course Section */}
      <div className="absolute left-[579px] top-[113px]">
        <h2 className="text-[15px] font-bold">My Course</h2>
        <p className="text-[13px] text-gray-600">시급별 순으로 진행되어있습니다.</p>
      </div>

      {/* Course Card */}
      <div className="absolute left-[579px] top-[173px] w-[198px] h-[121.68px]">
        <div className="relative w-full h-full">
          {/* Background shape with gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B6B] to-[#FF8787] rounded-lg" 
               style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)' }}>
          </div>
          
          {/* Dark overlay at top */}
          <div className="absolute top-0 left-[44.64px] w-[153px] h-[48.24px] bg-[rgba(27,27,27,0.45)] rounded-[7.2px]"></div>
          
          {/* Content */}
          <div className="relative p-3 text-white z-10">
            <div className="flex justify-between items-start mb-1">
              <span className="text-[10.164px] font-bold">🔥노력필요</span>
              <div className="flex gap-8">
                <span className="text-[9.428px]">
                  <span className="font-normal">완성회차 </span>
                  <span className="font-bold">2</span>
                </span>
                <span className="text-[9.428px]">
                  <span className="font-normal">완성회차 </span>
                  <span className="font-bold">2</span>
                </span>
              </div>
            </div>
            
            <div className="absolute top-[46px] left-[15px]">
              <p className="text-[4.714px] font-bold">과목명</p>
            </div>
            <div className="absolute top-[55px] left-[15px]">
              <p className="text-[13.086px] font-bold">Smart Interface Design</p>
            </div>

            {/* Progress Bar */}
            <div className="absolute top-[69.48px] left-[8.64px] w-[174.6px]">
              <div className="h-[5.4px] bg-[#fffdff]">
                <div className="h-full w-[115.2px] bg-[#1b1b1b]"></div>
              </div>
            </div>

            {/* Commit Badges */}
            <div className="absolute top-[82.8px] left-[98.64px]">
              <div className="bg-[rgba(255,255,255,0.19)] rounded-full w-[31.68px] h-[31.68px] flex flex-col items-center justify-center">
                <span className="text-[4.714px] text-[rgba(255,255,255,0.56)]">Commit</span>
                <span className="text-[10.737px] font-bold">30</span>
              </div>
            </div>
            <div className="absolute top-[82.8px] left-[136.44px]">
              <div className="bg-[rgba(255,255,255,0.19)] rounded-full w-[31.68px] h-[31.68px] flex flex-col items-center justify-center">
                <span className="text-[4.714px] text-[rgba(255,255,255,0.56)]">Commit</span>
                <span className="text-[10.737px] font-bold">30</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="absolute top-[8.28px] right-[20.52px]">
              <svg width="11.16" height="11.16" viewBox="0 0 24 24" fill="none">
                <path d="M7 17L17 7M17 7H7M17 7V17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Right Arrow Box */}
      <div className="absolute bg-[#2f332f] h-[90px] left-[1338px] top-[548px] w-[59px] rounded-lg border border-[rgba(44,228,119,0.62)] shadow-lg flex items-center justify-center">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="#2ce477" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Add Course Button */}
      <button className="absolute left-[1267px] top-[113px] bg-[#2f332f] text-[#2ce477] px-4 py-2.5 rounded-[7px] shadow-lg flex items-center gap-2.5">
        <span className="font-bold text-[12.917px]">과목 생성</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="#2ce477" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Bottom Activity Graph */}
      <div className="absolute bg-white h-[337px] left-[556px] top-[657px] w-[842px] rounded-[5px] shadow-lg overflow-hidden">
        <div className="absolute left-[19px] top-[26px]">
          <h2 className="text-[17px] font-bold">학습활동 기록</h2>
          <p className="text-[13px] text-gray-600">최근 2년간의 학습활동을 한눈에 확인하세요.</p>
        </div>
        
        <div className="absolute right-[74px] top-[37px]">
          <button className="text-[15px] font-bold">view all</button>
        </div>

        {/* Activity Grid */}
        <div className="absolute left-2 top-[75px] p-[10.766px]">
          <div className="flex flex-wrap gap-0" style={{ width: '805px' }}>
            {Array.from({ length: 364 }, (_, i) => {
              const row = Math.floor(i / 44)
              const col = i % 44
              const colors = ['rgba(237,233,233,0.08)', 'rgba(99,243,76,0.39)', '#63f34c']
              const isGreen = (row === 6 && col === 8) || (row === 6 && col === 11)
              const isLightGreen = row === 6 && col === 9
              const color = isGreen ? colors[2] : isLightGreen ? colors[1] : colors[0]
              
              if (col >= 44) return null
              
              return (
                <div
                  key={i}
                  className="w-[18.302px] h-[18.302px] border-[2.153px] border-dashed border-[#cacaca]"
                  style={{ 
                    backgroundColor: color,
                    borderRadius: row === 0 && col === 0 ? '5.383px 0 0 0' : 
                                  row === 16 && col === 0 ? '0 0 0 5.383px' : '0'
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}