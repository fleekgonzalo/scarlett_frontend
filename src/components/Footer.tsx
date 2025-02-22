'use client'

import Link from 'next/link'
import { Home, MessageCircle } from 'lucide-react'
import { useLanguageStore } from '@/stores/languageStore'

export function Footer() {
  const { currentLocale } = useLanguageStore()
  
  return (
    <footer className="fixed bottom-0 left-0 z-50 w-full h-16 bg-neutral-800 border-t border-neutral-700">
      <div className="grid h-full max-w-lg grid-cols-2 mx-auto font-medium">
        <Link
          href={`/${currentLocale}`}
          className="inline-flex flex-col items-center justify-center px-5 text-gray-400 hover:text-white hover:bg-neutral-700"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm">
            {currentLocale === 'en' ? 'Home' : '主页'}
          </span>
        </Link>
        <Link
          href={`/${currentLocale}/chat`}
          className="inline-flex flex-col items-center justify-center px-5 text-gray-400 hover:text-white hover:bg-neutral-700"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">
            {currentLocale === 'en' ? 'Chat' : '聊天'}
          </span>
        </Link>
      </div>
    </footer>
  )
} 