'use client'

import { useParams } from 'next/navigation'
import { useSongs } from '@/hooks/useSongs'
import { SongCard } from '@/components/SongCard'
import { ChatPreview } from '@/components/ChatPreview'
import { useAuth } from '@/hooks/useAuth'
import { useXmtp } from '@/hooks/useXmtp'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'

export default function Home() {
  const { locale = 'en' } = useParams()
  const { songs, isLoading } = useSongs()
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth()
  const { isInitialized: isXmtpInitialized, isLoading: isXmtpLoading } = useXmtp()

  // Show loading state while auth or XMTP is initializing
  const isInitializing = isAuthLoading || (isAuthenticated && isXmtpLoading)

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

  return (
    <div className="min-h-screen bg-neutral-900">
      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Songs Section - Top Half */}
        <section className="pb-6 border-b border-neutral-800">
          <h2 className="text-xl font-semibold mb-4 text-white">
            {locale === 'en' ? 'Available Songs' : '可用歌曲'}
          </h2>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4">
              {isLoading ? (
                <div className="flex items-center justify-center w-full h-48">
                  <p className="text-neutral-400">Loading songs...</p>
                </div>
              ) : songs.length > 0 ? (
                songs.map(song => (
                  <SongCard 
                    key={song.id} 
                    song={song} 
                    locale={locale as string} 
                  />
                ))
              ) : (
                <div className="flex items-center justify-center w-full h-48">
                  <p className="text-neutral-400">No songs available</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Chat Section - Bottom Half */}
        <section className="pt-4">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg bg-neutral-800">
              <p className="text-lg text-white mb-4">
                {locale === 'en' 
                  ? 'Sign in to start chatting with your AI language tutor'
                  : '登录以开始与您的AI语言导师聊天'
                }
              </p>
              <Button
                onClick={login}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {locale === 'en' ? 'Sign In' : '登录'}
              </Button>
            </div>
          ) : (
            <ChatPreview />
          )}
        </section>
      </div>
    </div>
  )
} 