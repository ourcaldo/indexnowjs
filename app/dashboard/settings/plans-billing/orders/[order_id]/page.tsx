'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { usePageViewLogger } from '@/hooks/useActivityLogger'
import { supabaseBrowser } from '@/lib/database'
import { BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'
import {
  Check,
  Copy,
  User,
  CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OrderData {
  order_id: string
  transaction_id: string
  status: string
  payment_status: string
  amount: number
  currency: string
  payment_method: string
  billing_period: string
  created_at: string
  package: {
    id: string
    name: string
    description: string
    features: string[]
    quota_limits: any
  }
  customer_info: {
    first_name: string
    last_name: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zip_code: string
    country: string
  }
  payment_details: {
    va_numbers?: Array<{
      va_number: string
      bank: string
    }>
    payment_code?: string
    store?: string
    payment_method?: string
    expires_at?: string
  }
}

export default function OrderSuccessPage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(5)

  const order_id = params.order_id as string

  // Activity logging
  usePageViewLogger(
    '/dashboard/settings/plans-billing/orders/success',
    'Order Success',
    { section: 'billing_success', order_id }
  )

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        const token =
          (await supabaseBrowser.auth.getSession()).data.session
            ?.access_token
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch(
          BILLING_ENDPOINTS.ORDER_BY_ID(order_id),
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include' // Essential for cross-subdomain authentication
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch order details')
        }

        const result = await response.json()
        setOrderData(result.data)
      } catch (error) {
        console.error('Error fetching order:', error)
        addToast({
          title: 'Error loading order',
          description:
            'Could not load order details. Please try again.',
          type: 'error'
        })
        router.push('/dashboard/settings/plans-billing')
      } finally {
        setLoading(false)
      }
    }

    if (order_id) {
      fetchOrderData()
    }
  }, [order_id, router, addToast])

  // Auto redirect countdown
  useEffect(() => {
    if (!loading && orderData && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
    
    if (countdown === 0) {
      router.push('/dashboard/settings/plans-billing')
    }
  }, [countdown, loading, orderData, router])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    addToast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
      type: 'success'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Order not found</p>
          <Button
            onClick={() =>
              router.push('/dashboard/settings/plans-billing')
            }
            className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Return to Billing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen rounded-2xl overflow-hidden shadow border border-border">
          {/* Left Column - Dark Summary */}
          <div className="bg-card dark:bg-card text-foreground dark:text-foreground p-8 flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-xl font-semibold">Summary</h1>
                <p className="text-muted-foreground text-sm">
                  Order #{orderData.order_id}
                </p>
              </div>

              {/* Package Information */}
              <div className="mb-8">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">{orderData.package.name} - {orderData.billing_period}</h3>
                  <p className="text-muted-foreground text-sm">{orderData.package.description}</p>
                </div>
                <div className="space-y-2">
                  {orderData.package.features?.map((feature, i) => (
                    <p
                      key={i}
                      className="flex items-center text-sm text-muted-foreground"
                    >
                      <span className="mr-2">→</span> {feature}
                    </p>
                  ))}
                </div>
              </div>

              {/* Customer Information */}
              <div className="border-t border-border pt-6 mt-6">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-foreground/10 rounded-full flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-foreground" />
                  </div>
                  <h4 className="font-semibold text-foreground">Customer</h4>
                </div>

                <div className="border border-border rounded-xl p-4 grid grid-cols-2 gap-4">
                  {/* Left column */}
                  <div>
                    <p className="text-foreground font-medium">
                      {orderData.customer_info.first_name} {orderData.customer_info.last_name}
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {orderData.customer_info.phone || orderData.customer_info.email}
                    </p>
                  </div>

                  {/* Right column */}
                  <div className="text-muted-foreground text-sm">
                    {orderData.customer_info.address && (
                      <p>{orderData.customer_info.address}</p>
                    )}
                    {(orderData.customer_info.city || orderData.customer_info.state || orderData.customer_info.zip_code) && (
                      <p>
                        {[orderData.customer_info.city, orderData.customer_info.state, orderData.customer_info.zip_code]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    <p>{orderData.customer_info.country}</p>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              {(orderData.payment_details?.va_numbers ||
                orderData.payment_details?.payment_code) && (
                <div className="mt-8">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payment Details
                  </h4>

                  {/* Display VA numbers from payment_details */}
                  {orderData.payment_details?.va_numbers?.map(
                    (va, index) => (
                      <div
                        key={index}
                        className="bg-background/30 rounded-lg p-4 mb-3"
                      >
                        <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                          {va.bank.toUpperCase()} Virtual Account
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-foreground font-mono text-lg font-bold tracking-wider">
                            {va.va_number}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                va.va_number,
                                `${va.bank.toUpperCase()} VA Number`
                              )
                            }
                            className="text-accent hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {/* Display payment code from payment_details */}
                  {orderData.payment_details?.payment_code && (
                    <div className="bg-background/30 rounded-lg p-4 mb-3">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                        {(orderData.payment_details?.store || 'Payment')} Code
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-foreground font-mono text-lg font-bold tracking-wider">
                          {orderData.payment_details?.payment_code}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              orderData.payment_details?.payment_code!,
                              'Payment Code'
                            )
                          }
                          className="text-accent hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact Support */}
            <div className="mt-6 border border-border bg-background/20 rounded-lg px-4 py-3 flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Do you have problems about your order?
              </p>
              <button
                onClick={() =>
                  window.open('mailto:support@indexnow.studio', '_blank')
                }
                className="text-warning font-medium flex items-center hover:underline"
              >
                CONTACT US →
              </button>
            </div>
          </div>

          {/* Right Column - Success */}
          <div className="bg-background flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center mb-6">
              <Check className="text-success-foreground w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Order has saved!
            </h2>
            <p className="text-muted-foreground mb-6 text-sm">
              {orderData.payment_status === 'paid'
                ? 'Your payment has been confirmed and ready to use.'
                : 'Click return home to go to back homepage.'}
            </p>
            <p className="text-muted-foreground mb-10 text-xs">
              Redirecting in {countdown} seconds...
            </p>
            <Button
              onClick={() =>
                router.push('/dashboard/settings/plans-billing')
              }
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg px-6 py-2"
            >
              RETURN HOME →
            </Button>

            <div className="mt-20 pt-6 border-t border-border w-full text-xs text-muted-foreground flex justify-between">
              <p>ALL RIGHTS RESERVED © 2025</p>
              <p>INDEXNOW STUDIO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
