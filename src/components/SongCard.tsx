'use client'

import Image from 'next/image'
import Link from 'next/link'
import { type Song } from '@/types'
import { getIPFSUrl } from '@/lib/utils'

interface SongCardProps {
  song: Song
  locale: string
}

export function SongCard({ song, locale }: SongCardProps) {
  const imageUrl = getIPFSUrl(song.cover_img_cid)
  
  return (
    <Link 
      href={`/${locale}/songs/${song.id}`}
      className="flex flex-col w-[300px] min-w-[300px] gap-2 p-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-900">
        <Image
          src={imageUrl}
          alt={song.song_title}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg truncate text-white">{song.song_title}</h3>
        <span className="text-sm text-neutral-400">
          Level {song.cefr_level}
        </span>
      </div>
    </Link>
  )
} 