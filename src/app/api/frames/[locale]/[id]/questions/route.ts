import { type NextRequest } from 'next/server'
import { getIPFSUrl } from '@/lib/ipfs'
import { TablelandClient } from '@/services/tableland'

export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string, id: string } }
) {
  try {
    console.log('Handling questions frame request:', { 
      locale: params.locale, 
      id: params.id,
      url: request.url
    })
    
    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
    
    // Try to get song data, but provide fallback if Tableland is unavailable
    let song
    try {
      // Get song data
      const tableland = TablelandClient.getInstance()
      song = await tableland.getSong(Number(params.id))
      
      if (!song) {
        console.error('Song not found:', params.id)
        return createErrorResponse(request, `Song with ID ${params.id} not found`, params.locale)
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
    // If language_1 is "en", then:
    // - questions_cid_1 is for Chinese speakers learning English (zh locale)
    // - questions_cid_2 is for English speakers learning Chinese (en locale)
    // We need to use the locale directly to determine which CID to use
    const questionsCid = params.locale === 'zh' ? song.questions_cid_1 : song.questions_cid_2

    if (!questionsCid) {
      console.error('No questions available for this song/locale:', {
        locale: params.locale,
        songId: params.id,
        questions_cid_1: song.questions_cid_1,
        questions_cid_2: song.questions_cid_2
      })
      return createErrorResponse(request, `No questions available for this song in ${params.locale} locale`, params.locale)
    }

    // Try to fetch questions, but provide fallback if IPFS is unavailable
    let questionsData
    try {
      // Fetch questions
      console.log('Fetching questions from IPFS:', getIPFSUrl(questionsCid))
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
        
        // Use fallback questions data for testing
        questionsData = createFallbackQuestionsData()
        console.log('Using fallback questions data for testing')
      } else {
        try {
          questionsData = await response.json()
        } catch (error) {
          console.error('Failed to parse questions JSON:', error)
          questionsData = createFallbackQuestionsData()
          console.log('Using fallback questions data due to JSON parse error')
        }
      }
    } catch (error) {
      console.error('Error fetching questions from IPFS:', error)
      questionsData = createFallbackQuestionsData()
      console.log('Using fallback questions data due to fetch error')
    }
    
    // Validate questions data structure
    if (!questionsData || !questionsData.questions || !Array.isArray(questionsData.questions) || questionsData.questions.length === 0) {
      console.error('Invalid questions data format:', questionsData)
      questionsData = createFallbackQuestionsData()
      console.log('Using fallback questions data due to invalid format')
    }
    
    console.log('Questions data ready:', {
      count: questionsData.questions.length
    })

    // Get current question index from searchParams or default to 0
    const searchParams = request.nextUrl.searchParams
    const questionIndex = parseInt(searchParams.get('q') || '0')
    
    // Validate question index
    if (isNaN(questionIndex) || questionIndex < 0) {
      console.error('Invalid question index:', searchParams.get('q'))
      return createErrorResponse(request, `Invalid question index: ${searchParams.get('q')}`, params.locale)
    }
    
    // Check if question exists at the specified index
    if (questionIndex >= questionsData.questions.length) {
      console.error('Question index out of bounds:', {
        index: questionIndex,
        totalQuestions: questionsData.questions.length
      })
      return createErrorResponse(request, `Question index out of bounds: ${questionIndex} (total: ${questionsData.questions.length})`, params.locale)
    }
    
    const question = questionsData.questions[questionIndex]

    if (!question) {
      console.error('Question not found:', {
        index: questionIndex,
        totalQuestions: questionsData.questions.length
      })
      return createErrorResponse(request, `Question at index ${questionIndex} not found`, params.locale)
    }
    
    // Validate question structure
    if (!question.question || !question.options || !question.options.a || !question.options.b || !question.options.c || !question.options.d) {
      console.error('Invalid question format:', question)
      return createErrorResponse(request, 'Invalid question format', params.locale)
    }

    // Generate audio URL
    const audioUrl = question.audio_cid ? getIPFSUrl(question.audio_cid) : null

    // Generate frame metadata
    const frameMetadata = {
      version: 'vNext',
      title: isLearningChinese ? 'Learn Chinese with Scarlett' : '跟 Scarlett 学英语',
      image: {
        src: `${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}/questions/image?q=${questionIndex}`,
        aspectRatio: '1.91:1',
      },
      buttons: [
        { label: question.options.a, action: 'post' },
        { label: question.options.b, action: 'post' },
        { label: question.options.c, action: 'post' },
        { label: question.options.d, action: 'post' },
      ],
      postUrl: `${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}/questions/answer?q=${questionIndex}`,
      audio: audioUrl ? {
        src: audioUrl,
      } : undefined,
    }

    console.log('Returning frame response for question:', {
      index: questionIndex,
      question: question.question.substring(0, 30) + '...',
      imageUrl: frameMetadata.image.src,
      postUrl: frameMetadata.postUrl
    })

    // Return frame response
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>${frameMetadata.title}</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${frameMetadata.image.src}" />
          <meta property="fc:frame:image:aspect_ratio" content="${frameMetadata.image.aspectRatio}" />
          <meta property="fc:frame:button:1" content="${frameMetadata.buttons[0].label}" />
          <meta property="fc:frame:button:2" content="${frameMetadata.buttons[1].label}" />
          <meta property="fc:frame:button:3" content="${frameMetadata.buttons[2].label}" />
          <meta property="fc:frame:button:4" content="${frameMetadata.buttons[3].label}" />
          <meta property="fc:frame:post_url" content="${frameMetadata.postUrl}" />
          ${audioUrl ? `<meta property="fc:frame:audio" content="${audioUrl}" />` : ''}
          <meta property="og:title" content="${song.song_title} - ${isLearningChinese ? 'Learn Chinese' : '学英语'}" />
          <meta property="og:description" content="${isLearningChinese ? 'Interactive Chinese learning with Scarlett' : '与 Scarlett 互动学习英语'}" />
          <meta property="og:image" content="${getIPFSUrl(song.cover_img_cid)}" />
        </head>
        <body>
          <h1>${question.question}</h1>
          <p>Question ${questionIndex + 1} of ${questionsData.questions.length}</p>
          <p>Click to answer in Farcaster</p>
          <p>
            <a href="/${params.locale}/songs/${song.id}/questions">Go to questions page</a>
          </p>
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
    console.error('Frame error:', error)
    return createErrorResponse(
      request, 
      error instanceof Error ? error.message : String(error),
      params.locale
    )
  }
}

// Helper function to create fallback questions data for testing
function createFallbackQuestionsData() {
  return {
    questions: [
      {
        question: "What is the Chinese word for 'hello'?",
        options: {
          a: "你好 (nǐ hǎo)",
          b: "谢谢 (xiè xiè)",
          c: "再见 (zài jiàn)",
          d: "对不起 (duì bù qǐ)"
        },
        answer: "a",
        audio_cid: null
      },
      {
        question: "How do you say 'thank you' in Chinese?",
        options: {
          a: "你好 (nǐ hǎo)",
          b: "谢谢 (xiè xiè)",
          c: "再见 (zài jiàn)",
          d: "对不起 (duì bù qǐ)"
        },
        answer: "b",
        audio_cid: null
      },
      {
        question: "What does '再见' mean?",
        options: {
          a: "Hello",
          b: "Thank you",
          c: "Goodbye",
          d: "Sorry"
        },
        answer: "c",
        audio_cid: null
      }
    ]
  }
}

// Helper function to create an error response with Frame metadata
function createErrorResponse(request: NextRequest, errorMessage: string, locale: string): Response {
  console.error('Creating error response:', errorMessage)
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
  
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