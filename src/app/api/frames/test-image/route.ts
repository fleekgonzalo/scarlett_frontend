import { NextRequest } from 'next/server'
import { createCanvas } from 'canvas'

export async function GET(request: NextRequest) {
  try {
    // Create canvas with 1.91:1 aspect ratio (standard for Frames)
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Fill background
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, width, height)
    
    // Add title
    ctx.fillStyle = 'white'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Test Frame Image', width / 2, height / 2 - 50)
    
    // Add subtitle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '32px Arial'
    ctx.fillText('This is a test image for Farcaster Frames', width / 2, height / 2 + 50)
    
    // Add timestamp
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '24px Arial'
    ctx.fillText(new Date().toISOString(), width / 2, height - 50)
    
    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png')
    
    // Return the image
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Test image error:', error)
    
    // Return a simple error image
    const width = 1200
    const height = 628
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    
    // Fill background
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, width, height)
    
    // Add error message
    ctx.fillStyle = 'red'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Error generating test image', width / 2, height / 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = '24px Arial'
    ctx.fillText(String(error), width / 2, height / 2 + 50)
    
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