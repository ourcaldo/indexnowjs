'use client'

import { useState, useEffect } from 'react'
import { 
  Filter, 
  Search, 
  Calendar, 
  Receipt, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { authService } from '@/lib/auth'
import { supabase } from '@/lib/database'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

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
  package: {
    name: string
    slug: string
  }
  gateway: {
    name: string
    slug: string
  }
  subscription: {
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

export default function BillingHistoryPage() {
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
        limit: '20'
      })

      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('type', typeFilter)

      const response = await fetch(`${BILLING_ENDPOINTS.HISTORY}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to load billing history')
      }

      const result = await response.json()
      // API returns: { success: true, data: { transactions: [...], summary: {...}, pagination: {...} } }
      const data = result?.success === true && result.data ? result.data : result
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
      case 'proof_uploaded': return <Clock className="h-4 w-4 text-warning" />
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />
      case 'cancelled': return <XCircle className="h-4 w-4 text-muted-foreground" />
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' }
      case 'pending': return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' }
      case 'proof_uploaded': return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' }
      case 'failed': return { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' }
      case 'cancelled': return { bg: 'bg-muted/10', text: 'text-muted-foreground', border: 'border-muted/20' }
      default: return { bg: 'bg-muted/10', text: 'text-muted-foreground', border: 'border-muted/20' }
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
      transaction.package.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing History</h1>
          <p className="text-muted-foreground mt-1">View and manage your payment transactions</p>
        </div>
        <button
          onClick={loadBillingHistory}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      {historyData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card p-3 rounded-lg border border-border">
            <div className="text-xl font-bold text-foreground">
              {historyData.summary.total_transactions}
            </div>
            <div className="text-xs text-muted-foreground">Total Transactions</div>
          </div>
          <div className="bg-card p-3 rounded-lg border border-border">
            <div className="text-xl font-bold text-success">
              {historyData.summary.completed_transactions}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="bg-card p-3 rounded-lg border border-border">
            <div className="text-xl font-bold text-warning">
              {historyData.summary.pending_transactions}
            </div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="bg-card p-3 rounded-lg border border-border">
            <div className="text-xl font-bold text-foreground">
              {formatCurrency(historyData.summary.total_amount_spent)}
            </div>
            <div className="text-xs text-muted-foreground">Total Spent</div>
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

      {/* Transactions Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {filteredTransactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Transaction</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Package</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTransactions.map((transaction) => (
                    <tr 
                      key={transaction.id} 
                      className="hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/dashboard/settings/plans-billing/order/${transaction.id}`}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-foreground text-sm">
                            {formatTransactionType(transaction.transaction_type)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {transaction.id}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground text-sm">
                          {transaction.package.name}
                        </div>
                        {transaction.subscription && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.subscription.billing_period}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground text-sm">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(transaction.transaction_status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            getStatusColor(transaction.transaction_status).bg
                          } ${getStatusColor(transaction.transaction_status).text} ${
                            getStatusColor(transaction.transaction_status).border
                          }`}>
                            {transaction.transaction_status === 'proof_uploaded' ? 'WAITING FOR CONFIRMATION' : transaction.transaction_status.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-foreground">
                          {formatDate(transaction.created_at)}
                        </div>
                        {transaction.verified_at && (
                          <div className="text-xs text-muted-foreground">
                            Verified: {formatDate(transaction.verified_at)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-xs text-foreground">
                          {transaction.gateway.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transaction.payment_method || 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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