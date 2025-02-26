import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Test Frame</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${baseUrl}/api/frames/test-image" />
        <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
        <meta property="fc:frame:button:1" content="Option A" />
        <meta property="fc:frame:button:2" content="Option B" />
        <meta property="fc:frame:button:3" content="Option C" />
        <meta property="fc:frame:button:4" content="Option D" />
        <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/test" />
        <meta property="og:title" content="Test Frame" />
        <meta property="og:description" content="A test frame for Farcaster" />
        <meta property="og:image" content="${baseUrl}/api/frames/test-image" />
      </head>
      <body>
        <h1>Test Frame</h1>
        <p>This is a test frame for Farcaster.</p>
        <p>Base URL: ${baseUrl}</p>
        <p>Image URL: ${baseUrl}/api/frames/test-image</p>
      </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html',
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  
  try {
    const formData = await request.formData()
    const buttonIndex = formData.get('buttonIndex')
    
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Test Frame Response</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${baseUrl}/api/frames/test-image" />
          <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
          <meta property="fc:frame:button:1" content="Try Again" />
          <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/test" />
          <meta property="og:title" content="Test Frame Response" />
          <meta property="og:description" content="You clicked button ${buttonIndex}" />
          <meta property="og:image" content="${baseUrl}/api/frames/test-image" />
        </head>
        <body>
          <h1>Test Frame Response</h1>
          <p>You clicked button ${buttonIndex}</p>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  } catch (error) {
    console.error('Frame error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 