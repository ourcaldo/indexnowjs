/**
 * Payment gateway type definitions for IndexNow Studio
 */

export interface PaddleConfig {
  apiKey: string;
  clientToken: string;
  environment: 'sandbox' | 'production';
  vendorId?: string;
  webhookSecret?: string;
}

export interface PaymentGatewayResponse {
  success: boolean;
  token?: string;
  redirectUrl?: string;
  error?: string;
}