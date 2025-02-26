'use client'

import { useParams, useRouter } from 'next/navigation'
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
import { FSRSService, fsrsService } from '@/services/fsrs'
import { Card } from 'ts-fsrs'
import IrysService from '@/services/irys'
import type { UserProgress as FSRSUserProgress } from '@/services/fsrs'
import useTranslation from '@/hooks/useTranslation'

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

interface FSRSState {
  cards: Map<string, Card>;
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
  const [questionAnswers, setQuestionAnswers] = useState<Array<{
    uuid: string;
    selectedAnswer: string;
    isCorrect: boolean;
    timestamp: number;
  }>>([]);
  
  const { isAuthenticated, isLoading: isAuthLoading, login, user } = useAuth()
  const { isInitialized: isXmtpInitialized, isLoading: isXmtpLoading, sendAnswer } = useXmtp()
  const router = useRouter()
  const [fsrsState, setFsrsState] = useState<FSRSState>({ cards: new Map() });
  const { t } = useTranslation()

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
      if (!songId || !user?.id) return;
      
      try {
        console.log(`[Questions Page] Starting fetchData for songId=${songId}, userId=${user.id}`);
        setIsLoading(true);
        setError(null);

        // Fetch song data
        const tableland = TablelandClient.getInstance();
        console.log(`[Questions Page] Fetching song data for songId=${songId}`);
        const songData = await tableland.getSong(Number(songId));
        console.log(`[Questions Page] Song data retrieved:`, songData ? 'Success' : 'Failed');
        setSong(songData);

        if (isAuthenticated && isXmtpInitialized && songData) {
          // Fetch all questions
          const questionsCid = params?.locale === 'zh' ? 
            songData.questions_cid_1 : songData.questions_cid_2;
          console.log(`[Questions Page] Fetching questions from CID=${questionsCid}`);
          const response = await fetch(`/api/ipfs/${questionsCid}`);
          const allQuestions = await response.json();
          console.log(`[Questions Page] Retrieved ${allQuestions.length} questions`);

          // Get previous progress from Irys
          let previousProgress: FSRSUserProgress | null = null;
          try {
            console.log(`[Questions Page] Fetching previous progress from Irys for userId=${user.id}, songId=${songId}`);
            const irysProgress = await IrysService.getLatestProgress(user.id, songId);
            console.log(`[Questions Page] Irys progress retrieved:`, irysProgress ? 'Success' : 'Not found');
            
            if (irysProgress) {
              console.log(`[Questions Page] Converting Irys progress to FSRS format`);
              // Convert IrysService progress to FSRSService progress format
              previousProgress = {
                userId: irysProgress.userId,
                songId: irysProgress.songId,
                questions: irysProgress.questions.map(q => ({
                  uuid: q.uuid,
                  correct: q.correct,
                  fsrs: q.fsrs && {
                    ...q.fsrs,
                    due: new Date(q.fsrs.due),
                    last_review: q.fsrs.last_review ? new Date(q.fsrs.last_review) : undefined
                  }
                })),
                completedAt: String(irysProgress.completedAt)
              };
              console.log(`[Questions Page] Converted progress contains ${previousProgress.questions.length} questions`);
            }
          } catch (err) {
            console.warn('[Questions Page] No previous progress found:', err);
          }

          // Select questions using FSRS
          console.log(`[Questions Page] Selecting questions using FSRS`);
          const selectedQuestions = await fsrsService.selectQuestions(allQuestions, previousProgress);
          console.log(`[Questions Page] Selected ${selectedQuestions.length} questions using FSRS`);
          
          // If no questions were selected by FSRS, use the first 20 questions
          const finalQuestions = selectedQuestions.length > 0 ? 
            selectedQuestions : 
            allQuestions.slice(0, 20);
          
          console.log(`[Questions Page] Final question count: ${finalQuestions.length}`);
          
          // Initialize FSRS cards
          console.log(`[Questions Page] Initializing FSRS cards`);
          const cards = new Map<string, Card>();
          if (previousProgress?.questions) {
            previousProgress.questions.forEach(q => {
              if (q.fsrs) {
                cards.set(q.uuid, {
                  ...q.fsrs,
                  due: new Date(q.fsrs.due),
                  last_review: q.fsrs.last_review ? new Date(q.fsrs.last_review) : undefined
                });
              }
            });
            console.log(`[Questions Page] Initialized ${cards.size} FSRS cards`);
          }
          
          setFsrsState({ cards });
          setQuestions(finalQuestions);
        }
      } catch (err) {
        console.error('[Questions Page] Error fetching data:', err);
        setError(t('songs.failedToLoadContent'));
      } finally {
        setIsLoading(false);
        console.log(`[Questions Page] fetchData completed`);
      }
    };

    fetchData()
  }, [songId, isLearningChinese, isAuthenticated, isXmtpInitialized, params?.locale, user?.id, t])

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
    } else {
      // All questions completed, save stats and redirect to completion page
      const correctAnswers = questionAnswers.filter(q => q.isCorrect).length;
      
      // Save stats to localStorage for the completion page
      const stats = {
        totalQuestions: questions.length,
        correctAnswers,
        songId: song?.id || params?.id,
        completedAt: Date.now()
      };
      
      localStorage.setItem('questionStats', JSON.stringify(stats));
      localStorage.setItem('questionAnswers', JSON.stringify(questionAnswers));
      
      // Redirect to completion page
      router.push(`/${params?.locale}/songs/${params?.id}/questions/complete`);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (isValidating || !questions[currentQuestionIndex] || !song) return;

    const currentQuestionUuid = questions[currentQuestionIndex].uuid;
    console.log('Answering question with UUID:', currentQuestionUuid);

    setSelectedAnswer(answer);
    setIsValidating(true);
    setExplanation('Checking your answer...');
    setIsCorrect(null);
    setAudioSrc(null);
    setIsAudioFinished(false);

    try {
      console.log('Sending answer to validate:', answer);
      const response = await sendAnswer({
        uuid: currentQuestionUuid,
        selectedAnswer: answer,
        songId: String(song.id)
      });
      console.log('Received validation response:', response);

      setIsValidating(false);
      
      // Update FSRS card
      const rating = fsrsService.rateAnswer(response.isCorrect);
      const currentCard = fsrsState.cards.get(currentQuestionUuid);
      const updatedCard = fsrsService.updateCard(currentCard, rating);
      
      // Update FSRS state
      setFsrsState(prev => {
        const newCards = new Map(prev.cards);
        newCards.set(currentQuestionUuid, updatedCard);
        return { cards: newCards };
      });

      // Store the answer with FSRS data
      setQuestionAnswers(prev => [
        ...prev,
        {
          uuid: currentQuestionUuid,
          selectedAnswer: answer,
          isCorrect: response.isCorrect,
          timestamp: Date.now(),
          fsrs: updatedCard
        }
      ]);
      
      // Update the explanation with the response
      setExplanation(response.explanation || (response.isCorrect ? 'Correct!' : 'Incorrect'));
      setIsCorrect(response.isCorrect);

      if (response.audioSrc) {
        console.log('Setting audio source:', response.audioSrc);
        setAudioSrc(response.audioSrc);
      } else {
        setIsAudioFinished(true);
      }
    } catch (err) {
      console.error('Failed to validate answer:', err);
      setError('Failed to check answer');
      setExplanation('Could not validate answer');
      setIsValidating(false);
      setIsCorrect(null);
      setAudioSrc(null);
      setIsAudioFinished(true);
    }
  };

  // Render loading state
  if (isLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <Loading size={48} color="#ffffff" />
          <p className="mt-4 text-white">{t('songs.loadingQuestions')}</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !song) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || t('songs.notFound')}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="ghost"
            className="text-white hover:bg-neutral-800"
          >
            {t('songs.tryAgain')}
          </Button>
        </div>
      </div>
    );
  }

  // Render authentication prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-white mb-4">{t('songs.signInRequired')}</h1>
          <p className="text-gray-300 mb-6">{t('songs.signInToStudy')}</p>
          <Button onClick={login} className="w-full">
            {t('nav.signIn')}
          </Button>
        </div>
      </div>
    );
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
          <div className="h-2 bg-neutral-800 rounded-full flex-1">
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
                <p className="text-md text-white">
                  {currentQuestion.question}
                </p>
              </div>
              
              {/* Feedback Message Container - Fixed height container */}
              <div className="h-[100px] w-full relative">
                {/* Actual feedback content with absolute positioning */}
                <div className={`absolute inset-0 p-4 rounded-lg bg-neutral-800 transition-opacity duration-300 ${!explanation ? 'opacity-0' : 'opacity-100'}`}>
                  {explanation && (
                    <>
                      {/* Explanation text with padding to avoid button overlap */}
                      <div className="pr-12">
                        <p className="text-md text-white" key={`explanation-${currentQuestionIndex}-${explanation}-${Date.now()}`}>
                          {explanation}
                        </p>
                      </div>
                      
                      {/* Audio button positioned at bottom right to avoid text overlap */}
                      {isValidating ? (
                        <div className="absolute bottom-3 right-3">
                          <div className="w-8 h-8 flex items-center justify-center">
                            <Loading size={12} color="#3B82F6" />
                          </div>
                        </div>
                      ) : audioSrc && (
                        <div className="absolute bottom-3 right-3">
                          <button
                            onClick={handleToggleAudio}
                            disabled={isAudioLoading}
                            className="p-1 rounded-full bg-neutral-700 hover:bg-neutral-600 transition-colors w-8 h-8 flex items-center justify-center"
                            aria-label={isAudioPlaying ? "Pause audio" : "Play audio"}
                          >
                            {isAudioLoading ? (
                              <Loading size={10} color="#ffffff" />
                            ) : isAudioPlaying ? (
                              <Pause className="w-3 h-3 text-white" />
                            ) : (
                              <Play className="w-3 h-3 text-white" />
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
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
                className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
              >
                {currentQuestionIndex >= questions.length - 1 ? (
                  <div className="flex items-center justify-center gap-2">
                    {params?.locale === 'zh' ? '完成并查看结果' : 'Complete & View Results'} <ChevronRight className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    {params?.locale === 'zh' ? '下一题' : 'Next'} <ChevronRight className="w-5 h-5" />
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