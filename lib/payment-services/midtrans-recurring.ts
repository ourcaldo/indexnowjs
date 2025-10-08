import { logger } from '@/lib/monitoring/error-handling'

// Midtrans Recurring Payment Service for Supabase Integration
export function midtransAuthHeader(): string {
  const key = process.env.MIDTRANS_SERVER_KEY!;
  const base = Buffer.from(`${key}:`).toString("base64");
  return `Basic ${base}`;
}

export async function midtransFetch(endpoint: string, options: RequestInit = {}) {
  const base = process.env.MIDTRANS_BASE_URL || 'https://api.sandbox.midtrans.com';
  const url = `${base}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: midtransAuthHeader(),
    ...options.headers,
  };
  
  logger.debug({ method: options.method || 'GET', url }, 'Midtrans API request');
  
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    logger.error({ status: res.status, error: errorText }, 'Midtrans API error');
    throw new Error(`Midtrans API Error: ${res.status} - ${errorText}`);
  }
  
  const result = await res.json();
  logger.debug({ result }, 'Midtrans API success');
  return result;
}

// Step 1: Create initial charge with tokenization
export async function createChargeWithToken(tokenId: string, orderDetails: any) {
  const payload = {
    payment_type: "credit_card",
    transaction_details: orderDetails,
    credit_card: {
      token_id: tokenId,
      save_token_id: true // This is KEY for recurring
    }
  };
  
  logger.debug({ tokenPrefix: tokenId.substring(0, 10) }, 'Midtrans: Creating charge with token');
  return midtransFetch('/v2/charge', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// Step 2: Check transaction status to get saved_token_id
export async function getTransactionStatus(orderId: string) {
  logger.debug({ orderId }, 'Midtrans: Getting transaction status');
  return midtransFetch(`/v2/${encodeURIComponent(orderId)}/status`, { method: "GET" });
}

// Step 3: Create subscription using saved_token_id
export async function createSubscription(payload: any) {
  logger.debug({ payload }, 'Midtrans: Creating subscription');
  return midtransFetch(`/v1/subscriptions`, {
    method: "POST",
    body: JSON.stringify({ currency: "IDR", payment_type: "credit_card", ...payload }),
  });
}

export async function getSubscription(id: string) {
  logger.debug({ subscriptionId: id }, 'Midtrans: Getting subscription');
  return midtransFetch(`/v1/subscriptions/${id}`, { method: "GET" });
}

export async function enableSubscription(id: string) {
  logger.debug({ subscriptionId: id }, 'Midtrans: Enabling subscription');
  return midtransFetch(`/v1/subscriptions/${id}/enable`, { method: "POST" });
}

export async function disableSubscription(id: string) {
  logger.debug({ subscriptionId: id }, 'Midtrans: Disabling subscription');
  return midtransFetch(`/v1/subscriptions/${id}/disable`, { method: "POST" });
}

export async function updateSubscription(id: string, patch: any) {
  logger.debug({ subscriptionId: id, patch }, 'Midtrans: Updating subscription');
  return midtransFetch(`/v1/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}