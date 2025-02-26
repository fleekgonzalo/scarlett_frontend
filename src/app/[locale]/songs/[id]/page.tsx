'use client'

import { useEffect, useState } from 'react'
import { useLanguageStore } from '@/stores/languageStore'
import { TablelandClient, type Song } from '@/services/tableland'
import { getCEFRLevel, getIPFSUrl } from '@/lib/utils'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useTranslation from '@/hooks/useTranslation'

export default function SongPage() {
  const params = useParams()
  const [song, setSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentLocale, isLearningChinese } = useLanguageStore()
  const { t } = useTranslation()

  useEffect(() => {
    const fetchSong = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const tableland = TablelandClient.getInstance()
        const data = await tableland.getSong(Number(params.id))
        setSong(data)
      } catch (error) {
        console.error('Error fetching song:', error)
        setError(t('songs.failedToLoad'))
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSong()
  }, [params.id, t])

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
    )
  }

  return (
    <div className="min-h-screen bg-neutral-900">
      <BackButton />
      
      {/* Hero section with background image */}
      <div className="relative">
        <div 
          className="h-[50vh] w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${getIPFSUrl(song.cover_img_cid)})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/25 to-black/75">
            <div className="absolute bottom-0 left-0 p-6 text-white">
              <h1 className="text-4xl font-bold">
                {isLearningChinese ? song.song_title : song.song_title_translated}
              </h1>
              <p className="text-2xl text-white/80 mb-10">
                {isLearningChinese ? song.song_title_translated : song.song_title}
              </p>
            </div>
          </div>
        </div>

        {/* Play button positioned half-way over the edge */}
        <div className="absolute left-16 -translate-x-1/2 -bottom-10">
          <Link
            href={`/${currentLocale}/songs/${song.id}/play`}
            className="rounded-full p-6 bg-blue-500 hover:bg-blue-600 shadow-xl transition-colors flex items-center justify-center"
          >
            <Play className="w-8 h-8 text-white" fill="white" />
          </Link>
        </div>
      </div>

      {/* Stats section - pushed down to make room for play button */}
      <div className="mt-16 grid grid-cols-3 gap-4 px-6">
        <div className="space-y-1 text-center bg-neutral-800 p-3 rounded-lg">
          <div className="text-2xl font-bold text-white">
            {getCEFRLevel(song.cefr_level)}
          </div>
          <div className="text-sm text-gray-400">{t('songs.cefrLevel')}</div>
        </div>
        
        <div className="space-y-1 text-center bg-neutral-800 p-3 rounded-lg">
          <div className="text-2xl font-bold text-white">
            {song.words_per_second}
          </div>
          <div className="text-sm text-gray-400">{t('songs.wordsPerSecond')}</div>
        </div>
        
        <div className="space-y-1 text-center bg-neutral-800 p-3 rounded-lg">
          <div className="text-2xl font-bold text-white">
            {isLearningChinese ? song.unique_words_2 : song.unique_words_1}
          </div>
          <div className="text-sm text-gray-400">{t('songs.topWords')}</div>
        </div>
      </div>

      {/* Study button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-neutral-900 border-t border-neutral-800">
        <Link href={`/${currentLocale}/songs/${song.id}/questions`}>
          <Button className="w-full">{t('songs.study')}</Button>
        </Link>
      </div>
    </div>
  )
} 