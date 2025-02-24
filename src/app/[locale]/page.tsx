'use client'

import { useEffect, useState } from 'react'
import { useLanguageStore } from '@/stores/languageStore'
import { TablelandClient, type Song } from '@/services/tableland'
import { getCEFRLevel, getIPFSUrl } from '@/lib/utils'
import Link from 'next/link'
import { Thread } from '@/components/assistant-ui/thread'
import { useXmtp } from '@/hooks/useXmtp'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Music, SendHorizontalIcon } from 'lucide-react'
import { Loading } from '@/components/ui/loading'

const MESSAGES_STORAGE_KEY = 'chat_messages'

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentLocale, isLearningChinese } = useLanguageStore()
  const { isInitialized: isXmtpInitialized, isLoading: isXmtpLoading, error: xmtpError, messages: xmtpMessages, sendMessage } = useXmtp()
  const { isAuthenticated, isLoading: isAuthLoading, login } = useAuth()
  const [isMusicDrawerOpen, setIsMusicDrawerOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isMessagePending, setIsMessagePending] = useState(false)
  
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

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return
    
    try {
      // Handle auth if needed
      if (!isAuthenticated) {
        await login()
        setIsMessagePending(true)
        return
      }

      // Handle XMTP initialization
      if (!isXmtpInitialized) {
        setIsMessagePending(true)
        return
      }

      // Send message and wait for response
      await sendMessage(message)
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return
    await handleSendMessage(inputValue.trim())
    setInputValue('')
  }

  // Show loading state while auth or XMTP is initializing
  const isInitializing = isAuthLoading || (isAuthenticated && isXmtpLoading)

  // Don't show anything until we're ready
  if (!isAuthenticated && isAuthLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loading />
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-neutral-800 bg-neutral-900">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMusicDrawerOpen(!isMusicDrawerOpen)}
              className="hover:bg-neutral-800"
            >
              <Music className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-6xl mx-auto px-4 py-6">
          <div className="space-y-4 pb-20">
            {isInitializing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loading />
                <p className="text-neutral-400 mt-4">
                  {isXmtpLoading ? 'Initializing secure chat...' : 'Loading...'}
                </p>
              </div>
            ) : !isAuthenticated && xmtpMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg text-white mb-4">
                  {currentLocale === 'en' 
                    ? 'Sign in to start chatting with your AI language tutor'
                    : '登录以开始与您的AI语言导师聊天'
                  }
                </p>
                <Button
                  onClick={login}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentLocale === 'en' ? 'Sign In' : '登录'}
                </Button>
              </div>
            ) : (
              <>
                {xmtpMessages.map((message, i) => {
                  // Try to parse JSON content if it's a JSON string
                  let displayContent = message.content
                  try {
                    const parsed = JSON.parse(message.content)
                    // If it's a question answer, format it nicely
                    if (parsed.uuid && parsed.selectedAnswer) {
                      displayContent = `Selected answer: ${parsed.selectedAnswer}`
                    } else if (parsed.isCorrect !== undefined && parsed.explanation) {
                      displayContent = parsed.explanation
                    } else {
                      // For other JSON objects, stringify them nicely
                      displayContent = JSON.stringify(parsed, null, 2)
                    }
                  } catch (e) {
                    // If it's not JSON, use the content as is
                    displayContent = message.content
                  }

                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-500/20 ml-12'
                          : 'bg-neutral-800 mr-12'
                      }`}
                    >
                      <pre className="whitespace-pre-wrap font-sans">
                        {displayContent}
                      </pre>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Music drawer */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-neutral-900 border-r border-neutral-800 transform transition-transform duration-200 ${
        isMusicDrawerOpen ? 'translate-x-0' : '-translate-x-full'
      } z-50`}>
        <div className="p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">
            {currentLocale === 'en' ? 'Available Songs' : '可用歌曲'}
          </h2>
        </div>
        <div className="overflow-y-auto h-full pb-20">
          {isLoading ? (
            <div className="p-4">
              <div className="animate-pulse space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-20 bg-neutral-800 rounded" />
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-400 mb-2">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                {currentLocale === 'en' ? 'Try Again' : '重试'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {songs.map((song, i) => (
                <Link
                  key={i}
                  href={`/${currentLocale}/songs/${song.id}`}
                  className="block p-3 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-neutral-800">
                      <img
                        src={getIPFSUrl(song.thumb_img_cid)}
                        alt={song.song_title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">
                        {isLearningChinese ? song.song_title : song.song_title_translated}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        CEFR {getCEFRLevel(song.cefr_level)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat input */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-900 p-4">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={
                isInitializing
                  ? 'Initializing...'
                  : !isAuthenticated 
                    ? currentLocale === 'en'
                      ? 'Sign in to start chatting...'
                      : '登录以开始聊天...'
                    : currentLocale === 'en'
                      ? 'Ask me anything...'
                      : '问我任何问题...'
              }
              disabled={isInitializing}
              className="flex-1 bg-neutral-800 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <Button 
              type="submit"
              size="icon"
              className="w-10 h-10"
              disabled={isInitializing}
              onClick={() => {
                if (!isAuthenticated) {
                  login()
                }
              }}
            >
              {isInitializing ? (
                <Loading size={20} color="#ffffff" />
              ) : (
                <SendHorizontalIcon className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
} 