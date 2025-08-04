'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'

interface ShortAnswerQuestionProps {
  question: string
  acceptableAnswers: string[]
  hint?: string
  explanation: string
  sourceQuote: string
  onAnswer: (isCorrect: boolean) => void
  showResult: boolean
}

export default function ShortAnswerQuestion({
  question,
  acceptableAnswers,
  hint,
  explanation,
  sourceQuote,
  onAnswer,
  showResult
}: ShortAnswerQuestionProps) {
  const [userAnswer, setUserAnswer] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (submitted || !userAnswer.trim()) return
    
    const isCorrect = acceptableAnswers.some(answer => 
      userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()
    )
    
    setSubmitted(true)
    onAnswer(isCorrect)
  }

  const isCorrect = submitted && acceptableAnswers.some(answer => 
    userAnswer.toLowerCase().trim() === answer.toLowerCase().trim()
  )

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">{question}</h3>
      
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            disabled={showResult}
            placeholder="답을 입력하세요..."
            className={`
              w-full px-4 py-3 rounded-lg border-2 transition-all
              ${!submitted ? 'border-gray-300 focus:border-blue-500' : ''}
              ${submitted && isCorrect ? 'border-green-500 bg-green-50' : ''}
              ${submitted && !isCorrect ? 'border-red-500 bg-red-50' : ''}
              ${showResult ? 'cursor-not-allowed bg-gray-50' : ''}
            `}
          />
          {submitted && isCorrect && (
            <CheckCircle className="absolute right-3 top-3.5 h-5 w-5 text-green-600" />
          )}
          {submitted && !isCorrect && (
            <XCircle className="absolute right-3 top-3.5 h-5 w-5 text-red-600" />
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={showResult || !userAnswer.trim()}
            className={`
              px-6 py-2 rounded-lg font-medium transition-all
              ${!showResult && userAnswer.trim() 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
            `}
          >
            제출
          </button>

          {hint && !submitted && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
              힌트 {showHint ? '숨기기' : '보기'}
            </button>
          )}
        </div>

        {showHint && !submitted && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">💡 {hint}</p>
          </div>
        )}
      </div>

      {showResult && (
        <div className="space-y-4">
          {!isCorrect && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">정답</h4>
              <div className="space-y-1">
                {acceptableAnswers.map((answer, index) => (
                  <p key={index} className="text-gray-600">
                    {index === 0 ? '• ' : '또는 • '}{answer}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">해설</h4>
            <p className="text-blue-800">{explanation}</p>
          </div>
          
          {sourceQuote && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">출처</h4>
              <p className="text-gray-600 italic">"{sourceQuote}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}