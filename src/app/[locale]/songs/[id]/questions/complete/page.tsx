'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Share2, Database, ArrowRight, Loader2 } from 'lucide-react'
import IrysService from '@/services/irys'

interface CompletionStats {
  totalQuestions: number
  correctAnswers: number
  songId: string
  completedAt: number
}

export default function CompletePage() {
  const params = useParams()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [stats, setStats] = useState<CompletionStats | null>(null)
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupSuccess, setBackupSuccess] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)

  useEffect(() => {
    // Check if we have stats in localStorage
    const storedStats = localStorage.getItem('questionStats')
    if (storedStats) {
      setStats(JSON.parse(storedStats))
    } else {
      // If no stats, redirect back to questions page
      router.push(`/${params?.locale}/songs/${params?.id}/questions`)
    }
  }, [params?.id, params?.locale, router])

  const handleBackupToIrys = async () => {
    if (!isAuthenticated || !user || !stats) {
      setBackupError('You must be logged in to backup your progress')
      return
    }

    setIsBackingUp(true)
    setBackupError(null)

    try {
      // Get stored question answers from localStorage
      const questionAnswers = JSON.parse(localStorage.getItem('questionAnswers') || '[]')
      
      // Prepare data for Irys
      const progressData = {
        userId: user.id,
        songId: stats.songId,
        questions: questionAnswers.map((q: any) => ({
          uuid: q.uuid,
          correct: q.isCorrect,
          timestamp: q.timestamp
        })),
        totalCorrect: stats.correctAnswers,
        totalQuestions: stats.totalQuestions,
        completedAt: stats.completedAt
      }

      // Upload to Irys
      const txId = await IrysService.uploadProgress(progressData)
      
      setTransactionId(txId)
      setBackupSuccess(true)
    } catch (error) {
      console.error('Error backing up to Irys:', error)
      setBackupError(error instanceof Error ? error.message : 'Failed to backup progress')
    } finally {
      setIsBackingUp(false)
    }
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  const percentage = Math.round((stats.correctAnswers / stats.totalQuestions) * 100)

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-neutral-900 rounded-xl p-8 shadow-lg">
          {/* Celebration header */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-blue-500 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {params?.locale === 'zh' ? '太棒了！' : 'Great job!'}
            </h1>
            <p className="text-xl text-neutral-300">
              {params?.locale === 'zh' 
                ? '你已完成今天的学习' 
                : 'You completed your study session for today'}
            </p>
          </div>

          {/* Stats */}
          <div className="bg-neutral-800 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {params?.locale === 'zh' ? '学习统计' : 'Study Stats'}
              </h2>
              <div className="text-2xl font-bold text-blue-400">{percentage}%</div>
            </div>
            
            <div className="w-full bg-neutral-700 rounded-full h-4 mb-6">
              <div 
                className="bg-blue-500 h-4 rounded-full" 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-neutral-400">
                  {params?.locale === 'zh' ? '问题总数' : 'Total Questions'}
                </p>
                <p className="text-xl font-semibold">{stats.totalQuestions}</p>
              </div>
              <div>
                <p className="text-neutral-400">
                  {params?.locale === 'zh' ? '正确回答' : 'Correct Answers'}
                </p>
                <p className="text-xl font-semibold">{stats.correctAnswers}</p>
              </div>
            </div>
          </div>

          {/* Backup to Irys section */}
          <div className="bg-neutral-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {params?.locale === 'zh' ? '备份你的进度' : 'Backup Your Progress'}
            </h2>
            
            <p className="text-neutral-400 mb-4">
              {params?.locale === 'zh' 
                ? '将你的学习进度保存到区块链上，永久保存并随时访问。' 
                : 'Save your learning progress to the blockchain for permanent storage and access anytime.'}
            </p>
            
            {!backupSuccess ? (
              <div>
                <Button 
                  onClick={handleBackupToIrys}
                  disabled={isBackingUp || !isAuthenticated}
                  className="w-full py-6 bg-blue-600 hover:bg-blue-700 mb-4"
                >
                  {isBackingUp ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {params?.locale === 'zh' ? '备份中...' : 'Backing up...'}
                    </>
                  ) : (
                    <>
                      <Database className="w-5 h-5 mr-2" />
                      {params?.locale === 'zh' ? '备份到 Irys' : 'Backup to Irys'}
                    </>
                  )}
                </Button>
                
                {backupError && (
                  <p className="text-red-400 text-sm mt-2">{backupError}</p>
                )}
                
                {!isAuthenticated && (
                  <p className="text-amber-400 text-sm mt-2">
                    {params?.locale === 'zh' 
                      ? '请先登录以备份你的进度' 
                      : 'Please log in to backup your progress'}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="inline-block p-3 bg-green-500 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">
                  {params?.locale === 'zh' ? '备份成功！' : 'Backup Successful!'}
                </h3>
                {transactionId && (
                  <p className="text-neutral-400 text-sm mb-4">
                    Transaction ID: <span className="font-mono">{transactionId.substring(0, 8)}...{transactionId.substring(transactionId.length - 8)}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              asChild
              variant="outline" 
              className="flex-1 py-6"
            >
              <Link href={`/${params?.locale}/songs/${params?.id}`}>
                <ArrowRight className="w-5 h-5 mr-2" />
                {params?.locale === 'zh' ? '返回歌曲' : 'Back to Song'}
              </Link>
            </Button>
            
            <Button 
              asChild
              className="flex-1 py-6 bg-blue-600 hover:bg-blue-700"
            >
              <Link href={`/${params?.locale}`}>
                <Share2 className="w-5 h-5 mr-2" />
                {params?.locale === 'zh' ? '探索更多歌曲' : 'Explore More Songs'}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 