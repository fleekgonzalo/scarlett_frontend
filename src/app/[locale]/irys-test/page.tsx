'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'

export default function IrysTestPage() {
  const params = useParams()
  const [isLoading, setIsLoading] = useState(false)
  const [testData, setTestData] = useState<any>(null)
  const [progressData, setProgressData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState('user123')
  const [songId, setSongId] = useState('1')

  // Test the direct transaction endpoint
  const fetchTestData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Fetching test transaction data...')
      const response = await fetch('/api/irys/test')
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Test data received:', data)
      setTestData(data)
    } catch (err) {
      console.error('Error fetching test data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Test the progress endpoint
  const fetchProgressData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`Fetching progress data for userId=${userId}, songId=${songId}...`)
      const response = await fetch(`/api/irys/progress?userId=${userId}&songId=${songId}`)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Progress data received:', data)
      setProgressData(data)
    } catch (err) {
      console.error('Error fetching progress data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Test the direct endpoint
  const fetchDirectData = async (txId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`Fetching direct transaction data for txId=${txId}...`)
      const response = await fetch(`/api/irys/direct?txId=${txId}`)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Direct transaction data received:', data)
      setTestData(data)
    } catch (err) {
      console.error('Error fetching direct data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Irys API Test Page</h1>
        
        <div className="space-y-8">
          {/* Test Transaction Section */}
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-xl text-white mb-4">Test Transaction</h2>
            <Button 
              onClick={fetchTestData}
              disabled={isLoading}
              className="mb-4"
            >
              {isLoading ? <Loading size={16} color="#ffffff" /> : 'Fetch Test Transaction'}
            </Button>
            
            {testData && (
              <div className="mt-4">
                <h3 className="text-lg text-white mb-2">Response:</h3>
                <div className="bg-neutral-700 p-4 rounded overflow-auto max-h-96">
                  <pre className="text-neutral-300 text-sm whitespace-pre-wrap">
                    {JSON.stringify(testData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
          
          {/* Progress Data Section */}
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-xl text-white mb-4">Progress Data</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-neutral-300 mb-2">User ID</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full p-2 bg-neutral-700 text-white rounded"
                />
              </div>
              <div>
                <label className="block text-neutral-300 mb-2">Song ID</label>
                <input
                  type="text"
                  value={songId}
                  onChange={(e) => setSongId(e.target.value)}
                  className="w-full p-2 bg-neutral-700 text-white rounded"
                />
              </div>
            </div>
            
            <Button 
              onClick={fetchProgressData}
              disabled={isLoading}
              className="mb-4"
            >
              {isLoading ? <Loading size={16} color="#ffffff" /> : 'Fetch Progress Data'}
            </Button>
            
            {progressData && (
              <div className="mt-4">
                <h3 className="text-lg text-white mb-2">Response:</h3>
                <div className="bg-neutral-700 p-4 rounded overflow-auto max-h-96">
                  <pre className="text-neutral-300 text-sm whitespace-pre-wrap">
                    {JSON.stringify(progressData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
          
          {/* Direct Transaction Section */}
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-xl text-white mb-4">Direct Transaction</h2>
            
            <div className="mb-4">
              <label className="block text-neutral-300 mb-2">Transaction ID</label>
              <input
                type="text"
                defaultValue="75DijgjLEpYjyhGbAxveYYzE4MYak9LGpbyv5QzG66jT"
                id="txId"
                className="w-full p-2 bg-neutral-700 text-white rounded"
              />
            </div>
            
            <Button 
              onClick={() => {
                const txId = (document.getElementById('txId') as HTMLInputElement).value;
                fetchDirectData(txId);
              }}
              disabled={isLoading}
              className="mb-4"
            >
              {isLoading ? <Loading size={16} color="#ffffff" /> : 'Fetch Direct Transaction'}
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="mt-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
} 