'use client'

import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export function RootTemplate({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-neutral-900">
      {children}
    </div>
  )
} 