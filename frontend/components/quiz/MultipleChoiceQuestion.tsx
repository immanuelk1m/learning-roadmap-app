'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface MultipleChoiceQuestionProps {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
  sourceQuote: string
  onAnswer: (isCorrect: boolean) => void
  showResult: boolean
}

export default function MultipleChoiceQuestion({
  question,
  options,
  correctAnswer,
  explanation,
  sourceQuote,
  onAnswer,
  showResult
}: MultipleChoiceQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  const handleSelect = (answer: string) => {
    if (showResult) return
    setSelectedAnswer(answer)
    onAnswer(answer === correctAnswer)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">{question}</h3>
      
      <div className="space-y-3">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === option
          const isCorrect = option === correctAnswer
          const showCorrect = showResult && isCorrect
          const showIncorrect = showResult && isSelected && !isCorrect

          return (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={showResult}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all
                ${isSelected && !showResult ? 'border-blue-500 bg-blue-50' : ''}
                ${showCorrect ? 'border-green-500 bg-green-50' : ''}
                ${showIncorrect ? 'border-red-500 bg-red-50' : ''}
                ${!isSelected && !showResult ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50' : ''}
                ${showResult ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-900">{option}</span>
                {showCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                {showIncorrect && <XCircle className="h-5 w-5 text-red-600" />}
              </div>
            </button>
          )
        })}
      </div>

      {showResult && (
        <div className="space-y-4">
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