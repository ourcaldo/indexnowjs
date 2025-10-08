'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'

import DashboardPreview from '@/components/DashboardPreview'

export default function Login() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  
  // Check for auth callback errors in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const authError = urlParams.get('error')
    if (authError) {
      switch (authError) {
        case 'auth_callback_failed':
          setError('Authentication failed. Please try again.')
          break
        case 'auth_callback_exception':
          setError('An error occurred during authentication. Please try again.')
          break
        case 'missing_auth_code':
          setError('Invalid authentication link. Please request a new magic link.')
          break
        // Enhanced error handling for new verification routes
        case 'email_verification_failed':
          setError('Email verification failed. Please check your email or request a new verification link.')
          break
        case 'recovery_verification_failed':
          setError('Password reset verification failed. Please request a new password reset link.')
          break
        case 'magiclink_verification_failed':
          setError('Magic link verification failed. Please request a new magic link.')
          break
        case 'expired_link':
          setError('This link has expired. Please request a new verification link.')
          break
        case 'invalid_link':
          setError('This link is invalid. Please request a new verification link.')
          break
        case 'access_denied':
          setError('Access denied. Please try signing in again.')
          break
        case 'server_error':
          setError('Server error occurred. Please try again later.')
          break
        case 'temporarily_unavailable':
          setError('Service temporarily unavailable. Please try again later.')
          break
        case 'network_error':
          setError('Network error occurred. Please check your connection and try again.')
          break
        case 'timeout_error':
          setError('Request timed out. Please try again.')
          break
        case 'no_session_data':
          setError('Session data not found. Please try signing in again.')
          break
        case 'missing_verification_token':
          setError('Verification token missing. Please request a new verification link.')
          break
        case 'missing_verification_type':
          setError('Invalid verification link. Please request a new verification link.')
          break
        case 'unknown_verification_type':
          setError('Unknown verification type. Please request a new verification link.')
          break
        case 'verification_exception':
          setError('Verification error occurred. Please try again.')
          break
        default:
          setError('Authentication error occurred.')
      }
      // Clear the error from URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for login page
  useFavicon() // Automatically updates favicon

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    try {
      if (isMagicLinkMode) {
        // Handle magic link submission
        if (!email) {
          setError("Please enter your email address first.")
          return
        }
        await authService.createMagicLink(email, `${window.location.origin}/auth/callback?next=/dashboard`)
        setMagicLinkSent(true)
        setError("")
      } else {
        // Handle password login
        const result = await authService.signIn(email, password)
        
        // Get user role and redirect to appropriate subdomain
        if (result.user) {
          const userRole = await authService.getUserRole(result.user)
          const redirectUrl = authService.getSubdomainRedirectUrl(userRole)
          
          // If it's a subdomain URL, use window.location for cross-subdomain redirect
          if (redirectUrl.startsWith('http')) {
            window.location.href = redirectUrl
          } else {
            router.push(redirectUrl)
          }
        } else {
          router.push("/dashboard") // Fallback
        }
      }
    } catch (error: any) {
      setError(error.message || (isMagicLinkMode ? "Failed to send magic link" : "Login failed"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.")
      return
    }
    
    setIsLoading(true)
    try {
      await authService.resetPassword(email)
      alert("Password recovery email sent!")
    } catch (error: any) {
      setError(error.message || "Failed to send recovery email")
    } finally {
      setIsLoading(false)
    }
  }

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  return (
    <div className={`min-h-screen flex ${isMobile ? 'flex-col' : 'flex-row'} font-sans`}>

      {/* Left Side - Login Form */}
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
            Welcome Back
          </h1>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground mb-10 leading-relaxed`}>
            Enter your email and password to access your account.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Magic Link Success Notification */}
            {magicLinkSent && (
              <div className="mb-8 text-center">
                <div className="mb-4 text-[32px]">✨</div>
                <h3 className="text-lg font-semibold text-foreground mb-2 m-0">
                  Magic Link Sent!
                </h3>
                <p className="text-muted-foreground text-sm m-0 leading-relaxed mb-4">
                  Check your email ({email}) and click the link to log in instantly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMagicLinkSent(false)
                    setIsMagicLinkMode(false)
                  }}
                  className="bg-transparent border-0 text-brand-primary text-sm cursor-pointer underline hover:text-brand-secondary transition-colors"
                >
                  Back to login
                </button>
              </div>
            )}

            {/* Show form only if magic link is not sent */}
            {!magicLinkSent && (
              <>
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
                  />
                </div>

                {/* Password Field - Hidden in magic link mode */}
                {!isMagicLinkMode && (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="form-field-default form-field-focus w-full px-4 py-3 pr-12 text-base"
                          placeholder="Your password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-muted-foreground cursor-pointer text-sm p-1 flex items-center justify-center hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="flex justify-between items-center mb-8">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="mr-2 w-4 h-4 accent-brand"
                        />
                        <span className="text-sm text-muted-foreground">
                          Remember Me
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => router.push("/forgot-password")}
                        className="bg-transparent border-0 text-brand-primary text-sm cursor-pointer hover:underline transition-all"
                      >
                        Forgot Your Password?
                      </button>
                    </div>
                  </>
                )}

                {/* Login/Magic Link Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-[14px] px-6 bg-brand-primary text-white border-0 rounded-lg text-base font-semibold cursor-pointer mb-6 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-brand-secondary transition-colors flex items-center justify-center"
                >
                  {isMagicLinkMode && <span style={{ marginRight: '8px' }}>✨</span>}
                  {isLoading ? 
                    (isMagicLinkMode ? "Sending..." : "Signing In...") : 
                    (isMagicLinkMode ? "Send Magic Link" : "Sign In")
                  }
                </button>

                {/* Error Message */}
                {error && (
                  <div className="badge-error p-3 mb-6 text-center rounded-lg">
                    {/* Transform email confirmation error to be more descriptive */}
                    {error.toLowerCase().includes('email not confirmed') 
                      ? 'Please verify your email before accessing your account.'
                      : error
                    }
                  </div>
                )}

                {/* Toggle Magic Link Mode */}
                <div className="text-center mb-6">
                  <button
                    type="button"
                    onClick={() => setIsMagicLinkMode(!isMagicLinkMode)}
                    className="bg-transparent border-0 text-muted-foreground text-sm cursor-pointer hover:underline hover:text-foreground transition-all"
                  >
                    {isMagicLinkMode ? "← Back to password login" : "✨ Login with magic link instead"}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Register Link and Verification Link */}
          <div className="text-center pt-6 border-t border-border space-y-3">
            <p className="text-sm text-muted-foreground m-0">
              Don't have an account?{' '}
              <button
                onClick={() => router.push("/register")}
                className="bg-transparent border-0 text-brand-primary text-sm font-semibold cursor-pointer hover:underline transition-all"
              >
                Sign up here
              </button>
            </p>
            
            <p className="text-sm text-muted-foreground m-0">
              Haven't received your verification email?{' '}
              <button
                type="button"
                onClick={() => router.push("/resend-verification")}
                className="bg-transparent border-0 text-brand-primary text-sm font-semibold cursor-pointer hover:underline transition-all"
                data-testid="link-resend-verification"
              >
                Resend verification email
              </button>
            </p>
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