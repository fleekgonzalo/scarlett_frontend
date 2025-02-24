'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useLanguageStore } from '@/stores/languageStore'
import { TablelandClient, type Song } from '@/services/tableland'
import { getIPFSUrl } from '@/lib/utils'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { AuthGuard } from '@/components/AuthGuard'
import { useXmtp } from '@/hooks/useXmtp'

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
  const { isInitialized: isXmtpInitialized, isLoading: isXmtpLoading, error: xmtpError, sendAnswer } = useXmtp()
  const [explanation, setExplanation] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [tablelandRetryCount, setTablelandRetryCount] = useState(0)
  const MAX_RETRIES = 3
  const RETRY_DELAY = 2000

  useEffect(() => {
    const fetchSongAndQuestions = async () => {
      // Don't start loading if XMTP is still initializing
      if (isXmtpLoading) {
        return
      }

      // If not initialized and we haven't exceeded retries, wait and try again
      if (!isXmtpInitialized && retryCount < MAX_RETRIES) {
        console.log(`XMTP not initialized, retrying... (${retryCount + 1}/${MAX_RETRIES})`)
        setRetryCount(prev => prev + 1)
        setTimeout(() => {
          // Force re-render to trigger another attempt
          setIsLoading(prev => !prev)
        }, RETRY_DELAY)
        return
      }

      // If we've exceeded retries and still not initialized, show error
      if (!isXmtpInitialized) {
        console.error('Failed to initialize XMTP after retries')
        setError('Failed to initialize messaging. Please refresh the page and try again.')
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Log initial state
        console.log('Starting to fetch song and questions:', {
          songId: params.id,
          isLearningChinese,
          xmtpState: {
            isInitialized: isXmtpInitialized,
            isLoading: isXmtpLoading,
            error: xmtpError,
            retryCount
          }
        })
        
        // Fetch song data with retries
        let data = null
        let tablelandError = null
        
        while (tablelandRetryCount < MAX_RETRIES) {
          try {
            const tableland = TablelandClient.getInstance()
            data = await tableland.getSong(Number(params.id))
            if (data) break
            
            console.log(`Tableland attempt ${tablelandRetryCount + 1}/${MAX_RETRIES} failed, retrying...`)
            setTablelandRetryCount(prev => prev + 1)
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          } catch (err) {
            tablelandError = err
            console.error('Tableland error:', err)
            setTablelandRetryCount(prev => prev + 1)
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          }
        }

        if (!data) {
          throw new Error(tablelandError ? `Failed to fetch song: ${tablelandError}` : 'Song not found')
        }

        console.log('Song data:', data)
        setSong(data)

        // Determine which question set to load based on learning direction
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
        } catch (parseError) {
          console.error('Error parsing questions:', parseError)
          const errorMessage = typeof parseError === 'object' && parseError !== null && 'message' in parseError
            ? parseError.message
            : 'Unknown error'
          setError(`Failed to parse questions data: ${errorMessage}`)
        }
      } catch (error) {
        console.error('Error fetching song/questions:', error)
        setError(
          error instanceof Error 
            ? error.message 
            : typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message: unknown }).message)
              : 'Failed to load content'
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchSongAndQuestions()
  }, [params.id, isLearningChinese, isXmtpLoading, isXmtpInitialized, xmtpError, retryCount])

  const handleAnswer = async (answer: string) => {
    setSelectedAnswer(answer)
    setIsAnswered(true)
    setIsValidating(true)
    setExplanation('Sending to tutor...')

    try {
      if (!isXmtpInitialized) {
        setError('Please wait for messaging to initialize')
        return
      }

      const currentQuestion = questions[currentQuestionIndex]
      const response = await sendAnswer({
        uuid: currentQuestion.uuid || `temp-${currentQuestionIndex}`,
        selectedAnswer: answer
      })

      setExplanation(response.explanation)
    } catch (err) {
      console.error('Failed to validate answer:', err)
      setError('Failed to validate answer with tutor')
      setExplanation('Could not get response from tutor')
    } finally {
      setIsValidating(false)
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
      setExplanation(null)
    }
  }

  const handleRetry = () => {
    setRetryCount(0)
    setTablelandRetryCount(0)
    setError(null)
    setIsLoading(true)
    window.location.reload()
  }

  if (isXmtpLoading || (!isXmtpInitialized && retryCount < MAX_RETRIES)) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="mb-4">Initializing messaging...</div>
            <div className="text-sm text-neutral-400">
              {retryCount > 0 ? `Retry attempt ${retryCount}/${MAX_RETRIES}...` : 'Please wait...'}
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (xmtpError || (!isXmtpInitialized && retryCount >= MAX_RETRIES)) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">
              {xmtpError ? `Failed to initialize messaging: ${String(xmtpError)}` : 
               'Failed to initialize messaging after multiple attempts'}
            </p>
            <Button 
              onClick={handleRetry}
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

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="mb-4">Loading questions...</div>
            {tablelandRetryCount > 0 && (
              <div className="text-sm text-neutral-400">
                Retrying to fetch data... ({tablelandRetryCount}/{MAX_RETRIES})
              </div>
            )}
          </div>
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
                  <div className="text-white">
                    {isValidating ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>{explanation}</span>
                      </div>
                    ) : (
                      <p>{explanation || 'Waiting for tutor response...'}</p>
                    )}
                  </div>
                  {(error || xmtpError) && (
                    <p className="text-red-400 mt-2">
                      {error || (typeof xmtpError === 'string' ? xmtpError : xmtpError?.message) || 'An error occurred'}
                    </p>
                  )}
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