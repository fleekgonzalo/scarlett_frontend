import { type NextRequest } from 'next/server'
import { getIPFSUrl } from '@/lib/ipfs'
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
    const questionsCid = params.locale === 'zh' ? song.questions_cid_1 : song.questions_cid_2

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
        src: `${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}/questions/result?q=${questionIndex}&correct=${isCorrect}`,
        aspectRatio: '1.91:1',
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
              <meta property="fc:frame:post_url" content="${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}/questions?q=${nextQuestionIndex}" />
              <meta property="og:title" content="Correct Answer! - ${isLearningChinese ? 'Learn Chinese' : '学英语'}" />
              <meta property="og:description" content="${isLearningChinese ? 'You got it right!' : '你答对了！'}" />
            </head>
            <body>
              <h1>Correct! ✅</h1>
              <p>Great job! Click to continue to the next question.</p>
            </body>
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
              <meta property="fc:frame:image" content="${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}/questions/complete" />
              <meta property="fc:frame:image:aspect_ratio" content="${frameMetadata.image.aspectRatio}" />
              <meta property="fc:frame:button:1" content="🎉 All Questions Complete!" />
              <meta property="fc:frame:button:2" content="Try More Songs" />
              <meta property="fc:frame:post_url" content="${request.nextUrl.origin}/api/frames/${params.locale}/songs" />
              <meta property="og:title" content="All Questions Complete! - ${isLearningChinese ? 'Learn Chinese' : '学英语'}" />
              <meta property="og:description" content="${isLearningChinese ? 'You completed all questions!' : '你完成了所有问题！'}" />
            </head>
            <body>
              <h1>All Questions Complete! 🎉</h1>
              <p>Congratulations! You've completed all questions for this song.</p>
            </body>
          </html>`,
          {
            headers: {
              'Content-Type': 'text/html',
            },
          }
        )
      }
    } else {
      // Show incorrect answer and try again
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>${frameMetadata.title}</title>
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:image" content="${frameMetadata.image.src}" />
            <meta property="fc:frame:image:aspect_ratio" content="${frameMetadata.image.aspectRatio}" />
            <meta property="fc:frame:button:1" content="❌ Incorrect. Try Again" />
            <meta property="fc:frame:post_url" content="${request.nextUrl.origin}/api/frames/${params.locale}/${params.id}/questions?q=${questionIndex}" />
            <meta property="og:title" content="Incorrect Answer - ${isLearningChinese ? 'Learn Chinese' : '学英语'}" />
            <meta property="og:description" content="${isLearningChinese ? 'Try again!' : '再试一次！'}" />
          </head>
          <body>
            <h1>Incorrect ❌</h1>
            <p>The correct answer was: ${question.options[question.answer]}</p>
            <p>Click to try again.</p>
          </body>
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