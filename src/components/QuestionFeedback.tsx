'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Pause, Play } from 'lucide-react'

interface QuestionFeedbackProps {
  isCorrect: boolean
  explanation: string
  audioCid?: string
}

const CORRECT_AUDIO_FILES = [
  'fantastic-tai-bang-le.mp3',
  'gan-de-piaoliang-well-done.mp3',
  'hen-chuse-excellent.mp3',
  'very-good-hen-hao.mp3'
]

export function QuestionFeedback({ isCorrect, explanation, audioCid }: QuestionFeedbackProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isAudioReady, setIsAudioReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)

  useEffect(() => {
    // Reset states
    setIsAudioReady(false)
    setAudioError(null)
    setIsPlaying(false)

    // Only create audio if we have a valid source
    if (!isCorrect && !audioCid) {
      setAudioError('No audio available')
      return
    }

    try {
      // Determine audio source
      const audioSource = isCorrect 
        ? `/${CORRECT_AUDIO_FILES[Math.floor(Math.random() * CORRECT_AUDIO_FILES.length)]}` 
        : `https://premium.aiozpin.network/ipfs/${audioCid}`

      console.log('Loading audio from:', audioSource)

      // Create audio element with crossOrigin attribute
      const audio = new Audio()
      audio.crossOrigin = 'anonymous' // Add this for CORS
      
      const handleCanPlay = () => {
        console.log('Audio can play')
        setIsAudioReady(true)
        // Only autoplay once the audio is ready
        audio.play().catch(err => {
          console.error('Failed to play audio:', err)
          setAudioError('Failed to play audio')
        })
        setIsPlaying(true)
      }

      const handleError = (e: ErrorEvent) => {
        console.error('Audio error:', e)
        setAudioError('Failed to load audio')
        setIsPlaying(false)
        setIsAudioReady(false)
      }

      const handleEnded = () => {
        console.log('Audio ended')
        setIsPlaying(false)
      }

      // Add event listeners
      audio.addEventListener('canplaythrough', handleCanPlay)
      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)

      // Set the source after adding event listeners
      audio.src = audioSource
      audio.load()

      audioRef.current = audio

      // Cleanup
      return () => {
        audio.removeEventListener('canplaythrough', handleCanPlay)
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        audio.pause()
        audio.src = ''
        audio.remove()
        audioRef.current = null
      }
    } catch (err) {
      console.error('Error setting up audio:', err)
      setAudioError('Failed to setup audio')
    }
  }, [isCorrect, audioCid])

  const toggleAudio = () => {
    if (!audioRef.current || !isAudioReady) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error('Failed to play audio:', err)
          setAudioError('Failed to play audio')
        })
    }
  }

  return (
    <div className="flex items-start gap-4">
      <div className="relative w-12 h-12 shrink-0 bg-neutral-800 rounded-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/scarlett-peace.png"
          alt="Scarlett"
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 relative">
        {/* Speech bubble */}
        <div className={`p-4 rounded-lg ${
          isCorrect ? 'bg-green-500/20 border border-green-500' : 'bg-blue-600/20 border border-blue-600'
        }`}>
          <p className="text-white mb-2">
            {explanation}
          </p>
          
          {/* Audio control */}
          {!audioError ? (
            <button
              onClick={toggleAudio}
              disabled={!isAudioReady}
              className={`mt-2 p-2 rounded-full ${
                isCorrect ? 'hover:bg-green-500/20' : 'hover:bg-blue-600/20'
              } transition-colors ${!isAudioReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
          ) : (
            <p className="mt-2 text-sm text-red-400">{audioError}</p>
          )}
        </div>

        {/* Speech bubble pointer */}
        <div className={`absolute -left-2 top-4 w-4 h-4 transform rotate-45 ${
          isCorrect ? 'bg-green-500 border-l border-t border-green-500' : 'bg-blue-600 border-l border-t border-blue-600'
        }`} />
      </div>
    </div>
  )
} 