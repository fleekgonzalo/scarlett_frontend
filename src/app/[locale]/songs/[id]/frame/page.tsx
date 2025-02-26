import { TablelandClient } from '@/services/tableland'
import { redirect } from 'next/navigation'
import { getIPFSUrl } from '@/lib/ipfs'

// This page renders a Frame for Farcaster
export default async function FramePage({ params }: { params: { locale: string, id: string } }) {
  try {
    console.log('Generating frame page for:', { locale: params.locale, id: params.id })
    
    // Base URL for API routes
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scarlett.vercel.app'
    console.log('Using base URL:', baseUrl)
    
    // Try to get song data, but provide fallback if Tableland is unavailable
    let song
    try {
      // Get song data
      const tableland = TablelandClient.getInstance()
      song = await tableland.getSong(Number(params.id))
      
      if (!song) {
        console.error('Song not found:', params.id)
        return createErrorResponse(`Song with ID ${params.id} not found`, params.locale, baseUrl)
      }
    } catch (error) {
      console.error('Error fetching song data:', error)
      
      // Create a fallback song with minimal data for testing
      song = {
        id: Number(params.id),
        song_title: 'Test Song',
        artist_name: 'Test Artist',
        cover_img_cid: 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku', // Use a default CID
        questions_cid_1: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', // Use a default CID
        questions_cid_2: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', // Use a default CID
      }
      
      console.log('Using fallback song data for testing:', song)
    }

    // Determine which question set to load
    const isLearningChinese = params.locale === 'en'
    const questionsCid = params.locale === 'zh' ? song.questions_cid_1 : song.questions_cid_2

    if (!questionsCid) {
      console.error('No questions available for this song/locale')
      return createErrorResponse(`No questions available for this song in ${params.locale} locale`, params.locale, baseUrl)
    }
    
    // Validate that questions exist by fetching the first one
    try {
      console.log('Validating questions data from IPFS:', getIPFSUrl(questionsCid))
      const response = await fetch(getIPFSUrl(questionsCid), {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        console.error('Failed to fetch questions from IPFS:', {
          status: response.status,
          statusText: response.statusText,
          cid: questionsCid
        })
        return createErrorResponse(`Failed to fetch questions: ${response.status} ${response.statusText}`, params.locale, baseUrl)
      }
      
      const questionsData = await response.json()
      
      if (!questionsData || !questionsData.questions || !Array.isArray(questionsData.questions) || questionsData.questions.length === 0) {
        console.error('Invalid questions data format:', questionsData)
        return createErrorResponse('Invalid questions data format', params.locale, baseUrl)
      }
      
      console.log('Questions data validated successfully:', {
        count: questionsData.questions.length
      })
    } catch (error) {
      console.error('Error validating questions data:', error)
      return createErrorResponse(`Error validating questions: ${error instanceof Error ? error.message : String(error)}`, params.locale, baseUrl)
    }
    
    // Return HTML with Frame metadata
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>${song.song_title} - ${params.locale === 'zh' ? '学英语' : 'Learn Chinese'}</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${baseUrl}/api/frames/${params.locale}/${song.id}/questions/image?q=0" />
          <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
          <meta property="fc:frame:button:1" content="Start Learning" />
          <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/${params.locale}/${song.id}/questions?q=0" />
          <meta property="og:title" content="${song.song_title} - ${params.locale === 'zh' ? '学英语' : 'Learn Chinese'}" />
          <meta property="og:description" content="Learn ${params.locale === 'zh' ? 'English' : 'Chinese'} with ${song.song_title} by ${song.artist_name || 'Artist'}" />
          <meta property="og:image" content="${getIPFSUrl(song.cover_img_cid)}" />
        </head>
        <body>
          <h1>${song.song_title}</h1>
          <p>Learn ${params.locale === 'zh' ? 'English' : 'Chinese'} with ${song.song_title} by ${song.artist_name || 'Artist'}</p>
          <p>Click to start learning!</p>
          <p>
            <a href="/${params.locale}/songs/${song.id}/questions">Go to questions page</a>
          </p>
          <script>
            // Redirect to questions page after a short delay
            setTimeout(() => {
              window.location.href = "/${params.locale}/songs/${song.id}/questions";
            }, 2000);
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
  } catch (error) {
    console.error('Error generating frame page:', error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://scarlett.vercel.app'
    return createErrorResponse(error instanceof Error ? error.message : String(error), params.locale, baseUrl)
  }
}

// Helper function to create an error response
function createErrorResponse(errorMessage: string, locale: string, baseUrl: string): Response {
  return new Response(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>Error - Scarlett</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${baseUrl}/api/frames/error-image?error=${encodeURIComponent(errorMessage)}" />
        <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
        <meta property="fc:frame:button:1" content="Try Again" />
        <meta property="fc:frame:button:2" content="Go to Songs" />
        <meta property="fc:frame:post_url" content="${baseUrl}/api/frames/error" />
        <meta property="og:title" content="Error - Scarlett" />
        <meta property="og:description" content="An error occurred while loading the frame" />
      </head>
      <body>
        <h1>Error</h1>
        <p>An error occurred while loading the frame. Please try again later.</p>
        <p>Error details: ${errorMessage}</p>
        <p>
          <a href="/${locale}/songs">Go to songs page</a>
        </p>
        <script>
          // Redirect to songs page after a short delay
          setTimeout(() => {
            window.location.href = "/${locale}/songs";
          }, 5000);
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
} 