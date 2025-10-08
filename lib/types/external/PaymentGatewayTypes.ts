/**
 * Payment gateway type definitions for IndexNow Studio
 */

export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  environment: 'sandbox' | 'production';
}

export interface PaymentGatewayResponse {
  success: boolean;
  token?: string;
  redirectUrl?: string;
  error?: string;
}