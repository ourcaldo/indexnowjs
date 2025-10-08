'use client'

import { useState, useEffect } from 'react'
import { 
  Filter, 
  Search, 
  Receipt, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { BILLING_ENDPOINTS, buildEndpoint } from '@/lib/core/constants/ApiEndpoints'

interface Transaction {
  id: string
  transaction_type: string
  transaction_status: string
  amount: number
  currency: string
  payment_method: string
  gateway_transaction_id: string
  created_at: string
  processed_at: string | null
  verified_at: string | null
  notes: string | null
  package_name?: string
  package?: {
    name: string
    slug: string
  }
  gateway?: {
    name: string
    slug: string
  }
  subscription?: {
    billing_period: string
    started_at: string
    expires_at: string
  } | null
}

interface BillingHistoryData {
  transactions: Transaction[]
  summary: {
    total_transactions: number
    completed_transactions: number
    pending_transactions: number
    failed_transactions: number
    total_amount_spent: number
  }
  pagination: {
    current_page: number
    total_pages: number
    total_items: number
    items_per_page: number
    has_next: boolean
    has_prev: boolean
  }
}

export default function HistoryTab() {
  const [historyData, setHistoryData] = useState<BillingHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  useEffect(() => {
    loadBillingHistory()
  }, [currentPage, statusFilter, typeFilter])

  const loadBillingHistory = async () => {
    try {
      setLoading(true)
      const user = await authService.getCurrentUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) {
        throw new Error('No authentication token')
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })

      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)

      const response = await fetch(buildEndpoint(BILLING_ENDPOINTS.HISTORY, Object.fromEntries(params)), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        throw new Error('Failed to load billing history')
      }

      const data = await response.json()
      setHistoryData(data)
    } catch (error) {
      console.error('Error loading billing history:', error)
      setError(error instanceof Error ? error.message : 'Failed to load billing history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />
      case 'pending': return <Clock className="h-4 w-4 text-warning" />
      case 'failed': return <XCircle className="h-4 w-4 text-error" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-muted-foreground" />
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' }
      case 'pending': return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' }
      case 'failed': return { bg: 'bg-error/10', text: 'text-error', border: 'border-error/20' }
      case 'cancelled': return { bg: 'bg-muted-foreground/10', text: 'text-muted-foreground', border: 'border-muted-foreground/20' }
      default: return { bg: 'bg-muted-foreground/10', text: 'text-muted-foreground', border: 'border-muted-foreground/20' }
    }
  }

  const formatCurrency = (amount: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'subscription': return 'New Subscription'
      case 'renewal': return 'Renewal'
      case 'upgrade': return 'Plan Upgrade'
      case 'downgrade': return 'Plan Downgrade'
      default: return type.charAt(0).toUpperCase() + type.slice(1)
    }
  }

  const filteredTransactions = historyData?.transactions.filter(transaction => {
    if (!searchTerm) return true
    return (
      transaction.package?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.gateway_transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }) || []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading History</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={loadBillingHistory}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {historyData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-foreground">
              {historyData.summary.total_transactions}
            </div>
            <div className="text-sm text-muted-foreground">Total Transactions</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-success">
              {historyData.summary.completed_transactions}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-warning">
              {historyData.summary.pending_transactions}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(historyData.summary.total_amount_spent)}
            </div>
            <div className="text-sm text-muted-foreground">Total Spent</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by package, order ID, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="min-w-[150px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="min-w-[150px]">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="subscription">New Subscription</option>
              <option value="renewal">Renewal</option>
              <option value="upgrade">Upgrade</option>
              <option value="downgrade">Downgrade</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-card rounded-lg border border-border">
        {filteredTransactions.length > 0 ? (
          <>
            <div className="divide-y divide-border">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="p-6 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/dashboard/settings/plans-billing/order/${transaction.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(transaction.transaction_status)}
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {formatTransactionType(transaction.transaction_type)}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {transaction.package?.name || transaction.package_name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Date: </span>
                          <span className="text-foreground">{formatDate(transaction.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Order ID: </span>
                          <span className="text-foreground font-mono text-xs">
                            {transaction.id}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Method: </span>
                          <span className="text-foreground">
                            {transaction.gateway?.name || 'Unknown Gateway'} - {transaction.payment_method || 'N/A'}
                          </span>
                        </div>
                        {transaction.subscription && (
                          <div>
                            <span className="text-muted-foreground">Period: </span>
                            <span className="text-foreground">
                              {transaction.subscription.billing_period}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-foreground mb-2">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        getStatusColor(transaction.transaction_status).bg
                      } ${getStatusColor(transaction.transaction_status).text} ${
                        getStatusColor(transaction.transaction_status).border
                      }`}>
                        {transaction.transaction_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  {transaction.verified_at && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        Verified: {formatDate(transaction.verified_at)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {historyData?.pagination && historyData.pagination.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((historyData.pagination.current_page - 1) * historyData.pagination.items_per_page) + 1} to{' '}
                  {Math.min(historyData.pagination.current_page * historyData.pagination.items_per_page, historyData.pagination.total_items)} of{' '}
                  {historyData.pagination.total_items} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={!historyData.pagination.has_prev}
                    className={`p-2 rounded-lg transition-colors ${
                      historyData.pagination.has_prev
                        ? 'hover:bg-secondary text-foreground'
                        : 'text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-foreground px-3 py-1">
                    Page {historyData.pagination.current_page} of {historyData.pagination.total_pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={!historyData.pagination.has_next}
                    className={`p-2 rounded-lg transition-colors ${
                      historyData.pagination.has_next
                        ? 'hover:bg-secondary text-foreground'
                        : 'text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Transactions Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter || typeFilter
                ? 'No transactions match your current filters.'
                : 'You haven\'t made any transactions yet.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}