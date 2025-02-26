import { NextRequest } from 'next/server'
import { getIPFSUrl } from '@/lib/ipfs'
import { TablelandClient } from '@/services/tableland'
import { createCanvas, loadImage } from 'canvas'

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
    const questionsCid = params.locale === 'zh' ? song.questions_cid_1 : song.questions_cid_2

    if (!questionsCid) {
      return new Response('No questions available', { status: 404 })
    }

    // Get current question index and correct status from searchParams
    const searchParams = request.nextUrl.searchParams
    const questionIndex = parseInt(searchParams.get('q') || '0')
    const isCorrect = searchParams.get('correct') === 'true'

    // Fetch questions
    const response = await fetch(getIPFSUrl(questionsCid))
    const questionsData = await response.json()
    const question = questionsData.questions[questionIndex]

    if (!question) {
      return new Response('Question not found', { status: 404 })
    }

    // Create canvas with 1.91:1 aspect ratio (standard for Frames)
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Load background image (song cover)
    const backgroundImage = await loadImage(getIPFSUrl(song.cover_img_cid))
    
    // Draw background (without blur effect for compatibility)
    ctx.drawImage(backgroundImage, 0, 0, width, height)
    
    // Add semi-transparent overlay
    ctx.fillStyle = isCorrect ? 'rgba(0, 100, 0, 0.7)' : 'rgba(100, 0, 0, 0.7)'
    ctx.fillRect(0, 0, width, height)
    
    // Draw song cover in a smaller size
    const coverSize = 150
    ctx.drawImage(backgroundImage, 50, 50, coverSize, coverSize)
    
    // Add song title
    ctx.fillStyle = 'white'
    ctx.font = 'bold 28px Arial'
    ctx.fillText(song.song_title || 'Song Title', 220, 100)
    
    // Add artist name
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '22px Arial'
    ctx.fillText(song.artist_name || 'Artist', 220, 140)
    
    // Add question number
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '18px Arial'
    ctx.fillText(`Question ${questionIndex + 1} of ${questionsData.questions.length}`, 220, 180)
    
    // Add result text
    ctx.fillStyle = 'white'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(isCorrect ? '✅ Correct!' : '❌ Incorrect', width / 2, 250)
    
    // Add question text
    ctx.font = 'bold 32px Arial'
    
    // Word wrap the question text
    const maxWidth = width - 100
    const lineHeight = 40
    const words = question.question.split(' ')
    let line = ''
    let y = 320
    
    ctx.textAlign = 'left'
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
    
    // Add correct answer
    ctx.fillStyle = 'white'
    ctx.font = 'bold 32px Arial'
    ctx.fillText(`Correct answer: ${question.options[question.answer]}`, 50, y + 80)
    
    // Add next steps instruction
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(
      isCorrect ? 'Click to continue to the next question' : 'Click to try again',
      width / 2, 
      height - 50
    )
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    
    // Return the image
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'max-age=10',
      },
    })
  } catch (error) {
    console.error('Frame result image error:', error)
    
    // Return a simple error image
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Fill background
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, width, height)
    
    // Add error message
    ctx.fillStyle = 'white'
    ctx.font = 'bold 32px Arial'
    ctx.fillText('Error generating result image', 50, height / 2)
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    })
  }
} 