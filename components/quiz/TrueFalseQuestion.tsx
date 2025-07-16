'use client'

import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface TrueFalseQuestionProps {
  question: string
  correctAnswer: boolean
  explanation: string
  sourceQuote: string
  onAnswer: (isCorrect: boolean) => void
  showResult: boolean
}

export default function TrueFalseQuestion({
  question,
  correctAnswer,
  explanation,
  sourceQuote,
  onAnswer,
  showResult
}: TrueFalseQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null)

  const handleSelect = (answer: boolean) => {
    if (showResult) return
    setSelectedAnswer(answer)
    onAnswer(answer === correctAnswer)
  }

  const options = [
    { value: true, label: '참 (O)', color: 'blue' },
    { value: false, label: '거짓 (X)', color: 'red' }
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">{question}</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {options.map((option) => {
          const isSelected = selectedAnswer === option.value
          const isCorrect = option.value === correctAnswer
          const showCorrect = showResult && isCorrect
          const showIncorrect = showResult && isSelected && !isCorrect

          return (
            <button
              key={option.value.toString()}
              onClick={() => handleSelect(option.value)}
              disabled={showResult}
              className={`
                p-6 rounded-lg border-2 transition-all flex flex-col items-center justify-center space-y-2
                ${isSelected && !showResult ? `border-${option.color}-500 bg-${option.color}-50` : ''}
                ${showCorrect ? 'border-green-500 bg-green-50' : ''}
                ${showIncorrect ? 'border-red-500 bg-red-50' : ''}
                ${!isSelected && !showResult ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50' : ''}
                ${showResult ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <span className="text-3xl font-bold">
                {option.value ? 'O' : 'X'}
              </span>
              <span className="text-gray-700">{option.label}</span>
              {showCorrect && <CheckCircle className="h-6 w-6 text-green-600" />}
              {showIncorrect && <XCircle className="h-6 w-6 text-red-600" />}
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