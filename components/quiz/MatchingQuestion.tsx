'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

interface CorrectPair {
  left_index: number
  right_index: number
}

interface MatchingQuestionProps {
  question: string
  leftItems: string[]
  rightItems: string[]
  correctPairs: CorrectPair[]
  explanation: string
  sourceQuote: string
  onAnswer: (isCorrect: boolean) => void
  showResult: boolean
}

export default function MatchingQuestion({
  question,
  leftItems,
  rightItems,
  correctPairs,
  explanation,
  sourceQuote,
  onAnswer,
  showResult
}: MatchingQuestionProps) {
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [userPairs, setUserPairs] = useState<Map<number, number>>(new Map())
  const [submitted, setSubmitted] = useState(false)

  // Shuffle right items for display to make it more challenging
  const [shuffledRightItems, setShuffledRightItems] = useState<{ item: string; originalIndex: number }[]>([])

  useEffect(() => {
    const shuffled = rightItems
      .map((item, index) => ({ item, originalIndex: index }))
      .sort(() => Math.random() - 0.5)
    setShuffledRightItems(shuffled)
  }, [rightItems])

  const handleLeftClick = (index: number) => {
    if (submitted) return
    setSelectedLeft(index)
  }

  const handleRightClick = (originalIndex: number) => {
    if (submitted || selectedLeft === null) return
    
    const newPairs = new Map(userPairs)
    newPairs.set(selectedLeft, originalIndex)
    setUserPairs(newPairs)
    setSelectedLeft(null)
  }

  const handleSubmit = () => {
    if (submitted || userPairs.size !== leftItems.length) return

    const allCorrect = correctPairs.every(pair => 
      userPairs.get(pair.left_index) === pair.right_index
    )

    setSubmitted(true)
    onAnswer(allCorrect)
  }

  const isPairCorrect = (leftIndex: number) => {
    if (!submitted) return null
    const userRight = userPairs.get(leftIndex)
    const correctPair = correctPairs.find(p => p.left_index === leftIndex)
    return userRight === correctPair?.right_index
  }

  const removePair = (leftIndex: number) => {
    if (submitted) return
    const newPairs = new Map(userPairs)
    newPairs.delete(leftIndex)
    setUserPairs(newPairs)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">{question}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">왼쪽 항목</h4>
          {leftItems.map((item, index) => {
            const isSelected = selectedLeft === index
            const hasPair = userPairs.has(index)
            const isCorrect = isPairCorrect(index)
            
            return (
              <div
                key={index}
                onClick={() => !hasPair && handleLeftClick(index)}
                className={`
                  p-3 rounded-lg border-2 transition-all cursor-pointer relative
                  ${isSelected ? 'border-blue-500 bg-blue-50' : ''}
                  ${hasPair && !submitted ? 'border-purple-500 bg-purple-50' : ''}
                  ${submitted && isCorrect ? 'border-green-500 bg-green-50' : ''}
                  ${submitted && isCorrect === false ? 'border-red-500 bg-red-50' : ''}
                  ${!isSelected && !hasPair && !submitted ? 'border-gray-200 hover:border-gray-300' : ''}
                  ${submitted ? 'cursor-default' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-gray-900">{item}</span>
                  <div className="flex items-center gap-2">
                    {hasPair && !submitted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removePair(index)
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        취소
                      </button>
                    )}
                    {submitted && isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {submitted && isCorrect === false && <XCircle className="h-5 w-5 text-red-600" />}
                  </div>
                </div>
                {hasPair && (
                  <div className="mt-2 text-sm text-gray-600 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    {rightItems[userPairs.get(index)!]}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">오른쪽 항목</h4>
          {shuffledRightItems.map(({ item, originalIndex }, displayIndex) => {
            const isUsed = Array.from(userPairs.values()).includes(originalIndex)
            
            return (
              <div
                key={displayIndex}
                onClick={() => selectedLeft !== null && !isUsed && handleRightClick(originalIndex)}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${selectedLeft !== null && !isUsed && !submitted ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50' : ''}
                  ${isUsed ? 'border-gray-300 bg-gray-100 opacity-50' : 'border-gray-200'}
                  ${submitted ? 'cursor-default' : ''}
                `}
              >
                <span className={isUsed ? 'text-gray-500' : 'text-gray-900'}>{item}</span>
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={showResult || userPairs.size !== leftItems.length}
        className={`
          px-6 py-2 rounded-lg font-medium transition-all
          ${!showResult && userPairs.size === leftItems.length 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
        `}
      >
        제출
      </button>

      {showResult && (
        <div className="space-y-4">
          {submitted && !correctPairs.every(pair => userPairs.get(pair.left_index) === pair.right_index) && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">정답</h4>
              <div className="space-y-2">
                {correctPairs.map((pair, index) => (
                  <div key={index} className="flex items-center gap-2 text-gray-600">
                    <span>{leftItems[pair.left_index]}</span>
                    <ArrowRight className="h-4 w-4" />
                    <span>{rightItems[pair.right_index]}</span>
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