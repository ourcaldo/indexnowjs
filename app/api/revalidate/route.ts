import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireServerAdminAuth } from '@/lib/auth/server-auth'
import { logger } from '@/lib/monitoring/error-handling'

export async function POST(request: NextRequest) {
  try {
    // Method 1: Admin authentication (preferred)
    // Try admin authentication first
    let isAuthenticated = false
    try {
      await requireServerAdminAuth(request)
      isAuthenticated = true
    } catch {
      // Fall back to secret-based authentication
    }

    // Method 2: Secret-based authentication (fallback for programmatic access)
    if (!isAuthenticated) {
      const { searchParams } = new URL(request.url)
      const secret = searchParams.get('secret')

      // Validate secret using environment variable (no fallback for security)
      const expectedSecret = process.env.REVALIDATE_SECRET
      if (!expectedSecret) {
        return NextResponse.json(
          { error: 'Revalidate secret not configured' },
          { status: 500 }
        )
      }

      if (secret !== expectedSecret) {
        return NextResponse.json(
          { error: 'Invalid secret or authentication required' },
          { status: 401 }
        )
      }
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      )
    }

    // Revalidate the specified path
    revalidatePath(path)
    
    return NextResponse.json({
      success: true,
      message: `Revalidated ${path}`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Revalidation error:')
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return POST(request)
}