'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'

export default function TestBackendPage() {
  const router = useRouter()

  useEffect(() => {
    // Admin functionality is now only accessible via backend.domain.com
    // Implement subdomain-aware redirect
    const redirectToBackend = () => {
      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        const protocol = window.location.protocol
        const port = window.location.port
        
        // Determine backend subdomain URL based on environment
        let backendUrl = '/backend/admin' // Fallback for same domain
        
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
          const portSuffix = port ? `:${port}` : ''
          backendUrl = `${protocol}//backend.localhost${portSuffix}/backend/admin`
        } else if (hostname.includes('indexnow.studio')) {
          backendUrl = `${protocol}//backend.indexnow.studio/backend/admin`
        } else if (hostname.includes('replit')) {
          // For Replit environment, redirect to backend path (middleware will handle subdomain routing)
          backendUrl = '/backend/admin'
        }
        
        // Use window.location for cross-subdomain redirect
        if (backendUrl.startsWith('http')) {
          window.location.href = backendUrl
        } else {
          router.push(backendUrl)
        }
      }
    }
    
    redirectToBackend()
  }, [router])

  // Show redirection message while redirecting
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-4">
          <Shield className="h-16 w-16 text-primary mx-auto" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Admin Functionality Moved</h1>
        <p className="text-muted-foreground mb-4">
          Testing and admin functionality is now available via the backend admin area.
        </p>
        <div className="bg-secondary p-4 border border-border rounded-lg">
          <p className="text-xs text-muted-foreground">
            Redirecting to backend admin area...
          </p>
        </div>
      </div>
    </div>
  )
}