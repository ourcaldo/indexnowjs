import { supabaseAdmin } from '../database/supabase';
import { EncryptionService } from '../auth/encryption';
import { JWT } from 'google-auth-library';
import { SecureServiceRoleWrapper } from '../services/security/SecureServiceRoleWrapper';

export interface ServiceAccount {
  id: string;
  name: string;
  email: string;
  encrypted_credentials: string;
  daily_quota_limit: number;
  minute_quota_limit: number;
  encrypted_access_token?: string;
  access_token_expires_at?: string;
}

interface ServiceAccountCredentials {
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

/**
 * Google Authentication Service
 * 
 * Handles the complete Google API authentication workflow:
 * 1. Decrypt service account credentials from database
 * 2. Generate JWT tokens using service account private key
 * 3. Exchange JWT for access tokens with Google's token endpoint
 * 4. Cache encrypted access tokens in database with expiration
 * 5. Manage token refresh and quota tracking
 */
export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private static readonly INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';
  private static readonly TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes buffer

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Get a valid access token for Google API calls
   * First checks cached token in database, then generates new one if needed
   */
  async getAccessToken(serviceAccountId: string): Promise<string | null> {
    try {
      console.log(`🔑 Getting access token for service account: ${serviceAccountId}`);
      
      // Get service account from database
      const serviceAccount = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'get_service_account_for_token_generation',
          reason: 'Retrieving Google service account for API authentication token generation',
          source: 'google-services/google-auth-service',
          metadata: {
            service_account_id: serviceAccountId,
            operation_type: 'token_generation'
          }
        },
        {
          table: 'indb_google_service_accounts',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { id: serviceAccountId }
        },
        async () => {
          const { data: serviceAccount, error } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .select('*')
            .eq('id', serviceAccountId)
            .single();

          if (error || !serviceAccount) {
            throw new Error(`Service account not found: ${error?.message || 'No account data'}`);
          }

          return serviceAccount;
        }
      );

