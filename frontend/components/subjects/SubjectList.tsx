'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import DeleteSubjectButton from './DeleteSubjectButton'

interface Subject {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
}

interface SubjectListProps {
  subjects: Subject[]
  onSubjectDeleted?: () => void
}

export default function SubjectList({ subjects, onSubjectDeleted }: SubjectListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject, index) => {
        // Define gradient colors based on subject color or use defaults
        const gradientColors = subject.color === '#737373' 
          ? index % 3 === 0 
            ? ['#4B9BFF', '#3A8FFF'] // Blue gradient
            : index % 3 === 1
            ? ['#FF6B6B', '#FF5555'] // Red gradient  
            : ['#22C55E', '#16A34A'] // Green gradient
          : [subject.color, subject.color] // Use subject's own color

        return (
          <Link
            key={subject.id}
            href={`/subjects/${subject.id}`}
            className="block"
          >
            <div 
              className="relative h-[200px] rounded-[12px] p-5 text-white cursor-pointer transform transition-transform hover:scale-105 shadow-lg"
              style={{
                background: `linear-gradient(to bottom, ${gradientColors[0]}, ${gradientColors[1]})`
              }}
            >
              {/* Header with delete button */}
              <div className="flex justify-between items-start mb-4">
                <div className="bg-[rgba(255,255,255,0.2)] rounded-[10px] p-3">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div onClick={(e) => e.preventDefault()}>
                  <DeleteSubjectButton 
                    subjectId={subject.id} 
                    subjectName={subject.name}
                    onDelete={onSubjectDeleted}
                  />
                </div>
              </div>
              
              {/* Subject Info */}
              <div className="flex flex-col h-[calc(100%-80px)] justify-between">
                <div>
                  <h3 className="text-[18px] font-bold mb-2 truncate">
                    {subject.name}
                  </h3>
                  {subject.description && (
                    <p className="text-[13px] opacity-90 line-clamp-2">
                      {subject.description}
                    </p>
                  )}
                </div>
                
                {/* Footer */}
                <div className="flex justify-between items-center">
                  <span className="text-[11px] opacity-75">
                    {new Date(subject.created_at).toLocaleDateString('ko-KR')}
                  </span>
                  <span className="text-[13px] font-medium">
                    학습 시작 →
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}