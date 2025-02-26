import { NextRequest } from 'next/server'
import { getIPFSUrl } from '@/lib/ipfs'
import { TablelandClient } from '@/services/tableland'
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from 'canvas'

// Register fonts if needed
// registerFont('./public/fonts/NotoSans-Regular.ttf', { family: 'Noto Sans' })
// registerFont('./public/fonts/NotoSansSC-Regular.ttf', { family: 'Noto Sans SC' })

export async function GET(
  request: NextRequest,
  { params }: { params: { locale: string, id: string } }
) {
  try {
    console.log('Handling questions image request:', { 
      locale: params.locale, 
      id: params.id,
      url: request.url
    })
    
    // Try to get song data, but provide fallback if Tableland is unavailable
    let song
    try {
      // Get song data
      const tableland = TablelandClient.getInstance()
      song = await tableland.getSong(Number(params.id))
      
      if (!song) {
        console.error('Song not found:', params.id)
        return createErrorImage('Song not found')
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
      console.error('No questions available for this song/locale:', {
        locale: params.locale,
        songId: params.id,
        questions_cid_1: song.questions_cid_1,
        questions_cid_2: song.questions_cid_2
      })
      return createErrorImage('No questions available for this song')
    }

    // Get current question index from searchParams
    const searchParams = request.nextUrl.searchParams
    const questionIndex = parseInt(searchParams.get('q') || '0')
    
    // Validate question index
    if (isNaN(questionIndex) || questionIndex < 0) {
      console.error('Invalid question index:', searchParams.get('q'))
      return createErrorImage(`Invalid question index: ${searchParams.get('q')}`)
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
    
    // Check if question exists at the specified index
    if (questionIndex >= questionsData.questions.length) {
      console.error('Question index out of bounds:', {
        index: questionIndex,
        totalQuestions: questionsData.questions.length
      })
      return createErrorImage(`Question index out of bounds: ${questionIndex} (total: ${questionsData.questions.length})`)
    }
    
    const question = questionsData.questions[questionIndex]

    if (!question) {
      console.error('Question not found:', {
        index: questionIndex,
        totalQuestions: questionsData.questions.length
      })
      return createErrorImage(`Question at index ${questionIndex} not found`)
    }
    
    // Validate question structure
    if (!question.question || !question.options || !question.options.a || !question.options.b || !question.options.c || !question.options.d) {
      console.error('Invalid question format:', question)
      return createErrorImage('Invalid question format')
    }

    // Create canvas with 1.91:1 aspect ratio (standard for Frames)
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Load background image (song cover)
    console.log('Loading cover image:', getIPFSUrl(song.cover_img_cid))
    let backgroundImage
    try {
      backgroundImage = await loadImage(getIPFSUrl(song.cover_img_cid))
    } catch (error) {
      console.error('Failed to load cover image:', error)
      
      // Create a simple background if the cover image fails to load
      ctx.fillStyle = '#1e1e1e'
      ctx.fillRect(0, 0, width, height)
      
      // Add a gradient overlay
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, 'rgba(30, 30, 30, 1)')
      gradient.addColorStop(1, 'rgba(60, 60, 60, 1)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      
      // Draw song title and artist in place of the cover
      ctx.fillStyle = 'white'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(song.song_title || 'Song Title', width / 2, height / 3)
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.font = '32px Arial'
      ctx.fillText(song.artist_name || 'Artist', width / 2, height / 3 + 50)
      
      // Draw question
      drawQuestionContent(ctx, width, height, question, questionIndex, questionsData.questions.length)
      
      // Convert canvas to buffer
      const buffer = canvas.toBuffer('image/png')
      
      console.log('Successfully generated question image with fallback background')
      
      // Return the image
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'max-age=10',
        },
      })
    }
    
    // Draw background
    ctx.drawImage(backgroundImage, 0, 0, width, height)
    
    // Add semi-transparent overlay for better text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, width, height)
    
    // Draw song cover in a smaller size
    const coverSize = 150
    ctx.drawImage(backgroundImage, 50, 50, coverSize, coverSize)
    
    // Draw question content
    drawQuestionContent(ctx, width, height, question, questionIndex, questionsData.questions.length, song)
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    
    console.log('Successfully generated question image')
    
    // Return the image
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'max-age=10',
      },
    })
  } catch (error) {
    console.error('Frame image error:', error)
    return createErrorImage(error instanceof Error ? error.message : String(error))
  }
}

// Helper function to draw question content
function drawQuestionContent(
  ctx: CanvasRenderingContext2D,
  width: number, 
  height: number, 
  question: Record<string, unknown>, 
  questionIndex: number, 
  totalQuestions: number,
  song?: Record<string, unknown>
) {
  // If song is provided, add song title and artist name
  if (song) {
    // Add song title
    ctx.fillStyle = 'white'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'left'
    ctx.fillText(song.song_title || 'Song Title', 220, 100)
    
    // Add artist name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '22px Arial'
    ctx.fillText(song.artist_name || 'Artist', 220, 140)
  }
  
  // Add question number
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  ctx.font = '18px Arial'
  ctx.textAlign = 'left'
  ctx.fillText(`Question ${questionIndex + 1} of ${totalQuestions}`, 220, 180)
  
  // Add question text
  ctx.fillStyle = 'white'
  ctx.font = 'bold 32px Arial'
  
  // Word wrap the question text
  const maxWidth = width - 100
  const lineHeight = 40
  const words = (question.question as string).split(' ')
  let line = ''
  let y = 250
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    
    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, 50, y)
      line = words[i] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, 50, y)
  
  // Add options
  const optionLabels = ['A', 'B', 'C', 'D']
  const options = question.options as Record<string, string>
  const optionValues = [options.a, options.b, options.c, options.d]
  const optionY = y + 80
  
  for (let i = 0; i < 4; i++) {
    const yPos = optionY + (i * 60)
    
    // Draw option box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.fillRect(50, yPos - 30, width - 100, 50)
    
    // Draw option label (A, B, C, D)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = 'bold 24px Arial'
    ctx.fillText(optionLabels[i], 70, yPos)
    
    // Draw option text
    ctx.fillStyle = 'white'
    ctx.font = '24px Arial'
    ctx.fillText(optionValues[i], 110, yPos)
  }
  
  // Add audio icon and instruction
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.font = '18px Arial'
  ctx.fillText('🔊 Tap to listen to audio', width - 250, height - 30)
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

// Helper function to create an error image
function createErrorImage(errorMessage: string): Response {
  // Create a simple error image
  const width = 1200
  const height = 628
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  
  // Fill background
  ctx.fillStyle = '#1e1e1e'
  ctx.fillRect(0, 0, width, height)
  
  // Add error title
  ctx.fillStyle = '#ff4444'
  ctx.font = 'bold 48px Arial'
  ctx.textAlign = 'center'
  ctx.fillText('Error', width / 2, 150)
  
  // Add error message
  ctx.fillStyle = 'white'
  ctx.font = '32px Arial'
  ctx.textAlign = 'center'
  
  // Word wrap the error message
  const maxWidth = width - 200
  const lineHeight = 40
  const words = errorMessage.split(' ')
  let line = ''
  let y = 250
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    
    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, width / 2, y)
      line = words[i] + ' '
      y += lineHeight
    } else {
      line = testLine
    }
  }
  ctx.fillText(line, width / 2, y)
  
  // Add timestamp
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '18px Arial'
  ctx.fillText(new Date().toISOString(), width / 2, height - 50)
  
  // Convert canvas to buffer
  const buffer = canvas.toBuffer('image/png')
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
} 