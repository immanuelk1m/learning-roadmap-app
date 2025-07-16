'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

interface Blank {
  position: number
  answer: string
  alternatives?: string[]
}

interface FillInTheBlankQuestionProps {
  question: string
  template: string
  blanks: Blank[]
  explanation: string
  sourceQuote: string
  onAnswer: (isCorrect: boolean) => void
  showResult: boolean
}

export default function FillInTheBlankQuestion({
  question,
  template,
  blanks,
  explanation,
  sourceQuote,
  onAnswer,
  showResult
}: FillInTheBlankQuestionProps) {
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({})
  const [submitted, setSubmitted] = useState(false)

  // Initialize user answers
  useEffect(() => {
    const initialAnswers: { [key: number]: string } = {}
    blanks.forEach(blank => {
      initialAnswers[blank.position] = ''
    })
    setUserAnswers(initialAnswers)
  }, [blanks])

  const handleInputChange = (position: number, value: string) => {
    if (submitted) return
    setUserAnswers(prev => ({ ...prev, [position]: value }))
  }

  const handleSubmit = () => {
    if (submitted) return
    
    // Check if all blanks are filled
    const allFilled = blanks.every(blank => userAnswers[blank.position]?.trim())
    if (!allFilled) return

    // Check if all answers are correct
    const allCorrect = blanks.every(blank => {
      const userAnswer = userAnswers[blank.position].toLowerCase().trim()
      const correctAnswers = [blank.answer, ...(blank.alternatives || [])].map(a => a.toLowerCase().trim())
      return correctAnswers.includes(userAnswer)
    })

    setSubmitted(true)
    onAnswer(allCorrect)
  }

  const renderTemplateWithBlanks = () => {
    const parts = template.split('___')
    const elements: React.ReactElement[] = []

    parts.forEach((part, index) => {
      elements.push(<span key={`text-${index}`}>{part}</span>)
      
      if (index < blanks.length) {
        const blank = blanks[index]
        const userAnswer = userAnswers[blank.position] || ''
        const isCorrect = submitted && [blank.answer, ...(blank.alternatives || [])]
          .map(a => a.toLowerCase().trim())
          .includes(userAnswer.toLowerCase().trim())

        elements.push(
          <span key={`input-${index}`} className="inline-block mx-1">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => handleInputChange(blank.position, e.target.value)}
              disabled={showResult}
              className={`
                inline-block px-3 py-1 rounded border-b-2 min-w-[100px] text-center transition-all
                ${!submitted ? 'border-gray-400 focus:border-blue-500' : ''}
                ${submitted && isCorrect ? 'border-green-500 bg-green-50 text-green-800' : ''}
                ${submitted && !isCorrect ? 'border-red-500 bg-red-50 text-red-800' : ''}
                ${showResult ? 'cursor-not-allowed' : ''}
              `}
              placeholder="___"
            />
            {submitted && isCorrect && <CheckCircle className="inline h-4 w-4 ml-1 text-green-600" />}
            {submitted && !isCorrect && <XCircle className="inline h-4 w-4 ml-1 text-red-600" />}
          </span>
        )
      }
    })

    return elements
  }

  const allFilled = blanks.every(blank => userAnswers[blank.position]?.trim())

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">{question}</h3>
      
      <div className="p-4 bg-gray-50 rounded-lg text-lg leading-relaxed">
        {renderTemplateWithBlanks()}
      </div>

      <button
        onClick={handleSubmit}
        disabled={showResult || !allFilled}
        className={`
          px-6 py-2 rounded-lg font-medium transition-all
          ${!showResult && allFilled 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
        `}
      >
        제출
      </button>

      {showResult && (
        <div className="space-y-4">
          {submitted && blanks.some(blank => {
            const userAnswer = userAnswers[blank.position].toLowerCase().trim()
            const correctAnswers = [blank.answer, ...(blank.alternatives || [])].map(a => a.toLowerCase().trim())
            return !correctAnswers.includes(userAnswer)
          }) && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">정답</h4>
              <div className="space-y-2">
                {blanks.map((blank, index) => (
                  <div key={index}>
                    <span className="text-gray-600">빈칸 {index + 1}: </span>
                    <span className="font-medium text-gray-800">{blank.answer}</span>
                    {blank.alternatives && blank.alternatives.length > 0 && (
                      <span className="text-gray-600"> (또는 {blank.alternatives.join(', ')})</span>
                    )}
                  </div>
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