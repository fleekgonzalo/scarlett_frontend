'use client'

import { Home } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from './button'

export function HomeButton() {
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale || 'en'
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed top-4 left-4 z-50 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full"
      onClick={() => router.push(`/${locale}`)}
    >
      <Home className="h-6 w-6 text-white" />
    </Button>
  )
} 