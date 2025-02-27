'use client'



import { SongCard } from '@/components/SongCard'
import { ChatPreview } from '@/components/ChatPreview'
import { useParams } from 'next/navigation'
import { useSongs } from '@/hooks/useSongs'

export default function Home() {
  const { locale = 'en' } = useParams()
  const { songs, isLoading } = useSongs()

  return (
    <div className="container mx-auto py-8 space-y-12">
      {/* Songs Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Songs</h2>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading songs...</p>
            ) : songs.length > 0 ? (
              songs.map(song => (
                <SongCard 
                  key={song.id} 
                  song={song} 
                  locale={locale as string} 
                />
              ))
            ) : (
              <p className="text-muted-foreground">No songs available</p>
            )}
          </div>
        </div>
      </section>

      {/* Chat Preview Section */}
      <section>
        <ChatPreview />
      </section>
    </div>
  )
}
