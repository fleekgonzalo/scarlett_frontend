'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { TablelandClient, type Song } from '@/services/tableland'
import { useLanguageStore } from '@/stores/languageStore'
import { useXmtp } from '@/hooks/useXmtp'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import Link from 'next/link'
import Image from 'next/image'
import { Pause, Play, ChevronRight, X } from 'lucide-react'
import { MultipleChoiceOption } from '@/components/MultipleChoiceOption'

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
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [isAudioFinished, setIsAudioFinished] = useState(false)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const [isAudioLoading, setIsAudioLoading] = useState(false)
  
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth()
  const { isInitialized: isXmtpInitialized, isLoading: isXmtpLoading, sendAnswer } = useXmtp()

  // Show loading state while auth or XMTP is initializing
  const isInitializing = isAuthLoading || (isAuthenticated && isXmtpLoading)

  // Debug state changes
  useEffect(() => {
    console.log('State updated:', { 
      isValidating, 
      selectedAnswer, 
      explanation,
      currentQuestionIndex
    })
  }, [isValidating, selectedAnswer, explanation, currentQuestionIndex])

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

  // Play audio when audioSrc changes
  useEffect(() => {
    if (!audioSrc) {
      setIsAudioPlaying(false);
      setIsAudioFinished(false);
      setIsAudioLoading(false);
      return;
    }
    
    console.log('Playing audio:', audioSrc);
    setIsAudioLoading(true);
    
    // Track any created blob URLs so we can clean them up
    let blobUrl: string | null = null;
    let audioElement: HTMLAudioElement | null = null;
    
    try {
      // Check if this is a local file or external URL
      const isExternalUrl = audioSrc.startsWith('http');
      
      if (isExternalUrl) {
        // For external URLs (IPFS), we need to fetch the audio and play it as a blob
        console.log('Fetching external audio file');
        
        // Create an AbortController to cancel the fetch if needed
        const controller = new AbortController();
        const signal = controller.signal;
        
        fetch(audioSrc, { signal })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch audio: ${response.status}`);
            }
            return response.blob();
          })
          .then(blob => {
            // Create a blob URL from the fetched audio data
            blobUrl = URL.createObjectURL(blob);
            console.log('Created blob URL:', blobUrl);
            
            // Create a new audio element
            audioElement = new Audio();
            audioElementRef.current = audioElement;
            
            // Set up event handlers before setting the source
            audioElement.oncanplaythrough = () => {
              console.log('Audio can play through, starting playback');
              setIsAudioLoading(false);
              setIsAudioPlaying(true);
              audioElement?.play().catch(err => {
                console.error('Failed to play audio:', err);
                setIsAudioPlaying(false);
                setIsAudioFinished(true);
                setIsAudioLoading(false);
              });
            };
            
            audioElement.onended = () => {
              console.log('Audio playback ended, cleaning up');
              setIsAudioPlaying(false);
              setIsAudioFinished(true);
              if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                blobUrl = null;
              }
            };
            
            audioElement.onerror = (e) => {
              console.error('Audio playback error:', e);
              console.error('Audio error details:', {
                error: audioElement?.error,
                code: audioElement?.error?.code,
                message: audioElement?.error?.message,
                src: audioElement?.src
              });
              setIsAudioPlaying(false);
              setIsAudioFinished(true);
              setIsAudioLoading(false);
            };
            
            // Set the source and load the audio
            audioElement.src = blobUrl;
            audioElement.load();
          })
          .catch(err => {
            console.error('Failed to fetch or play audio:', err);
            setIsAudioPlaying(false);
            setIsAudioFinished(true);
            setIsAudioLoading(false);
            if (blobUrl) {
              URL.revokeObjectURL(blobUrl);
              blobUrl = null;
            }
          });
      } else {
        // For local files, the path should already be absolute from the root
        // since we're setting it that way in the useXmtp hook
        console.log('Current URL path:', window.location.pathname);
        console.log('Using local audio file:', audioSrc);

        // Create a new audio element with the path as is
        audioElement = new Audio(audioSrc);
        audioElementRef.current = audioElement;
        
        // Set up event handlers
        audioElement.oncanplaythrough = () => {
          console.log('Audio can play through, starting playback');
          setIsAudioLoading(false);
          setIsAudioPlaying(true);
          audioElement?.play().catch(err => {
            console.error('Failed to play audio:', err);
            setIsAudioPlaying(false);
            setIsAudioFinished(true);
            setIsAudioLoading(false);
          });
        };
        
        audioElement.onended = () => {
          console.log('Audio playback ended');
          setIsAudioPlaying(false);
          setIsAudioFinished(true);
        };
        
        audioElement.onerror = (e) => {
          console.error('Audio playback error:', e);
          console.error('Audio error details:', {
            error: audioElement?.error,
            code: audioElement?.error?.code,
            message: audioElement?.error?.message,
            src: audioElement?.src
          });
          setIsAudioPlaying(false);
          setIsAudioFinished(true);
          setIsAudioLoading(false);
        };
        
        // Load the audio
        audioElement.load();
      }
    } catch (err) {
      console.error('Error setting up audio playback:', err);
      setIsAudioPlaying(false);
      setIsAudioFinished(true);
      setIsAudioLoading(false);
    }
    
    // Cleanup function
    return () => {
      console.log('Cleaning up audio resources');
      
      // Stop any ongoing playback
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
        audioElement = null;
        audioElementRef.current = null;
      }
      
      // Release any blob URLs
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
      
      setIsAudioPlaying(false);
      setIsAudioLoading(false);
    };
  }, [audioSrc]);

  const handleToggleAudio = () => {
    if (!audioElementRef.current) {
      console.log('No audio element available to toggle');
      return;
    }
    
    console.log('Toggle audio, current state:', {
      isPlaying: isAudioPlaying,
      audioSrc: audioElementRef.current.src
    });
    
    if (isAudioPlaying) {
      audioElementRef.current.pause();
      setIsAudioPlaying(false);
    } else {
      setIsAudioLoading(true);
      audioElementRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
        setIsAudioLoading(false);
      }).then(() => {
        setIsAudioLoading(false);
      });
      setIsAudioPlaying(true);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      // Stop any playing audio before moving to next question
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setExplanation(null);
      setIsCorrect(null);
      setAudioSrc(null);
      setIsAudioFinished(false);
      setIsAudioPlaying(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (isValidating || !questions[currentQuestionIndex] || !song) return

    const currentQuestionUuid = questions[currentQuestionIndex].uuid
    console.log('Answering question with UUID:', currentQuestionUuid)

    setSelectedAnswer(answer)
    setIsValidating(true)
    setExplanation('Checking your answer...')
    setIsCorrect(null)
    setAudioSrc(null) // Reset audio source
    setIsAudioFinished(false)

    try {
      console.log('Sending answer to validate:', answer)
      const response = await sendAnswer({
        uuid: currentQuestionUuid,
        selectedAnswer: answer,
        songId: String(song.id)
      })
      console.log('Received validation response:', response)

      // Force a re-render to ensure the UI updates
      // Set isValidating to false immediately when we get a response
      setIsValidating(false)
      
      // Update the explanation with the response
      setExplanation(response.explanation || (response.isCorrect ? 'Correct!' : 'Incorrect'))
      setIsCorrect(response.isCorrect)
      console.log('Updated explanation to:', response.explanation)
      
      // Set audio source if available
      if (response.audioSrc) {
        console.log('Setting audio source:', response.audioSrc)
        setAudioSrc(response.audioSrc)
      } else {
        // If no audio, mark as finished
        setIsAudioFinished(true)
      }
    } catch (err) {
      console.error('Failed to validate answer:', err)
      setError('Failed to check answer')
      setExplanation('Could not validate answer')
      setIsValidating(false) // Make sure to set isValidating to false on error too
      setIsCorrect(null)
      setAudioSrc(null) // Reset audio source
      setIsAudioFinished(true)
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
      {/* Hidden audio element for playing sounds */}
      <audio ref={audioRef} className="hidden" />
      
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 relative">
        {/* Back button and Progress bar in header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href={`/${params?.locale || 'en'}/songs/${songId}`}
            className="text-neutral-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </Link>
          
          {/* Progress bar - now in header */}
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden flex-1">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main content area with fixed heights to prevent layout shifts */}
        <div className="grid grid-rows-[auto_1fr] gap-4 min-h-[calc(100vh-200px)]">
          {/* Top section with avatar, question and feedback - fixed height */}
          <div className="grid md:grid-cols-[auto_1fr]">
            {/* Avatar - centered on mobile, left on desktop */}
            <div className="flex justify-center md:block md:pr-4">
              <Image 
                src={`/${params?.locale || 'en'}/images/scarlett-peace.png`}
                alt="Scarlett"
                width={120}
                height={120}
              />
            </div>
            
            {/* Messages Container - fixed height to prevent layout shifts */}
            <div className="flex flex-col gap-4">
              {/* Question Message */}
              <div className="p-4 rounded-lg bg-neutral-800 w-full flex items-center min-h-[80px]">
                <p className="text-lg text-white">
                  {currentQuestion.question}
                </p>
              </div>
              
              {/* Feedback Message Container - Always visible but transparent when empty */}
              <div className={`p-4 rounded-lg w-full bg-neutral-800 min-h-[100px] relative ${!explanation ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
                {explanation ? (
                  <>
                    {/* Explanation text */}
                    <p className="text-lg text-white mb-10" key={`explanation-${currentQuestionIndex}-${explanation}-${Date.now()}`}>
                      {explanation}
                    </p>
                    
                    {/* Audio button positioned at bottom left, aligned with text */}
                    {isValidating ? (
                      <div className="absolute bottom-4 left-4">
                        <div className="w-6 h-6 flex items-center justify-center">
                          <Loading size={12} color="#3B82F6" />
                        </div>
                      </div>
                    ) : audioSrc && (
                      <div className="absolute bottom-4 left-4">
                        <button
                          onClick={handleToggleAudio}
                          disabled={isAudioLoading}
                          className="p-1 rounded-full bg-neutral-700 hover:bg-neutral-600 transition-colors w-6 h-6 flex items-center justify-center"
                          aria-label={isAudioPlaying ? "Pause audio" : "Play audio"}
                        >
                          {isAudioLoading ? (
                            <Loading size={12} color="#ffffff" />
                          ) : isAudioPlaying ? (
                            <Pause className="w-3 h-3 text-white" />
                          ) : (
                            <Play className="w-3 h-3 text-white" />
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="invisible">Placeholder for consistent height</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Answer Options - in a separate container that doesn't shift */}
          <div className="space-y-4 mt-4">
            {Object.entries(currentQuestion.options).map(([key, value]) => (
              <MultipleChoiceOption
                key={key}
                id={key}
                label={value}
                selected={selectedAnswer === key}
                correct={selectedAnswer === key ? isCorrect : null}
                disabled={!!selectedAnswer || isValidating}
                onSelect={() => !selectedAnswer && !isValidating && handleAnswer(key)}
              />
            ))}
          </div>
        </div>
        
        {/* Next button - fixed at bottom */}
        {selectedAnswer && !isValidating && (
          <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 p-4">
            <div className="max-w-4xl mx-auto">
              <Button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex >= questions.length - 1}
                className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
              >
                {currentQuestionIndex >= questions.length - 1 ? (
                  "Completed"
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Next <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 