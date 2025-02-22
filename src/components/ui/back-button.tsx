'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from './button'

export function BackButton() {
  const router = useRouter()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed top-4 left-4 z-50 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full"
      onClick={() => router.back()}
    >
      <ChevronLeft className="h-6 w-6 text-white" />
    </Button>
  )
} 