'use client'

import { useState, useEffect } from 'react'
import { type Song } from '@/types'

export function useSongs() {
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await fetch('/api/songs')
        if (!response.ok) {
          throw new Error('Failed to fetch songs')
        }
        const data = await response.json()
        setSongs(data)
      } catch (err) {
        console.error('Error fetching songs:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch songs')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSongs()
  }, [])

  return {
    songs,
    isLoading,
    error
  }
} 