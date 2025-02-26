'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function FrameDebugPage() {
  const [baseUrl, setBaseUrl] = useState<string>('')
  const [debugData, setDebugData] = useState<any>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin)
    }
  }, [])
  
  const fetchDebugData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${baseUrl}/api/frames/debug`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setDebugData(data)
    } catch (error) {
      console.error('Error fetching debug data:', error)
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }
  
  const testUrls = [
    { name: 'Debug API', url: `${baseUrl}/api/frames/debug` },
    { name: 'Test Frame', url: `${baseUrl}/api/frames/test` },
    { name: 'Test Image', url: `${baseUrl}/api/frames/test-image` },
    { name: 'Song Frame (ID: 1)', url: `${baseUrl}/en/songs/1/frame` },
    { name: 'Questions API (ID: 1)', url: `${baseUrl}/api/frames/en/1/questions?q=0` },
    { name: 'Questions Image (ID: 1)', url: `${baseUrl}/api/frames/en/1/questions/image?q=0` },
  ]
  
  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Frame Debug Page</h1>
        
        <div className="mb-8">
          <Button 
            onClick={fetchDebugData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 mb-4"
          >
            {loading ? 'Loading...' : 'Fetch Debug Data'}
          </Button>
          
          {error && (
            <div className="bg-red-900/50 border border-red-700 p-4 rounded mb-4">
              <h3 className="text-lg font-semibold text-red-400">Error</h3>
              <p className="text-red-200">{error}</p>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {testUrls.map((item, index) => (
            <div key={index} className="bg-neutral-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">{item.name}</h2>
              <div className="bg-neutral-700 p-4 rounded mb-4 font-mono text-sm break-all">
                {item.url}
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={() => navigator.clipboard.writeText(item.url)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Copy URL
                </Button>
                
                <Button asChild variant="outline">
                  <Link href={item.url} target="_blank">
                    Open
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {debugData && (
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Data</h2>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Environment</h3>
              <div className="bg-neutral-700 p-4 rounded">
                <p><strong>Base URL:</strong> {debugData.environment.baseUrl}</p>
                <p><strong>Node Env:</strong> {debugData.environment.nodeEnv}</p>
                <p><strong>Request Origin:</strong> {debugData.request.origin}</p>
              </div>
            </div>
            
            {debugData.song && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Song Data</h3>
                <div className="bg-neutral-700 p-4 rounded">
                  <p><strong>ID:</strong> {debugData.song.id}</p>
                  <p><strong>Title:</strong> {debugData.song.song_title}</p>
                  <p><strong>Artist:</strong> {debugData.song.artist_name}</p>
                  <p><strong>Cover Image:</strong> {debugData.ipfsGateways.coverImage}</p>
                  <p><strong>Questions CID 1:</strong> {debugData.song.questions_cid_1}</p>
                  <p><strong>Questions CID 2:</strong> {debugData.song.questions_cid_2}</p>
                </div>
              </div>
            )}
            
            {debugData.questionsData && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Questions Data</h3>
                <div className="bg-neutral-700 p-4 rounded overflow-auto max-h-96">
                  <pre className="text-xs">{JSON.stringify(debugData.questionsData, null, 2)}</pre>
                </div>
              </div>
            )}
            
            {debugData.questionsError && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 text-red-400">Questions Error</h3>
                <div className="bg-red-900/50 border border-red-700 p-4 rounded">
                  <p className="text-red-200">{debugData.questionsError}</p>
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Full Debug Data</h3>
              <div className="bg-neutral-700 p-4 rounded overflow-auto max-h-96">
                <pre className="text-xs">{JSON.stringify(debugData, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 