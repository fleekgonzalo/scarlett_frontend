'use client'

import { useEffect } from 'react'
import { use } from 'react'
import { useLanguageStore } from '@/stores/languageStore'

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const { setLocale } = useLanguageStore()

  useEffect(() => {
    setLocale(locale as 'en' | 'zh')
  }, [locale, setLocale])

  return children
} 