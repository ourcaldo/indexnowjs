'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Upload, CheckCircle, Clock, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { supabaseBrowser } from '@/lib/database'
import { useToast } from '@/hooks/use-toast'
import { BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface Transaction {
  id: string
  user_id: string
  package_id: string
  gateway_id: string
  transaction_type: string
  transaction_status: string
  amount: number
  currency: string
  payment_proof_url: string | null
  billing_period: string
  created_at: string
  metadata: any
  package: {
    id: string
    name: string
    description: string
    features: string[]
  }
  gateway: {
    id: string
    name: string
    configuration: {
      bank_name?: string
      account_name?: string
      account_number?: string
    }
  }
  customer_info: {
    first_name: string
    last_name: string
    email: string
    phone_number: string
  }
}

export default function OrderCompletedPage() {
  const params = useParams()
  const router = useRouter()
  const { addToast } = useToast()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)

  useEffect(() => {
    fetchTransactionDetails()
  }, [params.id])

  const fetchTransactionDetails = async () => {
    try {
      const supabase = supabaseBrowser
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${BILLING_ENDPOINTS.HISTORY.replace('/history', '')}/orders/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transaction details')
      }

      const data = await response.json()
      console.log('API Response:', data) // Debug log
      
      if (data.success && data.data) {
        // Map API response to frontend Transaction interface
        const orderData = data.data
        const mappedTransaction = {
          id: orderData.order_id,
          user_id: '', // Not needed for frontend
          package_id: orderData.package?.id || '',
          gateway_id: '', // Not needed for frontend
          transaction_type: 'purchase',
          transaction_status: orderData.status,
          amount: orderData.amount,
          currency: orderData.currency,
          payment_proof_url: null, // Will be set if exists
          billing_period: orderData.billing_period || 'one-time',
          created_at: orderData.created_at,
          metadata: orderData,
          package: orderData.package || {
            id: '',
            name: 'Unknown Package',
            description: '',
            features: []
          },
          gateway: {
            id: '',
            name: orderData.payment_method || 'Unknown Gateway',
            configuration: {}
          },
          customer_info: orderData.customer_info || {
            first_name: '',
            last_name: '',
            email: '',
            phone_number: ''
          }
        }
        setTransaction(mappedTransaction)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error fetching transaction:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load order details'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (!allowedTypes.includes(file.type)) {
        addToast({
          type: 'error',
          title: 'File Type Error',
          message: 'Please upload JPG, PNG, WebP, or PDF files only'
        })
        return
      }

      if (file.size > maxSize) {
        addToast({
          type: 'error',
          title: 'File Size Error',
          message: 'File size must be less than 5MB'
        })
        return
      }

      setProofFile(file)
    }
  }

  const handleUploadProof = async () => {
    if (!proofFile || !transaction) return

    setUploading(true)
    try {
      const supabase = supabaseBrowser
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Authentication required')
      }

      const formData = new FormData()
      formData.append('proof_file', proofFile)
      formData.append('transaction_id', transaction.id)

      const response = await fetch(BILLING_ENDPOINTS.UPLOAD_PROOF, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to upload payment proof')
      }

      const result = await response.json()

      // Update transaction status
      setTransaction(prev => prev ? {
        ...prev,
        transaction_status: 'proof_uploaded',
        payment_proof_url: result.file_url
      } : null)

      addToast({
        type: 'success',
        title: 'Upload Successful',
        message: 'Payment proof uploaded successfully! We will verify your payment soon.'
      })

      setShowUploadForm(false)
      setProofFile(null)

    } catch (error) {
      console.error('Error uploading proof:', error)
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload payment proof. Please try again.'
      })
    } finally {
      setUploading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground"><Clock className="w-3 h-3 mr-1" />Pending Payment</Badge>
      case 'proof_uploaded':
        return <Badge className="bg-warning text-warning-foreground"><Upload className="w-3 h-3 mr-1" />Waiting for Confirmation</Badge>
      case 'completed':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case 'failed':
        return <Badge className="bg-destructive text-destructive-foreground"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist or you don't have access to it.</p>
          <Button 
            onClick={() => router.push('/dashboard/settings?tab=plans-billing')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Back to Billing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/settings?tab=plans-billing')}
            className="mb-4 text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Billing
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Order Completed</h1>
              <p className="text-muted-foreground mt-1">Thank you for your order! Here are your order details.</p>
            </div>
            {getStatusBadge(transaction.transaction_status)}
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column - Order Details (60%) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Order ID</p>
                    <p className="text-sm text-muted-foreground font-mono">{transaction.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Order Date</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Package</p>
                    <p className="text-sm text-muted-foreground">{transaction.package.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Billing Period</p>
                    <p className="text-sm text-muted-foreground">{transaction.billing_period ? transaction.billing_period.charAt(0).toUpperCase() + transaction.billing_period.slice(1) : 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Package Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Package Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{transaction.package.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{transaction.package.description}</p>
                  </div>

                  <div>
                    <p className="font-medium text-foreground mb-2">Package Features:</p>
                    <ul className="space-y-1">
                      {transaction.package.features?.map((feature: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-center">
                          <CheckCircle className="w-3 h-3 text-success mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Total Amount</span>
                    <span className="text-xl font-bold text-foreground">
                      {transaction.amount !== null && transaction.amount !== undefined ? (
                        transaction.currency === 'USD' 
                          ? `$${transaction.amount}` 
                          : `Rp ${transaction.amount.toLocaleString('id-ID')}`
                      ) : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Name</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.customer_info.first_name} {transaction.customer_info.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">{transaction.customer_info.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Phone</p>
                    <p className="text-sm text-muted-foreground">{transaction.customer_info.phone || transaction.metadata?.customer_info?.phone || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment Information (40%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Payment Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transaction.transaction_status === 'completed' ? (
                  <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground mb-1">Payment Completed Successfully</p>
                        <p className="text-sm text-muted-foreground">
                          Your payment has been processed and your package is now active.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground mb-1">Payment Processing</p>
                        <p className="text-sm text-muted-foreground">
                          Your payment is being processed. You will be notified once it's completed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Payment Method</p>
                    <p className="text-sm text-muted-foreground">{transaction.gateway.name}</p>
                  </div>

                  {transaction.gateway.configuration?.bank_name && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-foreground">Bank</p>
                        <p className="text-sm text-muted-foreground">{transaction.gateway.configuration.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Account Name</p>
                        <p className="text-sm text-muted-foreground">{transaction.gateway.configuration.account_name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Account Number</p>
                        <p className="text-sm text-muted-foreground font-mono">{transaction.gateway.configuration.account_number}</p>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-sm font-medium text-foreground">Amount to Pay</p>
                    <p className="text-lg font-bold text-foreground">
                      {transaction.amount !== null && transaction.amount !== undefined ? (
                        transaction.currency === 'USD' 
                          ? `$${transaction.amount}` 
                          : `Rp ${transaction.amount.toLocaleString('id-ID')}`
                      ) : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-foreground">Reference Number</p>
                    <p className="text-sm text-muted-foreground font-mono">{transaction.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Proof Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground">Payment Confirmation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {transaction.payment_proof_url ? (
                  <div className="text-center py-6">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                    <h3 className="font-semibold text-foreground mb-2">Payment Proof Uploaded</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      We have received your payment proof and will verify it soon.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(transaction.payment_proof_url!, '_blank')}
                      className="border-border text-muted-foreground hover:bg-secondary"
                    >
                      View Uploaded Proof
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      {transaction.transaction_status === 'completed' ? 'Payment has been processed successfully. No further action required.' : 'Upload your payment proof here to speed up payment verification.'}
                    </p>

                    <Button
                      onClick={() => setShowUploadForm(!showUploadForm)}
                      disabled={transaction.transaction_status === 'completed'}
                      className="w-full bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {showUploadForm ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                      {transaction.transaction_status === 'completed' ? 'Payment Completed' : (showUploadForm ? 'Hide Upload Form' : 'Upload Payment Proof')}
                    </Button>

                    {showUploadForm && (
                      <div className="space-y-4 pt-4 border-t border-border">
                        <div>
                          <Label htmlFor="proof_file" className="text-sm font-medium text-foreground">
                            Select Payment Proof *
                          </Label>
                          <Input
                            id="proof_file"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Supported formats: JPG, PNG, WebP, PDF (Max 5MB)
                          </p>
                        </div>

                        {proofFile && (
                          <div className="bg-secondary border border-border rounded-lg p-3">
                            <p className="text-sm font-medium text-foreground">Selected File:</p>
                            <p className="text-sm text-muted-foreground">{proofFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Size: {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        )}

                        <Button
                          onClick={handleUploadProof}
                          disabled={!proofFile || uploading}
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Payment Proof
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}