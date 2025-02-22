'use client'

import { useEffect, useState, useRef } from 'react'
import { use } from 'react'
import { useLanguageStore } from '@/stores/languageStore'
import { TablelandClient, type Song } from '@/services/tableland'
import { getIPFSUrl } from '@/lib/utils'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Play, Pause } from 'lucide-react'
import { ring } from 'ldrs'

// Register the loader
ring.register()

interface Lyric {
  line: string
  english: string
  chinese: string
}

export default function PlayPage({ params: paramsPromise }: { params: Promise<{ id: string, locale: string }> }) {
  const params = use(paramsPromise)
  const [song, setSong] = useState<Song | null>(null)
  const [lyrics, setLyrics] = useState<Lyric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const { currentLocale, isLearningChinese } = useLanguageStore()
  
  // Add audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const fetchSongAndLyrics = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log('Fetching song data...')
        const tableland = TablelandClient.getInstance()
        const data = await tableland.getSong(Number(params.id))
        console.log('Song data received:', data)
        setSong(data)

        // Initialize audio element
        if (data?.audio_cid) {
          console.log('Initializing audio from IPFS:', data.audio_cid)
          const audio = new Audio(getIPFSUrl(data.audio_cid))
          audio.preload = 'metadata'
          
          // Add event listeners
          audio.addEventListener('loadedmetadata', () => {
            console.log('Audio metadata loaded')
            setIsLoadingAudio(false)
          })
          
          audio.addEventListener('timeupdate', () => {
            const currentProgress = (audio.currentTime / audio.duration) * 100
            setProgress(currentProgress)
          })
          
          audio.addEventListener('ended', () => {
            setIsPlaying(false)
            setProgress(0)
          })
          
          audio.addEventListener('error', (e) => {
            console.error('Audio loading error:', e)
            setError('Failed to load audio file')
            setIsLoadingAudio(false)
          })
          
          audioRef.current = audio
        }

        if (data?.lyrics_cid) {
          console.log('Fetching lyrics from IPFS:', data.lyrics_cid)
          const lyricsResponse = await fetch(getIPFSUrl(data.lyrics_cid))
          const lyricsText = await lyricsResponse.text()
          console.log('Raw lyrics response:', lyricsText)
          
          // Try to clean the response text
          const cleanedText = lyricsText.trim()
          console.log('Cleaned lyrics text:', cleanedText)
          
          try {
            // First try parsing as is
            let lyricsData
            try {
              lyricsData = JSON.parse(cleanedText)
            } catch (initialError) {
              console.error('Initial parse failed:', initialError)
              
              // If that fails, try to find a valid JSON substring
              const jsonStart = cleanedText.indexOf('{')
              const jsonEnd = cleanedText.lastIndexOf('}')
              if (jsonStart >= 0 && jsonEnd > jsonStart) {
                const jsonSubstring = cleanedText.substring(jsonStart, jsonEnd + 1)
                console.log('Attempting to parse JSON substring:', jsonSubstring)
                lyricsData = JSON.parse(jsonSubstring)
              } else {
                throw initialError
              }
            }
            
            console.log('Parsed lyrics data:', lyricsData)
            if (Array.isArray(lyricsData.lyrics)) {
              setLyrics(lyricsData.lyrics)
            } else {
              console.error('Invalid lyrics format - expected array:', lyricsData)
              setError('Invalid lyrics format - lyrics property should be an array')
            }
          } catch (parseError) {
            console.error('Error parsing lyrics JSON:', parseError)
            setError(`Failed to parse lyrics data: ${parseError.message}`)
          }
        }
      } catch (error) {
        console.error('Error fetching song/lyrics:', error)
        setError('Failed to load song. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSongAndLyrics()
    
    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [params.id])

  const handlePlayPause = () => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      setIsLoadingAudio(true)
      audioRef.current.play()
        .then(() => {
          console.log('Audio playback started')
          setIsLoadingAudio(false)
        })
        .catch((error) => {
          console.error('Playback error:', error)
          setError('Failed to play audio')
          setIsLoadingAudio(false)
        })
    }
    setIsPlaying(!isPlaying)
  }

  const handleProgressChange = ([value]: number[]) => {
    if (!audioRef.current) return
    
    const time = (value / 100) * audioRef.current.duration
    audioRef.current.currentTime = time
    setProgress(value)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 animate-pulse">
        <div className="h-[50vh] bg-neutral-800" />
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Song not found'}</p>
          <Button 
            onClick={() => window.location.reload()}
            variant="ghost"
            className="text-white hover:bg-neutral-800"
          >
            {currentLocale === 'en' ? 'Try Again' : '重试'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      <BackButton />
      
      {/* Lyrics section */}
      <div className="flex-1 p-6 pt-20 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">
            {isLearningChinese ? song.song_title : song.song_title_translated}
          </h1>
          <p className="text-lg text-white/80 mb-8">
            {isLearningChinese ? song.song_title_translated : song.song_title}
          </p>
          
          {/* Lyrics display */}
          <div className="space-y-6">
            {lyrics.map((lyric, index) => (
              <div key={index} className="text-lg">
                <p className="text-white">
                  {isLearningChinese ? lyric.line : lyric.english}
                </p>
                <p className="text-gray-400 mt-1">
                  {isLearningChinese ? lyric.english : lyric.chinese}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Player controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/80 backdrop-blur-lg border-t border-neutral-800">
        <div className="max-w-2xl mx-auto px-6 py-4">
          {/* Progress slider */}
          <Slider
            value={[progress]}
            max={100}
            step={1}
            className="mb-4"
            onValueChange={handleProgressChange}
          />
          
          {/* Play/Pause button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              onClick={handlePlayPause}
              disabled={isLoadingAudio || !audioRef.current}
            >
              {isLoadingAudio ? (
                <l-ring
                  size="32"
                  stroke="3"
                  bg-opacity="0"
                  speed="2"
                  color="white"
                />
              ) : isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 