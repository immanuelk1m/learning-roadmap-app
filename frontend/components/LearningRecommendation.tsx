'use client'

import { AlertCircle, TrendingUp } from 'lucide-react'

export default function LearningRecommendation() {
  // Mock recommendation based on lowest progress subject (SID_chapter at 25%)
  const recommendation = "Design Research 수업에서 페르소나 생성 및 인사이트 도출 과정의 방법론 추가 학습 필요."

  return (
    <div className="h-full p-8">
      <div className="flex items-start space-x-4">
        <div className="bg-orange-100 rounded-full p-3">
          <TrendingUp className="w-6 h-6 text-orange-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            💡 부족하고 당장 학습해야 하는 부분
          </h3>
          <p className="text-gray-700 leading-relaxed">
            {recommendation}
          </p>
          <p className="text-sm text-gray-500 mt-3">
            기준: 가장 진행률이 낮은 PDF를 대상으로 문구 작성
          </p>
        </div>
      </div>
    </div>
  )
}