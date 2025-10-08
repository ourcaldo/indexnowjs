/**
 * Google API Service for IndexNow Studio
 * Centralized Google API integration and management
 */

import { GoogleAuth } from 'google-auth-library';
import { GOOGLE_API } from '@/lib/core/constants/AppConstants';

export interface GoogleServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

export interface IndexingRequest {
  url: string;
  type: 'URL_UPDATED' | 'URL_DELETED';
}

export interface IndexingResponse {
  urlNotificationMetadata: {
    url: string;
    latestUpdate: {
      url: string;
      type: string;
      notifyTime: string;
    };
  };
}

export interface GoogleApiQuota {
  dailyUsed: number;
  dailyLimit: number;
  minuteUsed: number;
  minuteLimit: number;
}

export class GoogleApiService {
  private auth: GoogleAuth;
  private credentials: GoogleServiceAccount;
  private accessToken?: string;
  private tokenExpiration?: Date;

  constructor(credentials: GoogleServiceAccount) {
    this.credentials = credentials;
    this.auth = new GoogleAuth({
      credentials,
      scopes: [...GOOGLE_API.SCOPES],
    });
  }

  /**
   * Get or refresh access token
   */
  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiration && new Date() < this.tokenExpiration) {
      return this.accessToken;
    }

    try {
      const client = await this.auth.getClient();
      const tokenResponse = await client.getAccessToken();
      
      if (!tokenResponse.token) {
        throw new Error('Failed to obtain access token');
      }

      this.accessToken = tokenResponse.token;
      // Set expiration to 55 minutes from now (tokens expire in 1 hour)
      this.tokenExpiration = new Date(Date.now() + 55 * 60 * 1000);
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit URL to Google Indexing API
   */
  async submitUrl(request: IndexingRequest): Promise<IndexingResponse> {
    const accessToken = await this.getAccessToken();

    const requestBody = {
      url: request.url,
      type: request.type,
    };

    try {
      const response = await fetch(GOOGLE_API.ENDPOINTS.INDEXING, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to submit URL to Google Indexing API');
    }
  }

  /**
   * Submit multiple URLs in batch
   */
  async submitUrls(requests: IndexingRequest[]): Promise<{
    successful: Array<{ request: IndexingRequest; response: IndexingResponse }>;
    failed: Array<{ request: IndexingRequest; error: string }>;
  }> {
    const results = {
      successful: [] as Array<{ request: IndexingRequest; response: IndexingResponse }>,
      failed: [] as Array<{ request: IndexingRequest; error: string }>,
    };

    // Process URLs sequentially to respect rate limits
    for (const request of requests) {
      try {
        const response = await this.submitUrl(request);
        results.successful.push({ request, response });
        
        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.failed.push({
          request,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Validate service account credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get service account info
   */
  getServiceAccountInfo(): {
    email: string;
    projectId: string;
    clientId: string;
  } {
    return {
      email: this.credentials.client_email,
      projectId: this.credentials.project_id,
      clientId: this.credentials.client_id,
    };
  }

  /**
   * Check quota usage (this would typically integrate with Google Cloud Console API)
   * For now, this is a placeholder that returns mock data
   */
  async getQuotaUsage(): Promise<GoogleApiQuota> {
    // In a real implementation, this would call Google Cloud Console API
    // to get actual quota usage. For now, we return mock data.
    return {
      dailyUsed: 0,
      dailyLimit: GOOGLE_API.QUOTA_LIMITS.DAILY_DEFAULT,
      minuteUsed: 0,
      minuteLimit: GOOGLE_API.QUOTA_LIMITS.MINUTE_DEFAULT,
    };
  }

  /**
   * Test connection to Google Indexing API
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const token = await this.getAccessToken();
      const testUrl = 'https://example.com/test';
      
      const response = await fetch(GOOGLE_API.ENDPOINTS.INDEXING, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: testUrl,
          type: 'URL_UPDATED',
        }),
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Successfully connected to Google Indexing API',
        };
      } else {
        const errorText = await response.text();
        return {
          success: false,
          message: `Connection test failed: ${response.status}`,
          details: errorText,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create Google API service instance from encrypted credentials
   */
  static fromEncryptedCredentials(encryptedCredentials: string, encryptionKey: string): GoogleApiService {
    // This would typically decrypt the credentials
    // For now, assume credentials are JSON string
    try {
      const credentials = JSON.parse(encryptedCredentials) as GoogleServiceAccount;
      return new GoogleApiService(credentials);
    } catch (error) {
      throw new Error('Invalid service account credentials');
    }
  }
}