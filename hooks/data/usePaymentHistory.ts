'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/database'
import { BILLING_ENDPOINTS, buildEndpoint } from '@/lib/core/constants/ApiEndpoints'

interface PaymentTransaction {
  id: string
  user_id: string
  package_id: string
  amount: number
  currency: string
  payment_method: 'midtrans_snap' | 'midtrans_recurring' | 'bank_transfer'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'expired'
  transaction_id?: string
  external_id?: string
  payment_url?: string
  invoice_url?: string
  created_at: string
  updated_at: string
  paid_at?: string
  expired_at?: string
  metadata?: any
  package?: {
    id: string
    name: string
    billing_period: string
    features: string[]
  }
}

interface PaymentInvoice {
  id: string
  user_id: string
  transaction_id: string
  invoice_number: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  paid_date?: string
  created_at: string
  invoice_url?: string
  transaction?: PaymentTransaction
}

interface PaymentStats {
  total_spent: number
  total_transactions: number
  successful_payments: number
  failed_payments: number
  average_transaction: number
  currency: string
  payment_methods: Record<string, number>
  monthly_spending: Array<{
    month: string
    amount: number
    transactions: number
  }>
}

interface UsePaymentHistoryReturn {
  transactions: PaymentTransaction[]
  invoices: PaymentInvoice[]
  paymentStats: PaymentStats | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  // Actions
  fetchTransactions: (page?: number, limit?: number, filters?: PaymentFilters) => Promise<void>
  fetchInvoices: (page?: number, limit?: number) => Promise<void>
  fetchPaymentStats: (timeRange?: 'all' | '1y' | '6m' | '3m' | '1m') => Promise<void>
  retryPayment: (transactionId: string) => Promise<{ success: boolean; error?: string }>
  downloadInvoice: (invoiceId: string) => Promise<{ success: boolean; url?: string; error?: string }>
  // Utilities
  getTransactionsByStatus: (status: PaymentTransaction['status']) => PaymentTransaction[]
  getTransactionsByMethod: (method: PaymentTransaction['payment_method']) => PaymentTransaction[]
  getTotalSpent: (timeRange?: 'all' | '1y' | '6m' | '3m' | '1m') => number
}

interface PaymentFilters {
  status?: PaymentTransaction['status']
  payment_method?: PaymentTransaction['payment_method']
  date_from?: string
  date_to?: string
  package_id?: string
}

export function usePaymentHistory(): UsePaymentHistoryReturn {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([])
  const [invoices, setInvoices] = useState<PaymentInvoice[]>([])
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Fetch payment transactions
  const fetchTransactions = useCallback(async (page = 1, limit = 10, filters?: PaymentFilters) => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        setError('Authentication required')
        return
      }

      // Build query parameters
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value.toString())
        })
      }

      const response = await fetch(buildEndpoint(BILLING_ENDPOINTS.TRANSACTIONS, Object.fromEntries(queryParams)), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`)
      }

      const data = await response.json()
      setTransactions(data.transactions || [])
      setPagination({
        page: data.pagination?.page || page,
        limit: data.pagination?.limit || limit,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 0
      })
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch payment invoices
  const fetchInvoices = useCallback(async (page = 1, limit = 10) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(buildEndpoint(`${BILLING_ENDPOINTS.TRANSACTIONS.replace('/transactions', '/invoices')}`, {page: page.toString(), limit: limit.toString()}), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      }
    } catch (err) {
      console.error('Error fetching invoices:', err)
    }
  }, [])

  // Fetch payment statistics
  const fetchPaymentStats = useCallback(async (timeRange: 'all' | '1y' | '6m' | '3m' | '1m' = 'all') => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch(buildEndpoint(`${BILLING_ENDPOINTS.TRANSACTIONS.replace('/transactions', '/stats')}`, {timeRange}), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setPaymentStats(data.stats || null)
      }
    } catch (err) {
      console.error('Error fetching payment stats:', err)
    }
  }, [])

  // Retry failed payment
  const retryPayment = useCallback(async (transactionId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(`${BILLING_ENDPOINTS.TRANSACTION_BY_ID(transactionId)}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Payment retry failed: ${response.status}` }
      }

      // Refresh transactions
      await fetchTransactions(pagination.page, pagination.limit)
      return { success: true }
    } catch (err) {
      console.error('Error retrying payment:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to retry payment' }
    }
  }, [fetchTransactions, pagination.page, pagination.limit])

  // Download invoice
  const downloadInvoice = useCallback(async (invoiceId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.access_token) {
        return { success: false, error: 'Authentication required' }
      }

      const response = await fetch(`${BILLING_ENDPOINTS.TRANSACTIONS.replace('/transactions', '/invoices')}/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.error || `Invoice download failed: ${response.status}` }
      }

      const data = await response.json()
      return { success: true, url: data.downloadUrl }
    } catch (err) {
      console.error('Error downloading invoice:', err)
      return { success: false, error: err instanceof Error ? err.message : 'Failed to download invoice' }
    }
  }, [])

  // Utility functions
  const getTransactionsByStatus = useCallback((status: PaymentTransaction['status']) => {
    return transactions.filter(transaction => transaction.status === status)
  }, [transactions])

  const getTransactionsByMethod = useCallback((method: PaymentTransaction['payment_method']) => {
    return transactions.filter(transaction => transaction.payment_method === method)
  }, [transactions])

  const getTotalSpent = useCallback((timeRange: 'all' | '1y' | '6m' | '3m' | '1m' = 'all') => {
    if (!paymentStats) return 0
    
    if (timeRange === 'all') {
      return paymentStats.total_spent
    }
    
    // Filter by time range if monthly_spending data is available
    const now = new Date()
    const monthsBack = timeRange === '1y' ? 12 : timeRange === '6m' ? 6 : timeRange === '3m' ? 3 : 1
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
    
    return paymentStats.monthly_spending
      ?.filter(month => new Date(month.month) >= cutoffDate)
      ?.reduce((total, month) => total + month.amount, 0) || 0
  }, [paymentStats])

  // Initial load
  useEffect(() => {
    fetchTransactions()
    fetchInvoices()
    fetchPaymentStats()
  }, [fetchTransactions, fetchInvoices, fetchPaymentStats])

  return {
    transactions,
    invoices,
    paymentStats,
    loading,
    error,
    pagination,
    fetchTransactions,
    fetchInvoices,
    fetchPaymentStats,
    retryPayment,
    downloadInvoice,
    getTransactionsByStatus,
    getTransactionsByMethod,
    getTotalSpent
  }
}