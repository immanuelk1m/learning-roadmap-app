'use client'

import { useState, useMemo } from 'react'
import { SubjectWithProgress } from '@/types/home'
import { useRouter } from 'next/navigation'

interface SubjectProgressListProps {
  subjects: SubjectWithProgress[]
}

type SortType = 'progress' | 'recent'

export default function SubjectProgressList({ subjects }: SubjectProgressListProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<SortType>('progress')
  
  const sortedSubjects = useMemo(() => {
    const sorted = [...subjects]
    if (sortBy === 'progress') {
      // 낮은 진행률 순
      return sorted.sort((a, b) => a.progress - b.progress)
    } else {
      // 최신순
      return sorted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
  }, [subjects, sortBy])
  
  const getProgressColor = (progress: number) => {
    if (progress === 100) return '#2ce477'
    if (progress >= 70) return '#44aa44'
    if (progress >= 40) return '#ff8844'
    return '#ff4444'
  }
  
  const getStatusEmoji = (progress: number) => {
    if (progress === 100) return '✅'
    if (progress >= 70) return '🔥'
    if (progress >= 40) return '📚'
    return '🚀'
  }
  
  return (
    <div className="bg-white rounded-[5px] shadow-lg p-5 flex-1 flex flex-col min-h-0">
      <div className="flex justify-between items-start mb-4 flex-shrink-0">
        <div>
          <h2 className="text-[17px] font-bold">자료별 진행도</h2>
          <p className="text-[13px] text-gray-600">
            {sortBy === 'progress' ? '진행률이 낮은 순으로 정렬되어있습니다.' : '최신순으로 정렬되어있습니다.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setSortBy('progress')}
            className={`text-[14px] transition-colors ${
              sortBy === 'progress' ? 'font-bold text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-pressed={sortBy === 'progress'}
          >
            낮은 진행률
          </button>
          <button 
            onClick={() => setSortBy('recent')}
            className={`text-[14px] transition-colors ${
              sortBy === 'recent' ? 'font-bold text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-pressed={sortBy === 'recent'}
          >
            최신순
          </button>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
        {sortedSubjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">아직 학습 자료가 없습니다</p>
            <button 
              onClick={() => router.push('/subjects')}
              className="text-primary hover:underline"
            >
              과목 추가하기
            </button>
          </div>
        ) : (
          sortedSubjects.map((subject) => (
            <div 
              key={subject.id} 
              className="flex items-center gap-3 mb-3 group"
            >
              <button
                onClick={() => router.push(`/subjects/${subject.id}`)}
                className="flex-1 bg-[var(--color-primary-dark)] rounded-[10px] h-[60px] flex items-center px-4 relative hover:shadow-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`${subject.name} 과목, 진행도 ${subject.progress}%, 전체 ${subject.node_count}개 중 ${subject.completed_nodes}개 완료`}
              >
                <span className="text-white text-[13px] font-semibold flex-1 text-left">
                  {subject.name}
                </span>
                
                {/* 진행도 원 */}
                <div 
                  className="relative w-[45px] h-[45px]"
                  role="progressbar"
                  aria-valuenow={subject.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`진행도 ${subject.progress}%`}
                >
                  <svg viewBox="0 0 45 45" className="transform -rotate-90">
                    <circle 
                      cx="22.5" 
                      cy="22.5" 
                      r="18" 
                      fill="none" 
                      stroke="rgba(255,255,255,0.2)" 
                      strokeWidth="3"
                    />
                    <circle 
                      cx="22.5" 
                      cy="22.5" 
                      r="18" 
                      fill="none" 
                      stroke={getProgressColor(subject.progress)} 
                      strokeWidth="3" 
                      strokeDasharray={`${2 * Math.PI * 18 * subject.progress / 100} ${2 * Math.PI * 18}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-[11px]">
                      {subject.progress}%
                    </span>
                  </div>
                </div>
              </button>
              
              {/* 상태 배지 */}
              <div 
                className="w-[55px] h-[60px] rounded-[10px] flex items-center justify-center text-xl"
                style={{ backgroundColor: subject.color || 'var(--color-primary-dark)' }}
                title={`${subject.completed_nodes}/${subject.node_count} 완료`}
              >
                {getStatusEmoji(subject.progress)}
              </div>
            </div>
          ))
        )}
      </div>
      
      {subjects.some(s => s.documents_processing > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          문서 처리 중...
        </div>
      )}
    </div>
  )
}