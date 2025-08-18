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
    <div className="bg-[#f8f8f8] w-full h-full overflow-hidden">
      {/* Main Content Container */}
      <div className="max-w-[1440px] mx-auto h-full">
        {/* Main Content */}
        <div className="pt-[20px] px-[42px] pb-[10px] flex gap-6 h-full">
        {/* Left Column */}
        <div className="flex-1 max-w-[400px] flex flex-col h-full">
          {/* Today's Recommendation Box */}
          <div className="bg-[rgba(68,68,68,0.06)] h-[140px] rounded-lg p-5 mb-5">
            <div className="flex items-center gap-4">
              <div className="bg-[#2f332f] w-[85px] h-[85px] rounded-[5px] flex items-center justify-center overflow-hidden">
                <img 
                  src="/profile.png" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
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
          <div className="bg-white rounded-[5px] shadow-lg p-5 flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-start mb-4 flex-shrink-0">
              <div>
                <h2 className="text-[17px] font-bold">자료별 진행도</h2>
                <p className="text-[13px] text-gray-600">시급별 순으로 진행되어있습니다.</p>
              </div>
              <div className="flex gap-3">
                <button className="text-[14px] font-bold">낮은 진행률</button>
                <button className="text-[14px] text-gray-400">최신순</button>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
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
                <div key={i} className="flex items-center gap-3 mb-2">
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
        <div className="flex-1 flex flex-col gap-5 h-full">
          {/* My Course Section - 56% */}
          <div className="flex-[1.3] bg-white rounded-[5px] shadow-lg p-5 flex flex-col min-h-0">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
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
            <div className="flex gap-4 flex-wrap overflow-y-auto flex-1 pr-2 custom-scrollbar">
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
          <div className="flex-1 bg-white rounded-[5px] shadow-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-[17px] font-bold text-[#212529]">학습활동 기록</h2>
                <p className="text-[13px] text-gray-600">오늘도 한 칸 채워볼까요?</p>
              </div>
              <button className="text-[14px] font-semibold text-[#212529]">view all</button>
            </div>

            {/* Activity Grid */}
            <div className="overflow-x-auto">
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(52, 12px)', 
                gridTemplateRows: 'repeat(7, 12px)', 
                gap: '3px',
                padding: '8px',
                backgroundColor: '#fafafa',
                borderRadius: '4px'
              }}>
                {Array.from({ length: 52 * 7 }, (_, i) => {
                  // 모든 셀을 점선 스타일로 표시
                  return (
                    <div
                      key={i}
                      style={{ 
                        width: '12px',
                        height: '12px',
                        border: '1px dashed #d0d0d0',
                        backgroundColor: 'transparent',
                        borderRadius: '2px'
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