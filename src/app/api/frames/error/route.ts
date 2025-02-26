import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const buttonIndex = formData.get('untrustedData[buttonIndex]')
    
    console.log('Error frame button clicked:', { buttonIndex })
    
    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    
    // Button 1 = Try Again, Button 2 = Go to Songs
    if (buttonIndex === '2') {
      // Redirect to songs page
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Redirecting to Songs</title>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${baseUrl}/api/frames/test-image" />
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            <meta property="fc:frame:button:1" content="Go to Songs" />
            <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/test" />
            <meta property="og:title" content="Redirecting to Songs - Scarlett" />
            <meta property="og:description" content="Click to browse songs" />
          </head>
          <body>
            <h1>Redirecting to Songs</h1>
            <p>Click the button below to browse songs</p>
            <script>
              window.location.href = "/en/songs";
            </script>
          </body>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      )
    } else {
      // Default: Try Again - show a simple retry message
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Try Again - Scarlett</title>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${baseUrl}/api/frames/test-image" />
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            <meta property="fc:frame:button:1" content="Browse Songs" />
            <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/error?action=songs" />
            <meta property="og:title" content="Try Again - Scarlett" />
            <meta property="og:description" content="Please try again later" />
          </head>
          <body>
            <h1>Please Try Again Later</h1>
            <p>We're experiencing some technical difficulties. Please try again later or browse our songs.</p>
          </body>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      )
    }
  } catch (error) {
    console.error('Error handling error frame:', error)
    
    // Return a simple error response
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Error - Scarlett</title>
          <meta property="og:title" content="Error - Scarlett" />
          <meta property="og:description" content="An error occurred" />
        </head>
        <body>
          <h1>Error</h1>
          <p>An error occurred while processing your request.</p>
          <p>Error details: ${error instanceof Error ? error.message : String(error)}</p>
        </body>
      </html>`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  }
} 