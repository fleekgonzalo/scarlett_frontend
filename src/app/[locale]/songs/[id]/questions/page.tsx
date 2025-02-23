'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useLanguageStore } from '@/stores/languageStore'
import { TablelandClient, type Song } from '@/services/tableland'
import { getIPFSUrl } from '@/lib/utils'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { AuthGuard } from '@/components/AuthGuard'

interface Option {
  a: string
  b: string
  c: string
  d: string
}

interface Question {
  uuid?: string
  question: string
  options: Option
  answer: string
  explanation: string
  type?: 'multiple_choice' | 'fill_in_blank' // Extensible for future types
}

interface QuestionSet {
  questions: Question[]
  metadata?: {
    difficulty: string
    targetLanguage: string
    sourceLanguage: string
  }
}

export default function QuestionsPage({ params: paramsPromise }: { params: Promise<{ id: string, locale: string }> }) {
  const params = use(paramsPromise)
  const [song, setSong] = useState<Song | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentLocale, isLearningChinese } = useLanguageStore()

  useEffect(() => {
    const fetchSongAndQuestions = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch song data
        const tableland = TablelandClient.getInstance()
        const data = await tableland.getSong(Number(params.id))
        console.log('Song data:', data)
        setSong(data)

        if (!data) {
          setError('Song not found')
          return
        }

        // Determine which question set to load based on learning direction
        // If language_1 is "en", then:
        // - questions_cid_1 is for Chinese speakers learning English
        // - questions_cid_2 is for English speakers learning Chinese
        const questionsCid = isLearningChinese ? data.questions_cid_1 : data.questions_cid_2
        console.log('Selected questions CID:', questionsCid, { isLearningChinese })
        
        if (!questionsCid) {
          setError('No questions available for this song')
          return
        }

        // Fetch questions from IPFS
        console.log('Fetching questions from IPFS:', questionsCid)
        const response = await fetch(getIPFSUrl(questionsCid))
        console.log('Questions response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch questions: ${response.status}`)
        }
        
        const questionsText = await response.text()
        console.log('Raw questions response:', questionsText)
        
        try {
          const questionsData = JSON.parse(questionsText)
          console.log('Parsed questions data:', questionsData)
          
          // Check if questions is an array
          if (!Array.isArray(questionsData)) {
            console.error('Questions data is not an array:', questionsData)
            throw new Error('Invalid questions format: expected an array')
          }
          
          // Map questions to add UUIDs if they don't exist
          const questionsWithIds = questionsData.map((q: Question, i: number) => ({
            ...q,
            uuid: q.uuid || `temp-${i}` // Use temporary UUIDs for now
          }))
          
          console.log('Processed questions:', questionsWithIds)
          setQuestions(questionsWithIds)
        } catch (parseError: unknown) {
          console.error('Error parsing questions:', parseError)
          setError(`Failed to parse questions data: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Error fetching song/questions:', error)
        setError('Failed to load content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSongAndQuestions()
  }, [params.id, isLearningChinese])

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer)
    setIsAnswered(true)
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
    }
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
          <div className="text-white">Loading questions...</div>
        </div>
      </AuthGuard>
    )
  }

  if (error || !song || questions.length === 0) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error || 'No questions available'}</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="ghost"
              className="text-white hover:bg-neutral-800"
            >
              {currentLocale === 'en' ? 'Try Again' : '重试'}
            </Button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-neutral-900 flex flex-col">
        <BackButton />
        
        <div className="flex-1 p-6 pt-20">
          <div className="max-w-2xl mx-auto">
            {/* Progress indicator */}
            <div className="mb-8">
              <div className="flex justify-between items-center text-white mb-2">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{Math.round((currentQuestionIndex + 1) / questions.length * 100)}%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="space-y-8">
              <h2 className="text-xl text-white">{currentQuestion.question}</h2>
              
              {/* Options */}
              <div className="space-y-4">
                {Object.entries(currentQuestion.options).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => !isAnswered && handleAnswer(key)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      isAnswered
                        ? key === currentQuestion.answer
                          ? 'bg-green-500/20 border-green-500 text-white'
                          : key === selectedAnswer
                          ? 'bg-red-500/20 border-red-500 text-white'
                          : 'bg-neutral-800/50 border-neutral-700 text-neutral-400'
                        : selectedAnswer === key
                        ? 'bg-blue-500/20 border-blue-500 text-white'
                        : 'bg-neutral-800 border-neutral-700 text-white hover:border-blue-500'
                    }`}
                    disabled={isAnswered}
                  >
                    <div className="flex items-center">
                      <span className="w-8 h-8 rounded-full border border-current flex items-center justify-center mr-3">
                        {key.toUpperCase()}
                      </span>
                      {value}
                    </div>
                  </button>
                ))}
              </div>

              {/* Explanation */}
              {isAnswered && (
                <div className={`p-4 rounded-lg ${
                  selectedAnswer === currentQuestion.answer
                    ? 'bg-green-500/20 border border-green-500'
                    : 'bg-red-500/20 border border-red-500'
                }`}>
                  <p className="text-white">{currentQuestion.explanation}</p>
                </div>
              )}

              {/* Next button */}
              {isAnswered && currentQuestionIndex < questions.length - 1 && (
                <Button
                  onClick={handleNext}
                  className="w-full"
                >
                  Next Question
                </Button>
              )}

              {/* Complete button */}
              {isAnswered && currentQuestionIndex === questions.length - 1 && (
                <Button
                  onClick={() => window.location.href = `/${currentLocale}/songs/${params.id}/questions/complete`}
                  className="w-full"
                >
                  Complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
} 