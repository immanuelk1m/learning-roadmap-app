'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle, AlertTriangle, FileText, Layers, Clock } from 'lucide-react'

interface ProgressData {
  totalChunks: number
  completedChunks: number
  currentChunk: number
  progress: number
  status: 'not_started' | 'starting' | 'processing' | 'completed' | 'error'
  stage: string
  message: string
  errors: string[]
  timestamp?: string
}

interface StudyGuideProgressTrackerProps {
  userId: string
  documentId: string
  isGenerating: boolean
  onComplete: () => void
  onError: (error: string) => void
}

export default function StudyGuideProgressTracker({
  userId,
  documentId,
  isGenerating,
  onComplete,
  onError
}: StudyGuideProgressTrackerProps) {
  const [progress, setProgress] = useState<ProgressData>({
    totalChunks: 0,
    completedChunks: 0,
    currentChunk: 0,
    progress: 0,
    status: 'not_started',
    stage: '',
    message: '',
    errors: []
  })

  const [startTime, setStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isGenerating) {
      setStartTime(null)
      setElapsedTime(0)
      return
    }

    setStartTime(new Date())
    
    // Poll for progress updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/study-guide/progress?documentId=${documentId}&userId=${userId}`
        )
        
        if (response.ok) {
          const data = await response.json()
          const newProgress = data.progress
          
          setProgress(newProgress)
          
          // Handle completion
          if (newProgress.status === 'completed') {
            clearInterval(pollInterval)
            onComplete()
          } else if (newProgress.status === 'error') {
            clearInterval(pollInterval)
            onError(newProgress.errors.join(', ') || '알 수 없는 오류가 발생했습니다')
          }
        }
      } catch (error) {
        console.error('Failed to poll progress:', error)
      }
    }, 1000) // Poll every second

    return () => clearInterval(pollInterval)
  }, [isGenerating, documentId, userId, onComplete, onError])

  // Update elapsed time
  useEffect(() => {
    if (!startTime || !isGenerating) return

    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime.getTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime, isGenerating])

  const formatElapsedTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes > 0) {
      return `${minutes}분 ${remainingSeconds}초`
    }
    return `${remainingSeconds}초`
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'not_started':
      case 'starting':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      case 'processing':
      case 'starting':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getProgressBarColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'processing':
      case 'starting':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStageMessage = () => {
    switch (progress.stage) {
      case 'initializing':
        return '초기화 중...'
      case 'uploading':
        return 'AI 서버에 업로드 중...'
      case 'preparing_chunks':
        return '병렬 처리를 위한 청크 준비 중...'
      case 'processing_chunks':
        return '페이지별 해설 생성 중...'
      case 'saving':
        return '데이터베이스에 저장 중...'
      case 'completed':
        return '해설집 생성 완료!'
      case 'failed':
      case 'upload_failed':
      case 'save_failed':
        return '처리 중 오류 발생'
      default:
        return progress.message || '처리 중...'
    }
  }

  if (!isGenerating && progress.status === 'not_started') {
    return null
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
              개인 맞춤 해설집 생성 중
            </h3>
            <p className="text-sm text-gray-600">
              {getStageMessage()}
            </p>
          </div>
        </div>
        
        {startTime && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{formatElapsedTime(elapsedTime)}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>진행률</span>
          <span>{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* Chunk Progress (for parallel processing) */}
      {progress.totalChunks > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">병렬 처리 진행 상황</span>
          </div>
          <div className="flex justify-between text-sm text-blue-700 mb-1">
            <span>청크 {progress.completedChunks}/{progress.totalChunks} 완료</span>
            <span>{Math.round((progress.completedChunks / progress.totalChunks) * 100)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full bg-blue-500 transition-all duration-300 animate-pulse"
              style={{ width: `${(progress.completedChunks / progress.totalChunks) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-blue-600 mt-2">
            <span>각 청크는 약 20페이지씩 동시에 처리됩니다</span>
            {progress.completedChunks > 0 && progress.completedChunks < progress.totalChunks && (
              <span className="font-medium">
                {progress.totalChunks - progress.completedChunks}개 남음
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error Messages */}
      {progress.errors.length > 0 && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">오류 발생</p>
              <ul className="text-xs text-red-700 space-y-1">
                {progress.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className="text-sm text-gray-600">
        <p>{progress.message}</p>
        {progress.timestamp && (
          <p className="text-xs text-gray-500 mt-1">
            마지막 업데이트: {new Date(progress.timestamp).toLocaleTimeString('ko-KR')}
          </p>
        )}
      </div>

      {/* Estimated Time Remaining */}
      {progress.status === 'processing' && progress.totalChunks > 0 && progress.completedChunks > 0 && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <p>
            예상 완료 시간: 약 {Math.ceil(
              (elapsedTime / progress.completedChunks) * 
              (progress.totalChunks - progress.completedChunks) / 1000 / 60
            )}분 후
          </p>
        </div>
      )}
    </div>
  )
}