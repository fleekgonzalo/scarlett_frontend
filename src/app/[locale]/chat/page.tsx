'use client'



import { useXmtp } from '@/hooks/useXmtp'
import { ArrowLeft, SendHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import { useSubscription } from '@/context/SubscriptionContext'
import { SubscriptionTier } from '@/services/unlock'

const MESSAGES_PER_PAGE = 8

export default function ChatPage() {
  const { messages, sendMessage, isLoading, isInitialized } = useXmtp()
  const { locale = 'en' } = useParams()
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [displayedMessages, setDisplayedMessages] = useState<typeof messages>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showLoadMore, setShowLoadMore] = useState(false)
  const { tier } = useSubscription()
  const isPremium = tier === SubscriptionTier.PREMIUM

  // Initialize with most recent messages
  useEffect(() => {
    if (messages.length > 0) {
      setDisplayedMessages(messages.slice(-MESSAGES_PER_PAGE))
      setShowLoadMore(messages.length > MESSAGES_PER_PAGE)
    }
  }, [messages])

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current && displayedMessages.length === messages.slice(-MESSAGES_PER_PAGE).length) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [displayedMessages, messages])

  const handleLoadMore = () => {
    const currentLength = displayedMessages.length
    const newMessages = messages.slice(
      Math.max(0, messages.length - (currentLength + MESSAGES_PER_PAGE)),
      messages.length - currentLength
    )
    setDisplayedMessages(prev => [...newMessages, ...prev])
    setShowLoadMore(currentLength + MESSAGES_PER_PAGE < messages.length)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    try {
      setIsSending(true)
      await sendMessage(inputValue.trim())
      setInputValue('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-neutral-900">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-neutral-800">
        <Link
          href={`/${locale}`}
          className="p-2 rounded-full hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h1 className="text-xl font-semibold text-white">Chat History</h1>
      </div>

      {/* Subscription Banner */}
      <div className="p-4">
        <SubscriptionBanner showFreeFeatures={false} />
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loading size={32} color="#3B82F6" />
              <p className="text-neutral-400">Loading messages...</p>
            </div>
          </div>
        ) : displayedMessages.length > 0 ? (
          <>
            {showLoadMore && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  onClick={handleLoadMore}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Load more messages
                </Button>
              </div>
            )}
            {displayedMessages.map((message, i) => (
              <div 
                key={i}
                className={`flex flex-col gap-1 ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <span className="text-sm text-neutral-400 capitalize">
                  {message.role}
                </span>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-neutral-700 text-white'
                }`}>
                  {(() => {
                    // Try to parse JSON if necessary
                    try {
                      if (message.content.startsWith('{') && message.content.endsWith('}')) {
                        const jsonContent = JSON.parse(message.content);
                        
                        // Special handling for different message types
                        if (jsonContent.explanation) {
                          return jsonContent.explanation;
                        } else if (jsonContent.uuid && jsonContent.selectedAnswer) {
                          return `Answer selected: ${jsonContent.selectedAnswer}`;
                        } else {
                          // Fallback to show the most important parts of JSON
                          return Object.entries(jsonContent)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ');
                        }
                      }
                      // Not JSON, just show as is
                      return message.content;
                    } catch (e) {
                      // If JSON parsing fails, show as is
                      return message.content;
                    }
                  })()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : isInitialized ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-neutral-400">
              No messages yet. Start chatting to learn!
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loading size={32} color="#3B82F6" />
              <p className="text-neutral-400">Initializing chat...</p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Input */}
      <div className="border-t border-neutral-800 bg-neutral-900 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-6xl mx-auto">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={isPremium 
              ? (locale === 'en' ? 'Ask me anything with premium features...' : '使用高级功能问我任何问题...') 
              : (locale === 'en' ? 'Ask me anything...' : '问我任何问题...')}
            className={`flex-1 bg-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 ${
              isPremium ? 'focus:ring-blue-500 border border-blue-500/30' : 'focus:ring-neutral-500'
            }`}
          />
          <Button 
            type="submit"
            size="icon"
            className={isPremium ? "bg-blue-600 hover:bg-blue-700" : "bg-neutral-600 hover:bg-neutral-700"}
            disabled={isSending}
          >
            {isSending ? (
              <Loading size={20} color="#ffffff" />
            ) : (
              <SendHorizontal className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
} 