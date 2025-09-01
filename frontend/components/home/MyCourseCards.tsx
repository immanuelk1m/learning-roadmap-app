'use client'

import { SubjectWithProgress } from '@/types/home'
import { useRouter } from 'next/navigation'
import CreateSubjectModal from '@/components/home/CreateSubjectModal'
import { useState } from 'react'

interface MyCourseCardsProps {
  subjects: SubjectWithProgress[]
}

export default function MyCourseCards({ subjects }: MyCourseCardsProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // 모든 과목 표시 (섹션 내부 스크롤)
  const topSubjects = subjects
  
  const getCardGradient = (subject: SubjectWithProgress, index: number) => {
    // 진행도에 따른 그라데이션
    if (subject.progress === 100) {
      return ['#22C55E', '#16A34A'] // 완료: 초록색
    } else if (subject.progress >= 70) {
      return ['#3B82F6', '#2563EB'] // 높은 진행도: 파란색
    } else if (subject.progress >= 40) {
      return ['#F59E0B', '#D97706'] // 중간 진행도: 주황색
    } else {
      return ['#EF4444', '#DC2626'] // 낮은 진행도: 빨간색
    }
  }
  
  const getStatusLabel = (progress: number) => {
    if (progress === 100) return '🎉 완료'
    if (progress >= 70) return '✨ 거의완료'
    if (progress >= 40) return '📚 진행중'
    if (progress > 0) return '🚀 시작됨'
    return '🔥 시작필요'
  }
  
  return (
    <div className="h-full bg-white border border-gray-200 rounded-[10px] shadow-sm p-5 flex flex-col min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <h2 className="text-[16px] font-semibold">My Course</h2>
          <p className="text-[13px] text-gray-600">
            {topSubjects.length > 0 
              ? '진행 중인 과목들입니다.' 
              : '새로운 과목을 추가해보세요.'}
          </p>
        </div>
      </div>

      {/* 카드 컨테이너 - 4x2 가시영역, 초과 시 내부 스크롤 */}
      {topSubjects.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[135px] gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full h-[135px] rounded-[12px] border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="새 과목 생성"
          >
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm font-medium">과목 생성하기</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[135px] items-start gap-3 h-full overflow-y-auto min-h-0 p-1 -m-1 custom-scrollbar">
          <>
            {topSubjects.map((subject, index) => {
              const gradientColors = getCardGradient(subject, index)
              const progress = subject.progress || 0
              const statusLabel = getStatusLabel(progress)

              return (
                <div
                  key={subject.id}
                  onClick={() => router.push(`/subjects/${subject.id}`)}
                  className="relative w-full h-auto min-h-[135px] overflow-visible rounded-[12px] p-4 text-white cursor-pointer transform transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
                  style={{
                    background: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})`
                  }}
                  role="article"
                  aria-label={`${subject.name} 과목, 진행도 ${progress}%, ${subject.completed_nodes}개 완료, 전체 ${subject.node_count}개`}
                  tabIndex={0}
                >
                  {/* 상단 헤더 */}
                  <div className="flex justify-between items-start mb-3">
                    {progress > 0 && (
                      <span className="text-[11px] bg-[rgba(255,255,255,0.2)] px-2 py-1 rounded-[4px]">
                        {statusLabel}
                      </span>
                    )}
                    {subject.documents_processing > 0 && (
                      <span className="text-[10px] bg-[rgba(255,255,255,0.3)] px-2 py-1 rounded-[4px] animate-pulse">
                        처리중
                      </span>
                    )}
                  </div>

                  {/* 과목 정보 */}
                  <div className="mb-3">
                    <div className="text-[10px] opacity-70 mb-1">과목명</div>
                    <div className="text-[16px] font-bold truncate">{subject.name}</div>
                  </div>

                  {/* 진행바 */}
                  <div
                    className="w-full h-[6px] bg-[rgba(255,255,255,0.3)] rounded-full mb-3"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* 하단 통계 */}
                  <div className="flex justify-between items-center">
                    <div className="text-[10px] opacity-80">
                      {subject.exam_date && (
                        <span>D-{Math.ceil((new Date(subject.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {topSubjects.length > 0 && topSubjects.length < 8 && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full h-[135px] rounded-[12px] border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="새 과목 추가"
              >
                <div className="text-center">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm">과목 추가</span>
                </div>
              </button>
            )}
          </>
        </div>
      )}
      
      {/* Subject Creation Modal */}
      <CreateSubjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubjectCreated={() => {
          setIsModalOpen(false)
          // Reload the page to show the new subject
          window.location.reload()
        }}
      />
    </div>
  )
}