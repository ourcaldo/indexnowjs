'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth"
import { useFavicon, useSiteName, useSiteLogo } from '@/hooks/use-site-settings'
import { countries, findCountryByCode } from '@/lib/utils'
import { Eye, EyeOff } from 'lucide-react'
import { registerSchema } from '@/shared/schema'
// We'll use a simple fetch to our detect-location API instead

import DashboardPreview from '@/components/DashboardPreview'
import { AUTH_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [country, setCountry] = useState("")
  const [isDetectingCountry, setIsDetectingCountry] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Site settings hooks
  const siteName = useSiteName()
  const logoUrl = useSiteLogo(true) // Always use full logo for register page
  useFavicon() // Automatically updates favicon

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  // Auto-detect country from IP on component mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch(AUTH_ENDPOINTS.DETECT_LOCATION, {
          credentials: 'include' // Essential for cross-subdomain authentication
        })
        if (response.ok) {
          const data = await response.json()
          if (data.country) {
            setCountry(data.country) // Use full country name instead of countryCode
          } else {
            setCountry('United States') // Fallback to full country name
          }
        } else {
          setCountry('United States') // Fallback to full country name
        }
      } catch (error) {
        console.warn('Country detection failed:', error)
        setCountry('United States') // Fallback to full country name
      } finally {
        setIsDetectingCountry(false)
      }
    }

    detectCountry()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Client-side validation using Zod schema
    try {
      const validationData = {
        name: fullName,
        email,
        password,
        confirmPassword,
        phoneNumber,
        country
      }

      const result = registerSchema.safeParse(validationData)
      
      if (!result.success) {
        // Extract the first validation error
        const firstError = result.error.errors[0]
        setError(firstError.message)
        setIsLoading(false)
        return
      }
    } catch (validationError: any) {
      setError("Please check your input and try again")
      setIsLoading(false)
      return
    }

    try {
      await authService.signUp(email, password, fullName, phoneNumber, country)
      setSuccess(true)
    } catch (error: any) {
      setError(error.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans bg-secondary">
        <div className="card-bordered max-w-md w-full p-10 text-center">
          <div className="text-5xl mb-5">✨</div>
          <h2 className="text-2xl font-bold text-brand-primary mb-3">
            Check your email
          </h2>
          <p className="text-base text-brand-text mb-8 leading-relaxed">
            We've sent you a confirmation link at <strong>{email}</strong>. Click the link to verify your account.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 px-6 bg-brand-primary text-white border-0 rounded-lg text-base font-semibold cursor-pointer hover:bg-brand-secondary transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen flex ${isMobile ? 'flex-col' : 'flex-row'} font-sans`}>

      {/* Left Side - Register Form */}
      <div className={`${isMobile ? 'w-full' : 'w-1/2'} bg-background ${isMobile ? 'px-5 py-10' : 'p-[60px]'} flex flex-col justify-center ${isMobile ? 'items-center' : 'items-start'} relative`}>
        {/* Logo for both mobile and desktop */}
        {logoUrl && (
          <div className={`absolute ${isMobile ? 'top-5 left-5' : 'top-8 left-[60px]'} flex items-center z-10`}>
            <img 
              src={logoUrl} 
              alt="Logo"
              style={{
                height: isMobile ? '48px' : '48px',
                width: 'auto',
                maxWidth: isMobile ? '240px' : '280px'
              }}
            />
          </div>
        )}

        {/* Main Content */}
        <div className={`max-w-md w-full ${isMobile ? 'text-center mt-[90px]' : 'text-left mt-20'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-brand-primary mb-2 leading-tight`}>
            Create Account
          </h1>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground mb-10 leading-relaxed`}>
            Join {siteName} to start indexing your URLs instantly.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Name Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-field-default form-field-focus w-full px-4 py-3 text-base"
                placeholder="Enter your full name"
                required
              />
            </div>

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
                placeholder="you@company.com"
                required
              />
            </div>

            {/* Phone Number Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  // Only allow numbers, spaces, +, -, ( and )
                  const value = e.target.value.replace(/[^+\-0-9\s\(\)]/g, '')
                  setPhoneNumber(value)
                }}
                className="form-field-default form-field-focus w-full px-4 py-3 text-base"
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>

            {/* Country Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isDetectingCountry}
                className={`form-field-default form-field-focus w-full px-4 py-3 text-base ${isDetectingCountry ? 'bg-muted cursor-not-allowed' : 'cursor-pointer'}`}
                required
              >
                <option value="">Select your country</option>
                {countries.map((countryOption) => (
                  <option key={countryOption.code} value={countryOption.name}>
                    {countryOption.flag} {countryOption.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Password Field */}
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
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-muted-foreground cursor-pointer p-1 flex items-center justify-center hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-field-default form-field-focus w-full px-4 py-3 pr-12 text-base"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-muted-foreground cursor-pointer p-1 flex items-center justify-center hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="badge-error p-3 mb-6 rounded-lg">
                <p className="text-sm m-0">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-[14px] px-5 text-base font-semibold text-white border-0 rounded-lg transition-colors ${
                isLoading 
                  ? 'bg-muted-foreground cursor-not-allowed' 
                  : 'bg-brand-primary cursor-pointer hover:bg-brand-secondary'
              }`}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            {/* Sign In Link */}
            <div className="text-center mt-6">
              <span className="text-sm text-muted-foreground">
                Already have an account?{' '}
              </span>
              <a
                href="/login"
                className="text-sm text-brand-primary no-underline font-semibold hover:underline transition-all"
              >
                Sign In
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Dashboard Preview (Desktop Only) */}
      {!isMobile && (
        <div className="w-1/2 bg-brand-primary p-[80px_60px] flex flex-col justify-center text-white relative">
          <div className="overflow-hidden w-full relative">
            <DashboardPreview />
          </div>
        </div>
      )}
    </div>
  )
}