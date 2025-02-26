import { NextRequest } from 'next/server'
import { createCanvas } from 'canvas'

export async function GET(request: NextRequest) {
  try {
    // Get error message from query params
    const searchParams = request.nextUrl.searchParams
    const errorMessage = searchParams.get('error') || 'Unknown error'
    
    console.log('Generating error image with message:', errorMessage)
    
    // Create canvas with 1.91:1 aspect ratio (standard for Frames)
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Fill background
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, width, height)
    
    // Add error icon
    ctx.fillStyle = '#ff4444'
    ctx.beginPath()
    ctx.arc(width / 2, 150, 50, 0, 2 * Math.PI)
    ctx.fill()
    
    // Add X in the circle
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.moveTo(width / 2 - 25, 150 - 25)
    ctx.lineTo(width / 2 + 25, 150 + 25)
    ctx.moveTo(width / 2 + 25, 150 - 25)
    ctx.lineTo(width / 2 - 25, 150 + 25)
    ctx.stroke()
    
    // Add error title
    ctx.fillStyle = '#ff4444'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Error', width / 2, 250)
    
    // Add error message
    ctx.fillStyle = 'white'
    ctx.font = '32px Arial'
    ctx.textAlign = 'center'
    
    // Word wrap the error message
    const maxWidth = width - 200
    const lineHeight = 40
    const words = errorMessage.split(' ')
    let line = ''
    let y = 320
    
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
    
    // Add instructions
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = '24px Arial'
    ctx.fillText('Press "Try Again" to retry or "Go to Songs" to browse songs', width / 2, y + 80)
    
    // Add timestamp
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '18px Arial'
    ctx.fillText(new Date().toISOString(), width / 2, height - 50)
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    
    // Return the image
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Error generating error image:', error)
    
    // Create a simple fallback error image
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Fill background
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, width, height)
    
    // Add error text
    ctx.fillStyle = '#ff4444'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Error', width / 2, height / 2 - 24)
    
    ctx.fillStyle = 'white'
    ctx.font = '24px Arial'
    ctx.fillText('Failed to generate error image', width / 2, height / 2 + 24)
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    
    // Return the fallback image
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  }
} 