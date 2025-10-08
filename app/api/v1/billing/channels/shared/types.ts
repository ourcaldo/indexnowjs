export interface PaymentChannelRequest {
  package_id: string
  billing_period: string
  customer_info: CustomerInfo
  user_data?: UserData
}

export interface CustomerInfo {
  first_name: string
  last_name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country: string
  description?: string
}

export interface UserData {
  full_name: string
  email: string
  phone_number?: string
  country: string
}

export interface PaymentChannelResponse {
  success: boolean
  data?: any
  message?: string
  requires_redirect?: boolean
  redirect_url?: string
}

export interface GatewayConfiguration {
  id: string
  slug: string
  name: string
  description: string
  is_active: boolean
  configuration: any
  api_credentials: any
}