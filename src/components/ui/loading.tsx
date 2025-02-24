'use client'

import { ClipLoader } from 'react-spinners'
import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: number
  color?: string
  className?: string
}

export function Loading({ 
  size = 20,
  color = "#ffffff",
  className
}: LoadingProps) {
  return (
    <div className={className}>
      <ClipLoader
        color={color}
        size={size}
        aria-label="Loading"
      />
    </div>
  )
} 