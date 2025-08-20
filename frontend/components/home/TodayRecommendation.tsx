'use client'

import { SubjectWithProgress } from '@/types/home'
import { useRouter } from 'next/navigation'

interface TodayRecommendationProps {
  subjects: SubjectWithProgress[]
}

export default function TodayRecommendation({ subjects }: TodayRecommendationProps) {
  const router = useRouter()
  
  // 추천 로직: 진행도가 가장 낮은 과목 또는 가장 최근에 학습한 과목
  const getRecommendation = () => {
    if (!subjects || subjects.length === 0) return null
    
    // 진행도가 100% 미만인 과목들
    const incompleteSubjects = subjects.filter(s => s.progress < 100)
    
    if (incompleteSubjects.length === 0) {
      // 모든 과목이 완료된 경우 가장 최근 과목
      return subjects[0]
    }
    
    // 진행도가 가장 낮은 과목
    return incompleteSubjects.reduce((prev, curr) => 
      prev.progress < curr.progress ? prev : curr
    )
  }
  
  const recommendation = getRecommendation()
  
  if (!recommendation) {
    return (
      <div className="bg-gray-100 h-[140px] rounded-lg p-5 mb-5 flex items-center justify-center">
        <p className="text-gray-500">학습할 과목을 추가해주세요</p>
      </div>
    )
  }
  
  return (
    <div className="bg-gray-100 h-[140px] rounded-lg p-5 mb-5">
      <div className="flex items-center gap-4 h-full">
        <img 
          src="/profile.png" 
          alt="추천 과목" 
          className="w-[85px] h-[85px] object-cover rounded-[5px]"
        />
        <div className="flex-1">
          <p className="text-[15px] mb-2 text-gray-700">오늘은</p>
          <button
            onClick={() => router.push(`/subjects/${recommendation.id}`)}
            className="bg-white px-4 py-2 rounded-[8px] shadow-sm inline-block hover:shadow-md transition-shadow focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={`${recommendation.name} 과목으로 이동, 현재 진행도 ${recommendation.progress}%`}
          >
            <span className="font-bold text-[14px]">{recommendation.name}</span>
          </button>
          <p className="text-[15px] mt-2 text-gray-700">
            {recommendation.progress === 0 
              ? '시작해보는건 어때요?' 
              : recommendation.progress < 50 
              ? '이어가보는건 어때요?'
              : recommendation.progress < 100
              ? '마무리해보는건 어때요?'
              : '복습해보는건 어때요?'}
          </p>
        </div>
      </div>
    </div>
  )
}