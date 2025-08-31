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
    <div className="h-full bg-white rounded-[5px] shadow-lg p-5 flex flex-col min-h-0 overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <h2 className="text-[15px] font-bold">My Course</h2>
          <p className="text-[13px] text-gray-600">
            {topSubjects.length > 0 
              ? '진행 중인 과목들입니다.' 
              : '새로운 과목을 추가해보세요.'}
          </p>
        </div>
      </div>

      {/* 카드 컨테이너 - 4x2 가시영역, 초과 시 내부 스크롤 */}
      {topSubjects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-sm mb-2">과목이 없습니다</p>
            <p className="text-xs text-gray-400">과목을 생성해주세요</p>
          </div>
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
                    <span className="text-[11px] bg-[rgba(255,255,255,0.2)] px-2 py-1 rounded-[4px]">
                      {statusLabel}
                    </span>
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
                    <div className="flex gap-2 text-[10px]">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-1a1 1 0 100-2h1a4 4 0 014 4v6a4 4 0 01-4 4H6a4 4 0 01-4-4V7a4 4 0 014-4z" clipRule="evenodd" />
                        </svg>
                        <span>{subject.total_documents}개 문서</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{subject.incomplete_nodes}개 미완료</span>
                      </div>
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