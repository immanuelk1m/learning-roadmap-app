'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { useRouter } from 'next/navigation'

interface Subject {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
  progress?: number
  nodeCount?: number
  completedNodes?: number
}

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()
  const router = useRouter()
  const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        // Fetch subjects
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', FIXED_USER_ID)
          .order('created_at', { ascending: false })

        if (subjectsData) {
          // For each subject, calculate progress based on knowledge nodes
          const subjectsWithProgress = await Promise.all(
            subjectsData.map(async (subject) => {
              // Fetch knowledge nodes for this subject
              const { data: nodesData } = await supabase
                .from('knowledge_nodes')
                .select('understanding_level')
                .eq('subject_id', subject.id)
                .eq('user_id', FIXED_USER_ID)

              let progress = 0
              let nodeCount = 0
              let completedNodes = 0

              if (nodesData && nodesData.length > 0) {
                nodeCount = nodesData.length
                // Count nodes with understanding_level >= 80 as completed
                completedNodes = nodesData.filter(node => node.understanding_level >= 80).length
                progress = Math.round((completedNodes / nodeCount) * 100)
              }

              return {
                ...subject,
                progress,
                nodeCount,
                completedNodes
              }
            })
          )

          setSubjects(subjectsWithProgress)
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
    <div className="bg-[#f8f8f8] w-full min-h-screen">
      {/* Navigation */}
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
          <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">Main</span>
          <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">My Course</span>
          <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">자료별 진행률</span>
          <span className="text-[#212529] text-[17.398px] font-semibold cursor-pointer">내커밋 한눈에 보기</span>
        </div>

        {/* Profile */}
        <div className="absolute right-[46px] top-2 w-[50px] h-[50px] rounded-[10px] border border-[#e5e5e5] overflow-hidden bg-white">
          <img 
            src="data:image/png;base64,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"
            alt="Profile"
            className="w-full h-full object-cover"
          />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto">
        {/* Main Content */}
        <div className="pt-[85px] px-[42px] flex gap-6 min-h-[calc(100vh-85px)]">
        {/* Left Column */}
        <div className="flex-1 max-w-[400px]">
          {/* Today's Recommendation Box */}
          <div className="bg-[rgba(68,68,68,0.06)] h-[140px] rounded-lg p-5 mb-5">
            <div className="flex items-center gap-4">
              <div className="bg-[#2f332f] w-[85px] h-[85px] rounded-[5px]"></div>
              <div className="flex-1">
                <p className="text-[15px] mb-2">오늘은</p>
                <div className="bg-white px-4 py-2 rounded-[8px] shadow-sm inline-block">
                  <span className="font-bold text-[14px]">SID Chapter 4</span>
                </div>
                <p className="text-[15px] mt-2">이어가보는건 어때요?</p>
              </div>
            </div>
          </div>

          {/* Subject Progress List */}
          <div className="bg-white rounded-[5px] shadow-lg p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-[17px] font-bold">자료별 진행도</h2>
                <p className="text-[13px] text-gray-600">시급별 순으로 진행되어있습니다.</p>
              </div>
              <div className="flex gap-3">
                <button className="text-[14px] font-bold">낮은 진행률</button>
                <button className="text-[14px] text-gray-400">최신순</button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              {/* Subject Items */}
              {[
                { name: 'SID Chapter 1', progress: 13, color: '#ff4444' },
                { name: '데이터 과학 Chapter 1', progress: 25, color: '#ff8844' },
                { name: '데이터 과학 Chapter 2', progress: 75, color: '#44aa44' },
                { name: '데이터 과학 Chapter 3', progress: 95, color: '#2ce477' },
                { name: 'SID Chapter 2', progress: 100, color: '#2ce477' },
                { name: 'SID Chapter 4', progress: 100, color: '#2ce477' },
                { name: 'SID Chapter 3', progress: 100, color: '#2ce477' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 mb-3">
                  <div className="flex-1 bg-[#2f332f] rounded-[10px] h-[60px] flex items-center px-6 relative">
                    <span className="text-white text-[13px] font-semibold flex-1">{item.name}</span>
                    
                    {/* Progress Circle */}
                    <div className="relative w-[45px] h-[45px]">
                      <svg viewBox="0 0 45 45" className="transform -rotate-90">
                        <circle cx="22.5" cy="22.5" r="18" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3"/>
                        <circle cx="22.5" cy="22.5" r="18" fill="none" stroke={item.color} strokeWidth="3" 
                          strokeDasharray={`${2 * Math.PI * 18 * item.progress / 100} ${2 * Math.PI * 18}`}/>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-bold text-[11px]">
                          {item.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-[55px] h-[60px] bg-[#2f332f] rounded-[10px]"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col gap-5">
          {/* My Course Section - 56% */}
          <div className="flex-[1.3] bg-white rounded-[5px] shadow-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-[15px] font-bold">My Course</h2>
                <p className="text-[13px] text-gray-600">시급별 순으로 진행되어있습니다.</p>
              </div>
              <button className="bg-[#2f332f] text-[#2ce477] px-4 py-2 rounded-[7px] shadow-lg flex items-center gap-2">
                <span className="font-bold text-[13px]">과목 생성</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="#2ce477" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Course Cards */}
            <div className="flex gap-4 flex-wrap">
              {subjects.length > 0 ? (
                subjects.slice(0, 3).map((subject, index) => {
                  // Define gradient colors based on subject color or use defaults
                  const gradientColors = subject.color === '#737373' 
                    ? index === 0 
                      ? ['#4B9BFF', '#3A8FFF'] // Blue gradient for first card
                      : index === 1
                      ? ['#FF6B6B', '#FF5555'] // Red gradient for second card  
                      : ['#22C55E', '#16A34A'] // Green gradient for third card
                    : [subject.color, subject.color] // Use subject's own color

                  const progress = subject.progress || 0
                  const statusLabel = progress === 0 
                    ? '🔥 노력필요' 
                    : progress < 50 
                    ? '📚 진행중' 
                    : progress < 100 
                    ? '✨ 거의완료' 
                    : '🎉 완료'

                  return (
                    <div 
                      key={subject.id}
                      onClick={() => router.push(`/subjects/${subject.id}`)}
                      className="relative w-[220px] h-[135px] rounded-[12px] p-4 text-white cursor-pointer transform transition-transform hover:scale-105"
                      style={{
                        background: `linear-gradient(to bottom, ${gradientColors[0]}, ${gradientColors[1]})`
                      }}
                    >
                      {/* 상단 헤더 */}
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[11px] bg-[rgba(255,255,255,0.2)] px-2 py-1 rounded-[4px]">
                          {statusLabel}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation() // Prevent navigation when clicking X
                            // Handle delete or close action if needed
                          }}
                          className="w-5 h-5 flex items-center justify-center hover:bg-[rgba(255,255,255,0.2)] rounded"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                      
                      {/* 과목 정보 */}
                      <div className="mb-4">
                        <div className="text-[10px] opacity-70 mb-1">과목명</div>
                        <div className="text-[16px] font-bold truncate">{subject.name}</div>
                      </div>
                      
                      {/* 진행바 */}
                      <div className="w-full h-[6px] bg-[rgba(255,255,255,0.3)] rounded-full mb-4">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      
                      {/* 하단 Commit 배지 */}
                      <div className="flex justify-end gap-3">
                        <div className="bg-[rgba(255,255,255,0.25)] rounded-full w-[38px] h-[38px] flex items-center justify-center">
                          <span className="text-[16px] font-bold">{subject.completedNodes || 0}</span>
                        </div>
                        <div className="bg-[rgba(255,255,255,0.25)] rounded-full w-[38px] h-[38px] flex items-center justify-center">
                          <span className="text-[16px] font-bold">{subject.nodeCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                // Empty state or skeleton
                <div className="text-gray-500 text-sm">
                  과목이 없습니다. 과목을 생성해주세요.
                </div>
              )}
            </div>
          </div>

          {/* Learning Activity Graph - 44% */}
          <div className="flex-1 bg-white rounded-[5px] shadow-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-[15px] font-bold">학습활동 기록</h2>
                <p className="text-[11px] text-gray-600">오늘도 한 칸 채워볼까요? 🟢</p>
              </div>
              <button className="text-[12px] font-bold">view all</button>
            </div>

            {/* Activity Grid */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52, 10px)', gridTemplateRows: 'repeat(7, 10px)', gap: '1px' }}>
                {Array.from({ length: 52 * 7 }, (_, i) => {
                  const colors = ['#ede9e9', '#c3f4b8', '#63f34c', '#2ce477']
                  // 특정 위치에만 활동 표시 (하드코딩된 패턴)
                  const greenCells = new Set([45, 46, 94, 95, 96, 142, 143, 144, 145, 190, 191, 192, 238, 239, 240, 241, 286, 287, 288, 289, 290, 334, 335, 336])
                  const color = greenCells.has(i) ? colors[Math.floor((i % 3) + 1)] : colors[0]
                  
                  return (
                    <div
                      key={i}
                      style={{ 
                        width: '10px',
                        height: '10px',
                        border: '1px dashed #cacaca',
                        backgroundColor: color,
                        borderRadius: '1px'
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}