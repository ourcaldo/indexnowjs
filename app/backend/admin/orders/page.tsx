'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { supabaseBrowser } from '@/lib/database'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import { ADMIN_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'

interface OrderTransaction {
  id: string
  user_id: string
  package_id: string
  transaction_status: 'pending' | 'proof_uploaded' | 'completed' | 'failed'
  amount: number
  currency: string
  payment_proof_url?: string
  created_at: string
  updated_at: string
  metadata: {
    customer_info: {
      first_name: string
      last_name: string
      email: string
    }
    billing_period: string
  }
  package: {
    name: string
    slug: string
    billing_period: string
  }
  user: {
    full_name: string
    user_id: string
  }
  gateway: {
    name: string
    slug: string
  }
}

interface OrderSummary {
  total_orders: number
  pending_orders: number
  proof_uploaded_orders: number
  completed_orders: number
  failed_orders: number
  total_revenue: number
  recent_activity: number
}

interface OrdersData {
  orders: OrderTransaction[]
  summary: OrderSummary
  pagination: {
    current_page: number
    total_pages: number
    total_items: number
    items_per_page: number
    has_next: boolean
    has_prev: boolean
  }
}

export default function AdminOrdersPage() {
  const [ordersData, setOrdersData] = useState<OrdersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])

  // Filters
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [customerSearch, setCustomerSearch] = useState<string>('')
  const [packageFilter, setPackageFilter] = useState<string>('all')

  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    loadOrders()
  }, [currentPage, statusFilter, customerSearch, packageFilter])

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const session = await supabaseBrowser.auth.getSession()
      if (!session.data.session?.access_token) {
        throw new Error('Not authenticated')
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '25'
      })

      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (customerSearch) params.append('customer', customerSearch)
      if (packageFilter && packageFilter !== 'all') params.append('package_id', packageFilter)

      const response = await fetch(`${ADMIN_ENDPOINTS.ORDERS}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        credentials: 'include' // Essential for cross-subdomain authentication
      })

      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      if (data.success) {
        setOrdersData(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch orders')
      }

    } catch (error: any) {
      setError(error.message)
      addToast({
        type: 'error',
        title: 'Error',
        description: error.message || 'Failed to load orders'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-muted/10 text-muted-foreground border-muted/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'proof_uploaded':
        return <Badge variant="secondary" className="bg-muted/10 text-muted-foreground border-muted/20"><AlertCircle className="w-3 h-3 mr-1" />Waiting for Confirmation</Badge>
      case 'completed':
        return <Badge variant="secondary" className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case 'failed':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="secondary" className="bg-muted/10 text-muted-foreground border-muted/20">{status}</Badge>
    }
  }

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId])
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && ordersData?.orders) {
      setSelectedOrders(ordersData.orders.map(order => order.id))
    } else {
      setSelectedOrders([])
    }
  }

  const handleViewOrder = (orderId: string) => {
    router.push(`/backend/admin/orders/${orderId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Orders</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadOrders} className="bg-primary hover:bg-primary/90 text-white">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders Management</h1>
          <p className="text-muted-foreground">Manage and process payment orders</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="border-border text-muted-foreground hover:bg-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {ordersData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{ordersData.summary.total_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{ordersData.summary.proof_uploaded_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{ordersData.summary.completed_orders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatCurrency(ordersData.summary.total_revenue, 'IDR')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="proof_uploaded">Proof Uploaded</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Customer Search</label>
              <Input
                placeholder="Search by name or email"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="border-border"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Package</label>
              <Select value={packageFilter} onValueChange={setPackageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All packages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All packages</SelectItem>
                  {/* Add package options dynamically */}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setStatusFilter('all')
                  setCustomerSearch('')
                  setPackageFilter('all')
                  setCurrentPage(1)
                }}
                variant="outline"
                className="border-border text-muted-foreground hover:bg-secondary"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Orders</CardTitle>
            {selectedOrders.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedOrders.length === ordersData?.orders.length && ordersData?.orders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="text-left">Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersData?.orders.map((order) => (
                <TableRow key={order.id} className="hover:bg-secondary">
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="text-left">
                    <button
                      onClick={() => handleViewOrder(order.id)}
                      className="text-foreground hover:text-primary hover:underline font-medium transition-colors text-left block"
                    >
                      #{order.id}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{order.user.full_name}</div>
                      <div className="text-sm text-muted-foreground">{order.metadata?.customer_info?.email || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">{order.package.name}</div>
                      <div className="text-sm text-muted-foreground">{order.metadata?.billing_period || order.package.billing_period}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {formatCurrency(order.amount, order.currency as 'IDR' | 'USD')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.transaction_status)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm text-foreground">{formatRelativeTime(order.created_at)}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(order.created_at)}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-secondary">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleViewOrder(order.id)} className="text-foreground hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {ordersData?.pagination && ordersData.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((ordersData.pagination.current_page - 1) * ordersData.pagination.items_per_page) + 1} to{' '}
                {Math.min(ordersData.pagination.current_page * ordersData.pagination.items_per_page, ordersData.pagination.total_items)}{' '}
                of {ordersData.pagination.total_items} orders
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!ordersData.pagination.has_prev}
                  className="border-border"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {ordersData.pagination.current_page} of {ordersData.pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!ordersData.pagination.has_next}
                  className="border-border"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}