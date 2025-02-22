'use client'

import { useEffect, useState } from 'react'
import { useLanguageStore } from '@/stores/languageStore'
import { TablelandClient, type Song } from '@/services/tableland'
import { getCEFRLevel, getIPFSUrl } from '@/lib/utils'
import Link from 'next/link'

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentLocale, isLearningChinese } = useLanguageStore()
  
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const tableland = TablelandClient.getInstance()
        const data = await tableland.getAllSongs()
        setSongs(data)
      } catch (error) {
        console.error('Error fetching songs:', error)
        setError('Failed to load songs. Please try again later.')
        setSongs([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSongs()
  }, [])

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">
        {currentLocale === 'en' ? 'Learn Chinese Through Music' : '通过音乐学习英语'}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeletons with dark theme colors
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900"
            >
              <div className="flex flex-col">
                <div className="aspect-square bg-neutral-800 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-neutral-800 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            </div>
          ))
        ) : error ? (
          <div className="col-span-full text-center py-8">
            <p className="text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-neutral-700 text-white rounded-md hover:bg-neutral-600 transition-colors"
            >
              {currentLocale === 'en' ? 'Try Again' : '重试'}
            </button>
          </div>
        ) : songs.length === 0 ? (
          <p className="text-gray-400 col-span-full text-center py-8">
            {currentLocale === 'en' 
              ? 'No songs available at the moment.'
              : '目前没有可用的歌曲。'
            }
          </p>
        ) : (
          songs.map((song, i) => (
            <Link
              key={i}
              href={`/${currentLocale}/songs/${song.id}`}
              className="group relative overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 hover:border-primary transition-colors"
            >
              <div className="flex flex-col">
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={getIPFSUrl(song.thumb_img_cid)}
                    alt={song.song_title}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h2 className="font-semibold text-white">
                    {isLearningChinese ? song.song_title : song.song_title_translated}
                  </h2>
                  <div className="flex items-center text-sm text-gray-400">
                    <span>CEFR {getCEFRLevel(song.cefr_level)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
} 