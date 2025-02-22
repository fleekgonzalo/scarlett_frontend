'use client'

import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export function RootTemplate({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="relative min-h-screen pb-16">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
} 