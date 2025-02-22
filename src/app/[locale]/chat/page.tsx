'use client'

import { useLanguageStore } from '@/stores/languageStore'

export default function ChatPage() {
  const { currentLocale } = useLanguageStore()
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">
        {currentLocale === 'en' ? 'Chat' : '聊天'}
      </h1>
      
      <div className="rounded-lg border border-neutral-700 bg-neutral-900 p-8">
        <p className="text-gray-400">
          {currentLocale === 'en' 
            ? 'Chat feature coming soon. Practice your language skills with native speakers!'
            : '聊天功能即将推出。与母语者练习你的语言技能！'
          }
        </p>
      </div>
    </div>
  )
} 