import { type NextRequest } from 'next/server'
import { getIPFSUrl } from '@/lib/utils'
import { TablelandClient } from '@/services/tableland'

export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string, id: string } }
) {
  try {
    // Get song data
    const tableland = TablelandClient.getInstance()
    const song = await tableland.getSong(Number(params.id))
    
    if (!song) {
      return new Response('Song not found', { status: 404 })
    }

    // Determine which question set to load
    const isLearningChinese = params.locale === 'en'
    // If language_1 is "en", then:
    // - questions_cid_1 is for Chinese speakers learning English
    // - questions_cid_2 is for English speakers learning Chinese
    const questionsCid = isLearningChinese ? song.questions_cid_1 : song.questions_cid_2

    if (!questionsCid) {
      return new Response('No questions available', { status: 404 })
    }

    // Fetch questions
    const response = await fetch(getIPFSUrl(questionsCid))
    const questionsData = await response.json()

    // Get current question index from searchParams or default to 0
    const searchParams = request.nextUrl.searchParams
    const questionIndex = parseInt(searchParams.get('q') || '0')
    const question = questionsData.questions[questionIndex]

    if (!question) {
      return new Response('Question not found', { status: 404 })
    }

    // Generate frame metadata
    const frameMetadata = {
      version: 'vNext',
      title: isLearningChinese ? 'Learn Chinese with Scarlett' : '跟 Scarlett 学英语',
      image: {
        src: getIPFSUrl(song.cover_img_cid),
        aspectRatio: '1:1',
      },
      buttons: [
        { label: question.options.a, action: 'post' },
        { label: question.options.b, action: 'post' },
        { label: question.options.c, action: 'post' },
        { label: question.options.d, action: 'post' },
      ],
      postUrl: `${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}/answer?q=${questionIndex}`,
    }

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
        </head>
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