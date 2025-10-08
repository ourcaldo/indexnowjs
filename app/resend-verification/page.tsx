'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import { ArrowLeft, Send } from "lucide-react"
import DashboardPreview from '@/components/DashboardPreview'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export default function ResendVerification() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true)
  useFavicon()

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setMessage('')
    
    if (!email.trim()) {
      setError('Please enter your email address')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(AUTH_ENDPOINTS.RESEND_VERIFICATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to send verification email')
        return
      }

      setMessage('Verification email sent! Please check your inbox and spam folder.')
      setEmail('')
    } catch (error) {
      setError('Failed to send verification email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex ${isMobile ? 'flex-col' : 'flex-row'} font-sans`}>

      {/* Left Side - Resend Verification Form */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} bg-background ${isMobile ? 'px-5 py-10' : 'p-[60px]'} flex flex-col justify-center ${isMobile ? 'items-center' : 'items-start'} relative`}>
        {/* Logo for both mobile and desktop */}
        {logoUrl && (
          <div className={`absolute ${isMobile ? 'top-5 left-5' : 'top-10 left-[60px]'} flex items-center`}>
            <img 
              src={logoUrl} 
              alt="Logo"
              style={{
                height: isMobile ? '48px' : '72px',
                width: 'auto',
                maxWidth: isMobile ? '240px' : '360px'
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className={`max-w-md w-full ${isMobile ? 'text-center mt-24' : 'text-left'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-brand-primary mb-2 leading-tight`}>
            Having Problems?
          </h1>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground mb-10 leading-relaxed`}>
            Enter your email address and we'll send you a new verification link to get you back on track.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-field-default form-field-focus w-full px-4 py-3 text-base"
                placeholder="your@email.com"
                required
                disabled={isLoading}
                data-testid="input-email"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="badge-error p-3 mb-6 text-center rounded-lg">
                {error}
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-6 text-center">
                <div className="text-green-800 dark:text-green-400">
                  {message}
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-[14px] px-6 bg-brand-primary text-white border-0 rounded-lg text-base font-semibold cursor-pointer mb-6 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-brand-secondary transition-colors flex items-center justify-center gap-2"
              data-testid="button-send"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Verification Email
                </>
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="text-center pt-6 border-t border-border">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 cursor-pointer mx-auto"
              data-testid="button-back-to-login"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Dashboard Preview (Desktop Only) */}
      {!isMobile && (
        <div className="w-1/2 bg-brand-primary p-[60px] flex flex-col justify-center items-center text-white relative">
          <div className="overflow-hidden w-full h-full relative">
            <DashboardPreview />
          </div>
        </div>
      )}
    </div>
  )
}