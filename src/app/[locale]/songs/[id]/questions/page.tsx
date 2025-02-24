'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { TablelandClient, type Song } from '@/services/tableland'
import { useLanguageStore } from '@/stores/languageStore'
import { useXmtp } from '@/hooks/useXmtp'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import Link from 'next/link'

interface Question {
  uuid: string
  question: string
  options: {
    a: string
    b: string
    c: string
    d: string
  }
  audio_cid: string
}

interface QuestionAnswer {
  uuid: string
  selectedAnswer: string
  songId: string
}

export default function QuestionsPage() {
  const params = useParams()
  const songId = params?.id as string
  const { isLearningChinese } = useLanguageStore()
  const [song, setSong] = useState<Song | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth()
  const { isInitialized: isXmtpInitialized, isLoading: isXmtpLoading, sendAnswer } = useXmtp()

  // Show loading state while auth or XMTP is initializing
  const isInitializing = isAuthLoading || (isAuthenticated && isXmtpLoading)

  useEffect(() => {
    const fetchData = async () => {
      if (!songId) return
      
      try {
        setIsLoading(true)
        setError(null)

        // Fetch song data
        const tableland = TablelandClient.getInstance()
        const songData = await tableland.getSong(Number(songId))
        setSong(songData)

        // Only fetch questions if we're authenticated and XMTP is initialized
        if (isAuthenticated && isXmtpInitialized && songData) {
          const questionsCid = isLearningChinese ? songData.questions_cid_1 : songData.questions_cid_2
          const response = await fetch(`https://premium.aiozpin.network/ipfs/${questionsCid}`)
          
          if (!response.ok) {
            throw new Error('Failed to fetch questions')
          }
          
          const data = await response.json()
          setQuestions(data)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load content')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [songId, isLearningChinese, isAuthenticated, isXmtpInitialized])

  const handleAnswer = async (answer: string) => {
    if (isValidating || !questions[currentQuestionIndex] || !song) return

    setSelectedAnswer(answer)
    setIsValidating(true)
    setExplanation('Checking your answer...')

    try {
      const response = await sendAnswer({
        uuid: questions[currentQuestionIndex].uuid,
        selectedAnswer: answer,
        songId: song.id
      })

      setExplanation(response.explanation)

      // Wait a bit before moving to next question
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1)
          setSelectedAnswer(null)
          setExplanation(null)
        }
      }, 2000)
    } catch (err) {
      console.error('Failed to validate answer:', err)
      setError('Failed to check answer')
      setExplanation('Could not validate answer')
    } finally {
      setIsValidating(false)
    }
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loading size={32} color="#3B82F6" />
          <p className="text-neutral-400">
            {isXmtpLoading ? 'Initializing secure chat...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back button */}
          <div className="mb-8">
            <Link
              href={`/${params?.locale || 'en'}/songs/${songId}`}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              ← Back to Song
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg bg-neutral-800">
            <p className="text-lg text-white mb-4">
              Sign in to start learning with this song
            </p>
            <Button
              onClick={login}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loading size={32} color="#3B82F6" />
          <p className="text-neutral-400">Loading questions...</p>
        </div>
      </div>
    )
  }

  if (error || !song || !questions.length) {
    return (
      <div className="min-h-screen bg-neutral-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back button */}
          <div className="mb-8">
            <Link
              href={`/${params?.locale || 'en'}/songs/${songId}`}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              ← Back to Song
            </Link>
          </div>

          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error || 'No questions available'}</p>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-neutral-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-8">
          <Link
            href={`/${params?.locale || 'en'}/songs/${songId}`}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            ← Back to Song
          </Link>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-neutral-400 mb-2">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Question */}
        <div className="space-y-8">
          <div className="p-6 rounded-lg bg-neutral-800">
            <h3 className="text-xl font-medium text-white mb-6">
              {currentQuestion.question}
            </h3>
            
            <div className="space-y-4">
              {Object.entries(currentQuestion.options).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => !selectedAnswer && !isValidating && handleAnswer(key)}
                  disabled={!!selectedAnswer || isValidating}
                  className={`w-full p-4 rounded-lg text-left transition-colors ${
                    selectedAnswer === key
                      ? 'bg-blue-600 text-white'
                      : selectedAnswer
                      ? 'bg-neutral-700 text-neutral-400'
                      : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                  }`}
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
            {explanation && (
              <div className={`mt-6 p-4 rounded-lg ${
                isValidating 
                  ? 'bg-neutral-700' 
                  : selectedAnswer 
                  ? 'bg-blue-600/20 border border-blue-600' 
                  : 'bg-neutral-700'
              }`}>
                <div className="flex items-center gap-3">
                  {isValidating && <Loading size={20} color="#3B82F6" />}
                  <p className="text-white">{explanation}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 