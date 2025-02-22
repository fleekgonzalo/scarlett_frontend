'use client'

import { usePathname } from 'next/navigation'
import { RootTemplate } from './RootTemplate'

export function Providers({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Don't show header/footer on song pages
  const isBasicLayout = pathname.includes('/songs/')

  if (isBasicLayout) {
    return children
  }

  return (
    <RootTemplate>
      {children}
    </RootTemplate>
  )
} 