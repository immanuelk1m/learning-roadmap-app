'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import CreateSubjectButton from './subjects/CreateSubjectButton'

interface Subject {
  id: string
  name: string
  progress: number
  fileCount: number
  daysUntilExam: number
  details?: string
}

// Mock data
const mockSubjects: Subject[] = [
  {
    id: '1',
    name: 'Design Research1',
    progress: 60,
    fileCount: 44,
    daysUntilExam: 30,
    details: '업로드된 학습 파일: 44개\n시험까지 남은 기간: 30일'
  },
  {
    id: '2',
    name: 'Design Research 2',
    progress: 90,
    fileCount: 32,
    daysUntilExam: 45,
    details: 'detail'
  },
  {
    id: '3',
    name: 'SID_chapter',
    progress: 25,
    fileCount: 12,
    daysUntilExam: 20,
    details: 'detail'
  },
  {
    id: '4',
    name: 'DS',
    progress: 97,
    fileCount: 58,
    daysUntilExam: 15,
    details: 'detail'
  }
]

export default function SubjectProgress() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📈 Completion Progress</h2>
        <CreateSubjectButton />
      </div>

      {/* 과목별 진행률 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {mockSubjects.map((subject) => (
          <Link
            key={subject.id}
            href={`/subjects/${subject.id}`}
            className="block group"
          >
            <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {subject.name}
                  </h3>
                </div>
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="42%"
                      stroke="#e5e7eb"
                      strokeWidth="8%"
                      fill="none"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="42%"
                      stroke={subject.progress >= 80 ? '#10b981' : subject.progress >= 50 ? '#3b82f6' : '#ef4444'}
                      strokeWidth="8%"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 42}`}
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - subject.progress / 100)}`}
                      className="transition-all duration-700 ease-out"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-700">{subject.progress}%</span>
                  </div>
                </div>
              </div>

              {subject.name === 'Design Research1' && (
                <div className="mt-3">
                  <div className="text-sm text-gray-600 space-y-1 mb-3">
                    <p>업로드된 학습 파일: {subject.fileCount}개</p>
                    <p>시험까지 남은 기간: {subject.daysUntilExam}일</p>
                  </div>
                  <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md">
                    바로 학습하러 가기
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

              {subject.name !== 'Design Research1' && (
                <div className="text-sm text-gray-500 mt-2">
                  {subject.details}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}