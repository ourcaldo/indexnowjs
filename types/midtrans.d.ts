// Midtrans global type declarations

interface MidtransSnapOptions {
  onSuccess?: (result: any) => void
  onPending?: (result: any) => void
  onError?: (result: any) => void
  onClose?: () => void
}

interface MidtransSnap {
  pay: (token: string, options: MidtransSnapOptions) => void
}

interface Midtrans3DSResponse {
  status_code: string
  status_message: string
  transaction_id?: string
  order_id?: string
  payment_type?: string
  transaction_time?: string
  transaction_status?: string
  gross_amount?: string
  token_id?: string
}

interface Midtrans3DSAuthOptions {
  performAuthentication: (redirect_url: string) => void
  onSuccess: (response: Midtrans3DSResponse) => void
  onPending?: (response: Midtrans3DSResponse) => void
  onFailure: (response: Midtrans3DSResponse) => void
}

interface MidtransNew3ds {
  getCardToken: (cardData: any) => void
  authenticate: (redirectUrl: string, options: Midtrans3DSAuthOptions) => void
  callback?: (response: Midtrans3DSResponse) => void
}

declare global {
  interface Window {
    snap?: MidtransSnap
    MidtransNew3ds?: MidtransNew3ds
    midtransSubmitCard?: () => Promise<void>
  }
}

export {}