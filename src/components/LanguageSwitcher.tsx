'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import useTranslation from '@/hooks/useTranslation'

interface LanguageSwitcherProps {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useTranslation()
  
  const toggleLocale = useCallback(() => {
    const newLocale = locale === 'en' ? 'zh' : 'en'
    
    // Set cookie for Next.js to remember the locale
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`
    
    // Get the current path without the locale prefix
    const currentPath = pathname || '/'
    const pathWithoutLocale = currentPath.replace(/^\/(en|zh)(?:\/|$)/, '/')
    
    // Navigate to the new locale path
    const newPath = `/${newLocale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`
    router.push(newPath)
  }, [locale, pathname, router])
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      className={className}
    >
      {locale === 'en' ? '中文' : 'English'}
    </Button>
  )
}

export default LanguageSwitcher 