      // DEBUG: Log encrypted data info
      console.log('🔍 DEBUG - Service Account Data:');
      console.log('- ID:', serviceAccount.id);
      console.log('- Name:', serviceAccount.name);
      console.log('- Email:', serviceAccount.email);
      console.log('- Is Active:', serviceAccount.is_active);
      console.log('- Encrypted Credentials Length:', serviceAccount.encrypted_credentials?.length || 0);
      console.log('- Encrypted Credentials Preview:', serviceAccount.encrypted_credentials?.substring(0, 100) + '...');
      console.log('- Current ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY?.substring(0, 8) + '...');
      
      // Check format
      const parts = serviceAccount.encrypted_credentials?.split(':');
      console.log('- Encrypted Format Parts:', parts?.length || 0);
      if (parts && parts.length === 2) {
        console.log('- IV Length (hex):', parts[0].length);
        console.log('- Encrypted Data Length (hex):', parts[1].length);
        console.log('- IV (first 16 chars):', parts[0].substring(0, 16));
        console.log('- Encrypted Data (first 32 chars):', parts[1].substring(0, 32));
      }

      // Check if we have a valid cached token
      const cachedToken = await this.getCachedAccessToken(serviceAccount);
      if (cachedToken) {
        console.log('✅ Using cached access token');
        return cachedToken;
      }

      // Generate new access token
      console.log('🔄 Generating new access token');
      const newToken = await this.generateNewAccessToken(serviceAccount);
      
      if (newToken) {
        // Cache the new token in database
        await this.cacheAccessToken(serviceAccountId, newToken);
        console.log('✅ New access token generated and cached');
        return newToken.access_token;
      }

      return null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get available service account for a user
   */
  async getAvailableServiceAccount(userId: string): Promise<ServiceAccount | null> {
    try {
      const accounts = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: userId,
          operation: 'get_available_service_account_for_user',
          reason: 'Retrieving active Google service account for user API operations',
          source: 'google-services/google-auth-service',
          metadata: {
            target_user_id: userId,
            operation_type: 'service_account_lookup'
          }
        },
        {
          table: 'indb_google_service_accounts',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { user_id: userId, is_active: true }
        },
        async () => {
          const { data: accounts, error } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1);

          if (error) {
            throw new Error(`Failed to get service accounts: ${error.message}`);
          }

          if (!accounts?.length) {
            console.log('No active service accounts found for user:', userId);
            return null;
          }

          return accounts;
        }
      );

      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Error getting service account:', error);
      return null;
    }
  }

  /**
   * Check if we have a valid cached access token
   */
  private async getCachedAccessToken(serviceAccount: ServiceAccount): Promise<string | null> {
    try {
      if (!serviceAccount.encrypted_access_token || !serviceAccount.access_token_expires_at) {
        return null;
      }

      const expiresAt = new Date(serviceAccount.access_token_expires_at).getTime();
      const now = Date.now();
      
      // Check if token is still valid (with buffer)
      if (expiresAt <= now + GoogleAuthService.TOKEN_EXPIRY_BUFFER) {
        console.log('Cached token expired or expiring soon');
        return null;
      }

      // Decrypt and return cached token
      const accessToken = EncryptionService.decrypt(serviceAccount.encrypted_access_token);
      return accessToken;
    } catch (error) {
      console.error('Error checking cached token:', error);
      return null;
    }
  }

  /**
   * Generate new access token using service account credentials
   */
  private async generateNewAccessToken(serviceAccount: ServiceAccount): Promise<{ access_token: string; expires_in: number } | null> {
    try {
      console.log('🔄 Starting generateNewAccessToken process...');
      
      // Check if credentials are empty 
      if (!serviceAccount.encrypted_credentials || serviceAccount.encrypted_credentials.trim() === '') {
        console.log('⚠️ Service account has no encrypted credentials. Skipping...');
        return null;
      }

      console.log('🔐 DEBUG - About to decrypt credentials...');
      console.log('- Encrypted data length:', serviceAccount.encrypted_credentials.length);
      console.log('- Encrypted data to decrypt:', serviceAccount.encrypted_credentials.substring(0, 100) + '...');
      
      // Decrypt service account credentials - FORCE DECRYPTION ATTEMPT
      let credentialsJson: string;
      try {
        console.log('🔓 FORCING DECRYPTION ATTEMPT...');
        credentialsJson = EncryptionService.decrypt(serviceAccount.encrypted_credentials);
        console.log('✅ DEBUG - DECRYPTION SUCCESSFUL!');
        console.log('- Decrypted JSON length:', credentialsJson.length);
        console.log('- Decrypted JSON preview (first 500 chars):', credentialsJson.substring(0, 500));
        console.log('- Full decrypted JSON:', credentialsJson);
      } catch (decryptError) {
        console.error('❌ DEBUG - DECRYPTION FAILED:', decryptError);
        console.error('- Error type:', decryptError instanceof Error ? decryptError.name : typeof decryptError);
        console.error('- Error message:', decryptError instanceof Error ? decryptError.message : String(decryptError));
        console.error('- Error stack:', decryptError instanceof Error ? decryptError.stack : 'No stack');
        
        // DO NOT CLEAR ANYTHING - just fail and show the error
        throw decryptError;
      }

      console.log('📋 DEBUG - Parsing JSON credentials...');
      let credentials: ServiceAccountCredentials;
      try {
        credentials = JSON.parse(credentialsJson);
        console.log('✅ DEBUG - JSON parsing successful!');
        console.log('- Service account type:', credentials.type);
        console.log('- Project ID:', credentials.project_id);
        console.log('- Client email:', credentials.client_email);
        console.log('- Private key preview:', credentials.private_key?.substring(0, 50) + '...');
      } catch (parseError) {
        console.error('❌ DEBUG - JSON parsing failed:', parseError);
        console.error('- Raw decrypted data:', credentialsJson);
        throw parseError;
      }

      console.log('🔐 DEBUG - Creating JWT with service account credentials...');
      console.log('- Email for JWT:', credentials.client_email);
      console.log('- Private key starts with:', credentials.private_key?.substring(0, 30));
      console.log('- Scopes:', [GoogleAuthService.INDEXING_SCOPE]);
      
      // Create JWT client
      let jwtClient: JWT;
      try {
        jwtClient = new JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: [GoogleAuthService.INDEXING_SCOPE]
        });
        console.log('✅ DEBUG - JWT client created successfully');
      } catch (jwtError) {
        console.error('❌ DEBUG - JWT client creation failed:', jwtError);
        throw jwtError;
      }

      console.log('🌐 DEBUG - Requesting access token from Google...');
      // Get access token
      let tokenResponse;
      try {
        tokenResponse = await jwtClient.authorize();
        console.log('✅ DEBUG - Google authorization successful!');
        console.log('- Token type:', typeof tokenResponse.access_token);
        console.log('- Token length:', tokenResponse.access_token?.length || 0);
        console.log('- Token preview:', tokenResponse.access_token?.substring(0, 20) + '...');
        console.log('- Expires in:', tokenResponse.expiry_date);
      } catch (authError) {
        console.error('❌ DEBUG - Google authorization failed:', authError);
        console.error('- Error details:', authError instanceof Error ? authError.message : String(authError));
        throw authError;
      }
      
      if (!tokenResponse.access_token) {
        console.error('❌ DEBUG - No access token received from Google');
        console.error('- Response:', tokenResponse);
        throw new Error('No access token received from Google');
      }

      console.log('✅ Successfully obtained access token from Google');
      
      return {
        access_token: tokenResponse.access_token,
        expires_in: 3600 // Google tokens typically expire in 1 hour
      };
      
    } catch (error) {
      console.error('Error generating access token:', error);
      return null;
    }
  }

  /**
   * Cache encrypted access token in database
   */
  private async cacheAccessToken(serviceAccountId: string, tokenData: { access_token: string; expires_in: number }): Promise<void> {
    try {
      // Encrypt access token
      const encryptedToken = EncryptionService.encrypt(tokenData.access_token);
      
      // Calculate expiration time (with some buffer)
      const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000) - GoogleAuthService.TOKEN_EXPIRY_BUFFER);

      // Update service account with cached token
      await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'cache_google_access_token',
          reason: 'Updating Google service account with encrypted access token and expiration',
          source: 'google-services/google-auth-service',
          metadata: {
            service_account_id: serviceAccountId,
            token_expires_at: expiresAt.toISOString(),
            operation_type: 'token_caching'
          }
        },
        {
          table: 'indb_google_service_accounts',
          operationType: 'update',
          whereConditions: { id: serviceAccountId },
          data: {
            encrypted_access_token: encryptedToken,
            access_token_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        async () => {
          const { error } = await supabaseAdmin
            .from('indb_google_service_accounts')
            .update({
              encrypted_access_token: encryptedToken,
              access_token_expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', serviceAccountId);

          if (error) {
            throw new Error(`Failed to cache access token: ${error.message}`);
          }

          console.log('✅ Access token cached in database');
          return { success: true };
        }
      );
    } catch (error) {
      console.error('Error caching access token:', error);
    }
  }

  /**
   * Validate service account credentials format
   */
  static validateServiceAccountCredentials(credentialsJson: string): boolean {
    try {
      const credentials = JSON.parse(credentialsJson);
      const requiredFields = [
        'type', 'project_id', 'private_key_id', 'private_key',
        'client_email', 'client_id', 'auth_uri', 'token_uri'
      ];
      
      return requiredFields.every(field => credentials[field]);
    } catch (error) {
      return false;
    }
  }
}