'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function FrameTestPage() {
  const params = useParams()
  const [origin, setOrigin] = useState<string>('')
  const [frameUrl, setFrameUrl] = useState<string>('')
  const [metaTags, setMetaTags] = useState<string[]>([])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin
      setOrigin(currentOrigin)
      
      // Create frame URL
      const framePageUrl = `${currentOrigin}/${params?.locale}/songs/${params?.id}/frame`
      setFrameUrl(framePageUrl)
      
      // Get meta tags from the current page
      const tags = Array.from(document.querySelectorAll('meta'))
        .filter(tag => tag.getAttribute('property')?.startsWith('fc:'))
        .map(tag => `${tag.getAttribute('property')}: ${tag.getAttribute('content')}`)
      
      setMetaTags(tags)
    }
  }, [params?.locale, params?.id])
  
  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Frame Test Page</h1>
        
        <div className="bg-neutral-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Share This URL on Farcaster</h2>
          <div className="bg-neutral-700 p-4 rounded mb-4 font-mono text-sm break-all">
            {frameUrl}
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={() => navigator.clipboard.writeText(frameUrl)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Copy URL
            </Button>
            
            <Button asChild variant="outline">
              <Link href={`/${params?.locale}/songs/${params?.id}/questions`}>
                Go to Questions
              </Link>
            </Button>
          </div>
        </div>
        
        <div className="bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Page Frame Metadata</h2>
          
          {metaTags.length > 0 ? (
            <div className="bg-neutral-700 p-4 rounded font-mono text-sm">
              {metaTags.map((tag, index) => (
                <div key={index} className="mb-2">{tag}</div>
              ))}
            </div>
          ) : (
            <p className="text-red-400">No Frame metadata found on this page</p>
          )}
          
          <div className="mt-6">
            <p className="text-neutral-400 mb-2">
              If you don't see any Frame metadata above, try sharing the URL directly.
            </p>
            <p className="text-neutral-400">
              For testing, you can use the <a href="https://warpcast.com/~/developers/frames" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Warpcast Frame validator</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 