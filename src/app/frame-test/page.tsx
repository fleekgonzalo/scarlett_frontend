'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function FrameTestPage() {
  const [baseUrl, setBaseUrl] = useState<string>('')
  const [metaTags, setMetaTags] = useState<{name: string, content: string}[]>([])
  const [songId, setSongId] = useState<string>('1')
  const [locale, setLocale] = useState<string>('en')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
      
      // Get all meta tags that start with fc:
      const fcTags = Array.from(document.querySelectorAll('meta'))
        .filter(tag => tag.getAttribute('property')?.startsWith('fc:'))
        .map(tag => ({
          name: tag.getAttribute('property') || '',
          content: tag.getAttribute('content') || ''
        }))
      
      setMetaTags(fcTags)
    }
  }, [])
  
  const testFrameUrl = `${baseUrl}/api/frames/test`
  const frameUrl = `${baseUrl}/${locale}/songs/${songId}/frame`
  const debugUrl = `${baseUrl}/frame-debug`
  const directApiUrl = `${baseUrl}/api/frames/${locale}/${songId}/questions?q=0`
  const directImageUrl = `${baseUrl}/api/frames/${locale}/${songId}/questions/image?q=0`
  
  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Frame Test Page</h1>
        
        <div className="mb-8 bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Frame Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Song ID</label>
              <input
                type="text"
                value={songId}
                onChange={(e) => setSongId(e.target.value)}
                className="w-full bg-neutral-700 text-white px-3 py-2 rounded"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Locale</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full bg-neutral-700 text-white px-3 py-2 rounded"
              >
                <option value="en">English (en)</option>
                <option value="zh">Chinese (zh)</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simple Test Frame</h2>
            <div className="bg-neutral-700 p-4 rounded mb-4 font-mono text-sm break-all">
              {testFrameUrl}
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={() => navigator.clipboard.writeText(testFrameUrl)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Copy URL
              </Button>
              
              <Button asChild variant="outline">
                <Link href={testFrameUrl} target="_blank">
                  Open Frame
                </Link>
              </Button>
            </div>
            
            <div className="mt-6">
              <p className="text-neutral-400 mb-2">
                This is a simple test frame with static content.
              </p>
            </div>
          </div>
          
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Song Frame</h2>
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
                <Link href={frameUrl} target="_blank">
                  Open Frame
                </Link>
              </Button>
            </div>
            
            <div className="mt-6">
              <p className="text-neutral-400 mb-2">
                This is the song frame with dynamic content.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-8 bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Direct API Access</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium mb-2">Questions API</h3>
              <div className="bg-neutral-700 p-4 rounded mb-4 font-mono text-sm break-all">
                {directApiUrl}
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={() => navigator.clipboard.writeText(directApiUrl)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Copy URL
                </Button>
                
                <Button asChild variant="outline">
                  <Link href={directApiUrl} target="_blank">
                    Open API
                  </Link>
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Image API</h3>
              <div className="bg-neutral-700 p-4 rounded mb-4 font-mono text-sm break-all">
                {directImageUrl}
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={() => navigator.clipboard.writeText(directImageUrl)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Copy URL
                </Button>
                
                <Button asChild variant="outline">
                  <Link href={directImageUrl} target="_blank">
                    Open Image
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-8 bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Tools</h2>
          
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Frame Debug Page</h3>
            <div className="bg-neutral-700 p-4 rounded mb-4 font-mono text-sm break-all">
              {debugUrl}
            </div>
            
            <div className="flex gap-4">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href={debugUrl}>
                  Go to Debug Page
                </Link>
              </Button>
            </div>
            
            <p className="mt-4 text-neutral-400">
              The debug page provides detailed information about your frame configuration, API responses, and more.
            </p>
          </div>
        </div>
        
        <div className="mb-8 bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Current Page Frame Metadata</h2>
          
          {metaTags.length > 0 ? (
            <div className="bg-neutral-700 p-4 rounded font-mono text-sm">
              {metaTags.map((tag, index) => (
                <div key={index} className="mb-1">
                  <span className="text-green-400">{tag.name}</span>: <span className="text-amber-300">{tag.content}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400">No Frame metadata found on this page</p>
          )}
          
          <p className="mt-4 text-neutral-400">
            If you don't see any Frame metadata above, try sharing the URL directly.
          </p>
        </div>
        
        <div className="mt-8 bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Testing Instructions</h2>
          
          <ol className="list-decimal list-inside space-y-2 text-neutral-300">
            <li>Copy one of the URLs above</li>
            <li>Share it on Farcaster</li>
            <li>It should appear as a Frame with buttons</li>
            <li>If it doesn't work:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-neutral-400">
                <li>Check the console for errors</li>
                <li>Visit the Debug Page to see detailed information</li>
                <li>Try accessing the direct API URLs to see if they return valid responses</li>
                <li>Verify your NEXT_PUBLIC_BASE_URL environment variable is set correctly</li>
              </ul>
            </li>
          </ol>
          
          <div className="mt-6">
            <p className="text-neutral-400">
              For testing, you can use the <a href="https://warpcast.com/~/developers/frames" className="text-blue-400 underline" target="_blank" rel="noopener noreferrer">Warpcast Frame validator</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 