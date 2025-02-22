'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useLanguageStore } from '@/stores/languageStore'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { currentLocale, setLocale } = useLanguageStore()

  const toggleLanguage = () => {
    const newLocale = currentLocale === 'en' ? 'zh' : 'en'
    setLocale(newLocale)
    
    // Get the path segments after the locale
    const segments = pathname.split('/')
    const pathWithoutLocale = segments.slice(2).join('/')
    
    // Construct new path with updated locale
    const newPath = `/${newLocale}${pathWithoutLocale ? `/${pathWithoutLocale}` : ''}`
    router.push(newPath)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-700 bg-neutral-800/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-800/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a href={`/${currentLocale}`} className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-white">Scarlett</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <Button
            variant="ghost"
            className="w-9 px-0 text-white hover:bg-neutral-700"
            onClick={toggleLanguage}
          >
            {currentLocale === 'en' ? '中文' : 'English'}
          </Button>
        </div>
      </div>
    </header>
  )
} 