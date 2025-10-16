'use client'

/// <reference path="../../../../types/midtrans.d.ts" />
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger, useActivityLogger } from '@/hooks/useActivityLogger'
import { authService } from '@/lib/auth'
import { supabaseBrowser } from '@/lib/database'
import { usePaymentProcessor } from '@/hooks/usePaymentProcessor'
import { MidtransClientService } from '@/lib/payment-services/midtrans-client-service'
import BillingPeriodSelector from '@/components/checkout/BillingPeriodSelector'
import OrderSummary from '@/components/checkout/OrderSummary'
import PaymentMethodSelector from '@/components/checkout/payment-methods/PaymentMethodSelector'
import PaymentErrorBoundary from '@/components/checkout/PaymentErrorBoundary'
import { AUTH_ENDPOINTS, BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import {
  CheckoutFormComponent,
  CheckoutHeader,
  CheckoutLoading,
  PackageNotFound,
  CheckoutSubmitButton
} from './components'

// Types
interface PaymentPackage {
  id: string
  name: string
  slug: string
  price: number
  currency: string
  billing_period: string
  pricing_tiers: any
  features: string[]
  description: string
  free_trial_enabled?: boolean
}

interface PaymentGateway {
  id: string
  name: string
  slug: string
  description: string
  is_active: boolean
  is_default: boolean
  configuration: any
}

interface CheckoutForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  country: string
  description: string
  payment_method: string
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  // URL parameters
  const [package_id] = useState(searchParams?.get('package'))
  const [billing_period, setBillingPeriod] = useState(searchParams?.get('period') || 'monthly')
  const [isTrialFlow, setIsTrialFlow] = useState(searchParams?.get('trial') === 'true')

  // State
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userCurrency, setUserCurrency] = useState<'USD' | 'IDR'>('USD')
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null)

  const [form, setForm] = useState<CheckoutForm>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'Indonesia',
    description: '',
    payment_method: ''
  })

  // Activity logging
  usePageViewLogger('/dashboard/settings/plans-billing/checkout', 'Checkout', { section: 'billing_checkout' })
  const { logBillingActivity } = useActivityLogger()

  // Initialize payment processor hook
  const paymentProcessor = usePaymentProcessor({
    packageData: selectedPackage,
    onError: (error) => {
      logBillingActivity('payment_error', `Payment failed for ${selectedPackage?.name} plan: ${error.message}`)
    }
  })

  // Data loading effect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Get authentication token
        const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token
        if (!token) {
          addToast({
            title: "Authentication required",
            description: "Please log in to continue.",
            type: "error"
          })
          router.push('/auth/login')
          return
        }

        // Fetch full user profile including country data
        const profileResponse = await fetch(AUTH_ENDPOINTS.PROFILE, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Essential for cross-subdomain authentication
        })

        if (!profileResponse.ok) {
          throw new Error('Failed to fetch user profile')
        }

        const profileResult = await profileResponse.json()
        // API returns: { success: true, data: { profile: {...} } }
        const profileData = profileResult?.success === true && profileResult.data ? profileResult.data : profileResult
        const userProfile = profileData.profile

        // Auto-populate user information from full profile
        const userName = userProfile.full_name || userProfile.email?.split('@')[0] || ''
        const nameParts = userName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        setForm(prev => ({
          ...prev,
          first_name: firstName,
          last_name: lastName,
          email: userProfile.email || '',
          phone: userProfile.phone_number || '',
          country: userProfile.country || ''
        }))

        // Set user currency based on country from profile
        const { getUserCurrency } = await import('@/lib/utils/currency-utils')
        const detectedCurrency = getUserCurrency(userProfile.country)
        setUserCurrency(detectedCurrency)

        // Fetch package and payment gateway data
        const [packageResponse, gatewaysResponse] = await Promise.all([
          fetch(BILLING_ENDPOINTS.PACKAGE_BY_ID(package_id!), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include' // Essential for cross-subdomain authentication
          }),
          fetch(BILLING_ENDPOINTS.PAYMENT_GATEWAYS, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include' // Essential for cross-subdomain authentication
          })
        ])

        if (!packageResponse.ok || !gatewaysResponse.ok) {
          throw new Error('Failed to load checkout data')
        }

        const packageResult = await packageResponse.json()
        const gatewaysResult = await gatewaysResponse.json()
        
        // API returns: { success: true, data: {...} }
        const packageData = packageResult?.success === true && packageResult.data ? packageResult.data : packageResult
        const gatewaysData = gatewaysResult?.success === true && gatewaysResult.data ? gatewaysResult.data : gatewaysResult

        setSelectedPackage(packageData.data || packageData)
        setPaymentGateways(gatewaysData.gateways || gatewaysData || [])

        // Check trial eligibility if needed
        if (isTrialFlow) {
          const trialResponse = await fetch(AUTH_ENDPOINTS.TRIAL_ELIGIBILITY, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include' // Essential for cross-subdomain authentication
          })
          if (trialResponse.ok) {
            const trialResult = await trialResponse.json()
            setTrialEligible(trialResult.eligible)
          }
        }

      } catch (error) {
        console.error('Error fetching checkout data:', error)
        addToast({
          title: "Error loading checkout",
          description: "Please try again later.",
          type: "error"
        })
      } finally {
        setLoading(false)
      }
    }

    if (package_id) {
      fetchData()
    } else {
      router.push('/dashboard/settings/plans-billing')
    }
  }, [package_id, router, addToast, isTrialFlow])

  // Load Midtrans SDKs
  useEffect(() => {
    const loadMidtransSDKs = async () => {
      try {
        const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token
        if (!token) return
        
        const config = await MidtransClientService.getMidtransConfig(token)
        
        if (config) {
          await Promise.all([
            MidtransClientService.load3DSSDK(config.client_key, config.environment),
            MidtransClientService.loadSnapSDK(config.client_key, config.environment)
          ])
        }
      } catch (error) {
        // SDK loading failures are handled silently
      }
    }

    loadMidtransSDKs()
  }, [])

  // Pricing calculation
  const calculatePrice = () => {
    if (!selectedPackage) return { price: 0, discount: 0, originalPrice: 0 }

    if (selectedPackage.pricing_tiers && typeof selectedPackage.pricing_tiers === 'object' && selectedPackage.pricing_tiers[billing_period]) {
      const periodTier = selectedPackage.pricing_tiers[billing_period]

      if (periodTier[userCurrency]) {
        const currencyTier = periodTier[userCurrency]
        const price = currencyTier.promo_price || currencyTier.regular_price
        const originalPrice = currencyTier.regular_price
        const discount = currencyTier.promo_price ? Math.round(((originalPrice - currencyTier.promo_price) / originalPrice) * 100) : 0

        return { price, discount, originalPrice }
      }

      if (Array.isArray(selectedPackage.pricing_tiers)) {
        const tier = selectedPackage.pricing_tiers.find((t: any) => t.period === billing_period)
        if (tier) {
          const price = tier.promo_price || tier.regular_price
          const originalPrice = tier.regular_price
          const discount = tier.promo_price ? Math.round(((originalPrice - tier.promo_price) / originalPrice) * 100) : 0

          return { price, discount, originalPrice }
        }
      }
    }

    return { price: 0, discount: 0, originalPrice: 0 }
  }

  // Credit card submission handler
  const handleCreditCardSubmit = async (cardData: any) => {
    if (!selectedPackage) {
      addToast({
        title: "Missing package",
        description: "Please select a package to continue.",
        type: "error"
      })
      return
    }

    const paymentRequest = {
      package_id: selectedPackage.id,
      billing_period,
      payment_method: 'midtrans_recurring',
      is_trial: isTrialFlow,
      customer_info: {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        country: form.country,
        description: form.description
      }
    }

    const { data: { session } } = await supabaseBrowser.auth.getSession()
    const token = session?.access_token
    if (!token) {
      addToast({
        title: "Authentication required",
        description: "Please log in again to continue.",
        type: "error"
      })
      return
    }

    const mappedCardData = {
      card_number: cardData.card_number,
      card_exp_month: cardData.expiry_month,
      card_exp_year: cardData.expiry_year,
      card_cvv: cardData.cvv
    }

    // processCreditCardPayment handles 3DS internally, no need to catch and re-handle
    await paymentProcessor.processCreditCardPayment(paymentRequest, mappedCardData, token)
  }

  // Main form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPackage || !form.payment_method) {
      addToast({
        title: "Missing information",
        description: "Please fill in all required fields and select a payment method.",
        type: "error"
      })
      return
    }

    setSubmitting(true)

    try {
      const token = (await supabaseBrowser.auth.getSession()).data.session?.access_token
      if (!token) {
        addToast({
          title: "Authentication error", 
          description: "Please log in again to continue.",
          type: "error"
        })
        router.push('/auth/login')
        return
      }

      const selectedGateway = paymentGateways.find(gw => gw.id === form.payment_method)
      const paymentRequest = {
        package_id: selectedPackage.id,
        billing_period,
        payment_method: selectedGateway?.slug || 'bank_transfer',
        customer_info: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip_code: form.zip_code,
          country: form.country,
          description: form.description
        }
      }

      // Handle Midtrans recurring (credit card)
      if (selectedGateway?.slug === 'midtrans' || selectedGateway?.slug === 'midtrans_recurring') {
        if (!window.midtransSubmitCard) {
          addToast({
            title: "Payment system not ready",
            description: "Please wait a moment and try again.",
            type: "error"
          })
          return
        }
        await window.midtransSubmitCard()
        return
      }

      // Handle other payment methods
      await paymentProcessor.processPayment(paymentRequest, token)

    } catch (error) {
      addToast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        type: "error"
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return <CheckoutLoading />
  }

  // Package not found state
  if (!selectedPackage) {
    return <PackageNotFound />
  }

  const { price, discount, originalPrice } = calculatePrice()

  return (
    <PaymentErrorBoundary>
      <div className="min-h-screen bg-secondary">
        <div className="container mx-auto px-4 py-8">
          <CheckoutHeader selectedPackage={selectedPackage} />

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Billing Period Selection */}
                <BillingPeriodSelector
                  selectedPackage={selectedPackage}
                  userCurrency={userCurrency}
                  selectedPeriod={billing_period}
                  onPeriodChange={setBillingPeriod}
                />

                {/* Checkout Form */}
                <CheckoutFormComponent form={form} setForm={setForm} />

                {/* Payment Methods */}
                <PaymentMethodSelector
                  paymentGateways={paymentGateways}
                  selectedMethod={form.payment_method}
                  onMethodChange={(value) => setForm(prev => ({ ...prev, payment_method: value }))}
                  onCreditCardSubmit={handleCreditCardSubmit}
                  loading={submitting}
                />

                {/* Submit Button */}
                <CheckoutSubmitButton
                  paymentMethod={form.payment_method}
                  submitting={submitting}
                  onSubmit={handleSubmit}
                />
              </form>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <OrderSummary
                selectedPackage={selectedPackage}
                userCurrency={userCurrency}
                billingPeriod={billing_period}
                isTrialFlow={isTrialFlow}
              />
            </div>
          </div>
        </div>
      </div>
    </PaymentErrorBoundary>
  )
}