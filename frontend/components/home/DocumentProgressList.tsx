'use client'

import { useState, useMemo } from 'react'
import { DocumentWithProgress } from '@/types/home'
import { useRouter } from 'next/navigation'

interface DocumentProgressListProps {
  documents: DocumentWithProgress[]
}

type SortType = 'progress' | 'recent'

export default function DocumentProgressList({ documents }: DocumentProgressListProps) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<SortType>('progress')
  
  const sortedDocuments = useMemo(() => {
    const sorted = [...documents]
    if (sortBy === 'progress') {
      // 낮은 진행률 순
      return sorted.sort((a, b) => a.progress - b.progress)
    } else {
      // 최신순
      return sorted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
  }, [documents, sortBy])
  
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
  
  // 파일명에서 확장자 제거 및 간략화
  const formatDocumentTitle = (title: string) => {
    // 확장자 제거
    const nameWithoutExt = title.replace(/\.[^/.]+$/, '')
    // 너무 긴 경우 축약
    if (nameWithoutExt.length > 20) {
      return nameWithoutExt.substring(0, 17) + '...'
    }
    return nameWithoutExt
  }
  
  return (
    <div className="bg-white rounded-[5px] shadow-lg px-5 py-[20px] flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      <div className="flex justify-between items-start mb-4 flex-shrink-0 min-w-0">
        <div>
          <h2 className="text-[17px] font-bold">자료별 진행도</h2>
          <p className="text-[13px] text-gray-600">
            {sortBy === 'progress' ? '진행률이 낮은 순으로 정렬되어있습니다.' : '최신순으로 정렬되어있습니다.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setSortBy('progress')}
        className={`text-[14px] transition-colors whitespace-nowrap ${
              sortBy === 'progress' ? 'font-bold text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-pressed={sortBy === 'progress'}
          >
            낮은 진행률
          </button>
          <button 
            onClick={() => setSortBy('recent')}
        className={`text-[14px] transition-colors whitespace-nowrap ${
              sortBy === 'recent' ? 'font-bold text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-pressed={sortBy === 'recent'}
          >
            최신순
          </button>
        </div>
      </div>

      <div 
        className="border-t border-gray-200 pt-3 overflow-y-auto flex-1 pr-2 custom-scrollbar min-h-0"
        style={{ scrollbarGutter: 'stable both-edges' }}
      >
        {sortedDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">아직 업로드된 자료가 없습니다</p>
            <button 
              onClick={() => router.push('/subjects')}
              className="text-primary hover:underline"
            >
              자료 업로드하기
            </button>
          </div>
        ) : (
          sortedDocuments.map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center gap-3 mb-3 group"
            >
              <button
                onClick={() => router.push(`/subjects/${doc.subject_id}/study?document=${doc.id}`)}
                className="flex-1 bg-[var(--color-primary-dark)] rounded-[10px] h-[60px] flex items-center px-4 relative hover:shadow-md transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label={`${doc.title} 문서, ${doc.subject_name} 과목, 진행도 ${doc.progress}%, 전체 ${doc.node_count}개 중 ${doc.completed_nodes}개 완료`}
              >
                <div className="flex-1 text-left">
                  <span className="text-white text-[13px] font-semibold block">
                    {formatDocumentTitle(doc.title)}
                  </span>
                  <span className="text-white text-[10px] opacity-70">
                    {doc.subject_name} {doc.page_count ? `• ${doc.page_count}페이지` : ''}
                  </span>
                </div>
                
                {/* 진행도 원 */}
                <div 
                  className="relative w-[45px] h-[45px]"
                  role="progressbar"
                  aria-valuenow={doc.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`진행도 ${doc.progress}%`}
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
                      stroke={getProgressColor(doc.progress)} 
                      strokeWidth="3" 
                      strokeDasharray={`${2 * Math.PI * 18 * doc.progress / 100} ${2 * Math.PI * 18}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-[11px]">
                      {doc.progress}%
                    </span>
                  </div>
                </div>
              </button>
              
              {/* 과목 색상 배지 */}
              <div 
                className="w-[55px] h-[60px] rounded-[10px] flex flex-col items-center justify-center text-xs"
                style={{ backgroundColor: doc.subject_color || 'var(--color-primary-dark)' }}
                title={`${doc.completed_nodes}/${doc.node_count} 완료`}
              >
                <span className="text-2xl mb-1">{getStatusEmoji(doc.progress)}</span>
                <span className="text-white text-[9px] font-semibold">
                  {doc.completed_nodes}/{doc.node_count}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}