'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loading } from '@/components/ui/loading'

export default function IrysGraphQLPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(`query {
  transactions(
    tags: [
      { name: "App-Name", values: ["Scarlett"] }
      { name: "Type", values: ["user-progress"] }
      { name: "User-Id", values: ["0x70b499c24Ff19FeBb8853B5F059e0506b4ce8905"] }
      { name: "Song-Id", values: ["1"] }
    ]
    order: DESC
    limit: 1
  ) {
    edges {
      node {
        id
        tags {
          name
          value
        }
      }
    }
  }
}`)

  const executeQuery = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Executing GraphQL query:', query)
      const response = await fetch('https://uploader.irys.xyz/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })
      
      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('GraphQL response:', data)
      setResponse(data)
    } catch (err) {
      console.error('Error executing GraphQL query:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Irys GraphQL Test</h1>
        
        <div className="bg-neutral-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl text-white mb-4">GraphQL Query</h2>
          
          <div className="mb-4">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-64 p-4 bg-neutral-700 text-white rounded font-mono text-sm"
              placeholder="Enter your GraphQL query here..."
            />
          </div>
          
          <Button 
            onClick={executeQuery}
            disabled={isLoading}
            className="mb-4"
          >
            {isLoading ? <Loading size={16} color="#ffffff" /> : 'Execute Query'}
          </Button>
          
          {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
              <p className="text-red-300">{error}</p>
            </div>
          )}
        </div>
        
        {response && (
          <div className="bg-neutral-800 rounded-lg p-6">
            <h2 className="text-xl text-white mb-4">Response</h2>
            <div className="bg-neutral-700 p-4 rounded overflow-auto max-h-96">
              <pre className="text-neutral-300 text-sm whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}
        
        <div className="mt-8 bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl text-white mb-4">Common Queries</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg text-white mb-2">Search by Transaction ID</h3>
              <Button 
                onClick={() => {
                  setQuery(`query {
  transactions(
    ids: ["75DijgjLEpYjyhGbAxveYYzE4MYak9LGpbyv5QzG66jT"]
  ) {
    edges {
      node {
        id
        tags {
          name
          value
        }
      }
    }
  }
}`)
                }}
                variant="outline"
                className="mr-2"
              >
                Load Query
              </Button>
            </div>
            
            <div>
              <h3 className="text-lg text-white mb-2">Search by User ID</h3>
              <Button 
                onClick={() => {
                  setQuery(`query {
  transactions(
    tags: [
      { name: "User-Id", values: ["0x70b499c24Ff19FeBb8853B5F059e0506b4ce8905"] }
    ]
    order: DESC
    limit: 10
  ) {
    edges {
      node {
        id
        tags {
          name
          value
        }
      }
    }
  }
}`)
                }}
                variant="outline"
                className="mr-2"
              >
                Load Query
              </Button>
            </div>
            
            <div>
              <h3 className="text-lg text-white mb-2">Search by App Name</h3>
              <Button 
                onClick={() => {
                  setQuery(`query {
  transactions(
    tags: [
      { name: "App-Name", values: ["Scarlett"] }
    ]
    order: DESC
    limit: 10
  ) {
    edges {
      node {
        id
        tags {
          name
          value
        }
      }
    }
  }
}`)
                }}
                variant="outline"
              >
                Load Query
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 