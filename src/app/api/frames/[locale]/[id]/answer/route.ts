import { type NextRequest } from 'next/server'
import { getIPFSUrl } from '@/lib/utils'
import { TablelandClient } from '@/services/tableland'

export async function POST(
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

    // Get current question index from searchParams
    const searchParams = request.nextUrl.searchParams
    const questionIndex = parseInt(searchParams.get('q') || '0')

    // Fetch questions
    const response = await fetch(getIPFSUrl(questionsCid))
    const questionsData = await response.json()
    const question = questionsData.questions[questionIndex]

    if (!question) {
      return new Response('Question not found', { status: 404 })
    }

    // Get the selected answer from the button index (1-based)
    const formData = await request.formData()
    const buttonIndex = parseInt(formData.get('buttonIndex') as string)
    const selectedAnswer = String.fromCharCode(96 + buttonIndex) // Convert 1-4 to a-d

    // Check if answer is correct
    const isCorrect = selectedAnswer === question.answer

    // Determine if there are more questions
    const hasMoreQuestions = questionIndex < questionsData.questions.length - 1
    const nextQuestionIndex = questionIndex + 1

    // Generate frame metadata for response
    const frameMetadata = {
      version: 'vNext',
      title: isLearningChinese ? 'Learn Chinese with Scarlett' : '跟 Scarlett 学英语',
      image: {
        src: getIPFSUrl(song.cover_img_cid),
        aspectRatio: '1:1',
      },
    }

    if (isCorrect) {
      if (hasMoreQuestions) {
        // Show success and next question button
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head>
              <title>${frameMetadata.title}</title>
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="${frameMetadata.image.src}" />
              <meta property="fc:frame:image:aspect_ratio" content="${frameMetadata.image.aspectRatio}" />
              <meta property="fc:frame:button:1" content="✅ Correct! Next Question →" />
              <meta property="fc:frame:post_url" content="${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}?q=${nextQuestionIndex}" />
            </head>
          </html>`,
          {
            headers: {
              'Content-Type': 'text/html',
            },
          }
        )
      } else {
        // Show completion message
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head>
              <title>${frameMetadata.title}</title>
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="${frameMetadata.image.src}" />
              <meta property="fc:frame:image:aspect_ratio" content="${frameMetadata.image.aspectRatio}" />
              <meta property="fc:frame:button:1" content="🎉 All Questions Complete!" />
              <meta property="fc:frame:button:2" content="Try More Songs" />
              <meta property="fc:frame:post_url" content="${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}/complete" />
            </head>
          </html>`,
          {
            headers: {
              'Content-Type': 'text/html',
            },
          }
        )
      }
    } else {
      // Show incorrect answer and explanation
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>${frameMetadata.title}</title>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${frameMetadata.image.src}" />
            <meta property="fc:frame:image:aspect_ratio" content="${frameMetadata.image.aspectRatio}" />
            <meta property="fc:frame:button:1" content="❌ Incorrect. Try Again" />
            <meta property="fc:frame:post_url" content="${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}?q=${questionIndex}" />
          </head>
        </html>`,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      )
    }
  } catch (error) {
    console.error('Frame error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 