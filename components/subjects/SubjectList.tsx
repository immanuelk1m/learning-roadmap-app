'use client'

import Link from 'next/link'
import { FolderOpen, BookOpen, Calendar, ArrowRight } from 'lucide-react'
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
  const getGrayLevel = (color: string) => {
    // Convert color to different gray levels for visual distinction
    const grayLevels = [
      'neutral-700',
      'neutral-600',
      'neutral-800',
      'neutral-500',
      'neutral-900',
      'neutral-400',
    ]
    
    const index = Math.abs(color.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % grayLevels.length
    return grayLevels[index]
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject, index) => (
        <Link
          key={subject.id}
          href={`/subjects/${subject.id}`}
          className="group block card-modern"
        >
          <div className="relative bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-card hover:shadow-card-hover border border-white/20 overflow-hidden">
            {/* Subtle background element */}
            <div className="absolute inset-0 bg-neutral-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <div className={`w-4 h-4 rounded-full bg-${getGrayLevel(subject.color)} mr-3 shadow-sm`}></div>
                    <h3 className="text-xl font-bold text-neutral-800 group-hover:text-neutral-900 transition-colors">
                      {subject.name}
                    </h3>
                  </div>
                  {subject.description && (
                    <p className="text-sm text-neutral-600 line-clamp-3 leading-relaxed">
                      {subject.description}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center group-hover:from-neutral-200 group-hover:to-neutral-300 transition-colors">
                    <BookOpen className="h-6 w-6 text-neutral-600" />
                  </div>
                  <DeleteSubjectButton 
                    subjectId={subject.id} 
                    subjectName={subject.name}
                    onDelete={onSubjectDeleted}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-200/50">
                <div className="flex items-center text-xs text-neutral-500">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>{new Date(subject.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <div className="flex items-center text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">
                  <span className="mr-1">학습하기</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

          </div>
        </Link>
      ))}
    </div>
  )
}