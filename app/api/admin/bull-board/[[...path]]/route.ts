import { NextRequest, NextResponse } from 'next/server'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { queueManager } from '@/lib/queues/QueueManager'
import { logger } from '@/lib/monitoring/error-handling'

const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin123'

const BULL_BOARD_USERNAME = process.env.BULL_BOARD_USERNAME
const BULL_BOARD_PASSWORD = process.env.BULL_BOARD_PASSWORD

function checkSecurityRequirements(): { valid: boolean; error?: string } {
  if (process.env.ENABLE_BULLMQ !== 'true') {
    return { valid: false, error: 'BullMQ is not enabled. Set ENABLE_BULLMQ=true to use Bull Board.' }
  }

  if (!BULL_BOARD_USERNAME || !BULL_BOARD_PASSWORD) {
    return { 
      valid: false, 
      error: 'Bull Board credentials not configured. Set BULL_BOARD_USERNAME and BULL_BOARD_PASSWORD environment variables.' 
    }
  }

  if (BULL_BOARD_USERNAME === DEFAULT_USERNAME || BULL_BOARD_PASSWORD === DEFAULT_PASSWORD) {
    return { 
      valid: false, 
      error: 'Default Bull Board credentials detected. Please set secure BULL_BOARD_USERNAME and BULL_BOARD_PASSWORD environment variables.' 
    }
  }

  return { valid: true }
}

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false
  }

  const base64Credentials = authHeader.slice(6)
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
  const [username, password] = credentials.split(':')

  return username === BULL_BOARD_USERNAME && password === BULL_BOARD_PASSWORD
}

function createUnauthorizedResponse(): NextResponse {
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Bull Board"',
    },
  })
}

let bullBoard: any = null

function initializeBullBoard() {
  if (bullBoard) {
    return bullBoard
  }

  try {
    const queues = [
      'rank-check',
      'rank-schedule',
      'email',
      'payments',
      'trial-monitor',
      'keyword-enrichment',
      'quota-reset',
      'indexing-monitor',
      'auto-cancel',
    ]

    const queueAdapters = queues.map(queueName => 
      new BullMQAdapter(queueManager.getQueue(queueName))
    )

    bullBoard = createBullBoard({
      queues: queueAdapters,
      serverAdapter: null,
    })

    logger.info({ queueCount: queues.length }, 'Bull Board initialized')
    
    return bullBoard
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to initialize Bull Board'
    )
    throw error
  }
}

export async function GET(request: NextRequest) {
  const securityCheck = checkSecurityRequirements()
  if (!securityCheck.valid) {
    logger.error({ error: securityCheck.error }, 'Bull Board security check failed')
    return NextResponse.json(
      { error: securityCheck.error },
      { status: 503 }
    )
  }

  if (!checkAuth(request)) {
    return createUnauthorizedResponse()
  }

  try {
    const board = initializeBullBoard()
    
    const queuesData = await Promise.all(
      board.queues.map(async (queue: any) => {
        const queueInstance = queue.queue
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queueInstance.getWaitingCount(),
          queueInstance.getActiveCount(),
          queueInstance.getCompletedCount(),
          queueInstance.getFailedCount(),
          queueInstance.getDelayedCount(),
        ])

        return {
          name: queue.name,
          counts: {
            waiting,
            active,
            completed,
            failed,
            delayed,
          },
        }
      })
    )

    return NextResponse.json({
      queues: queuesData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Bull Board API error'
    )
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const securityCheck = checkSecurityRequirements()
  if (!securityCheck.valid) {
    logger.error({ error: securityCheck.error }, 'Bull Board security check failed')
    return NextResponse.json(
      { error: securityCheck.error },
      { status: 503 }
    )
  }

  if (!checkAuth(request)) {
    return createUnauthorizedResponse()
  }

  try {
    const body = await request.json()
    const { action, queue: queueName, jobId } = body

    const queue = await queueManager.getQueue(queueName)

    switch (action) {
      case 'retry':
        if (jobId) {
          const job = await queue.getJob(jobId)
          if (job) {
            await job.retry()
            return NextResponse.json({ success: true, message: 'Job retried' })
          }
        }
        break
      
      case 'remove':
        if (jobId) {
          const job = await queue.getJob(jobId)
          if (job) {
            await job.remove()
            return NextResponse.json({ success: true, message: 'Job removed' })
          }
        }
        break
      
      case 'pause':
        await queue.pause()
        return NextResponse.json({ success: true, message: 'Queue paused' })
      
      case 'resume':
        await queue.resume()
        return NextResponse.json({ success: true, message: 'Queue resumed' })
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    )
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Bull Board action error'
    )
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
