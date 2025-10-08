/**
 * Midtrans Token Manager - Token Management & Caching
 * Handles secure token storage and retrieval for recurring payments
 * 
 * Updated with P0.2 Security Fix - Uses SecureServiceRoleWrapper
 */

import { SecureServiceRoleHelpers } from '@/lib/services/security/SecureServiceRoleWrapper'

export interface TokenData {
  saved_token_id: string
  expired_at?: string
  masked_card?: string
  card_type?: string
  user_id: string
  transaction_id: string
}

export class MidtransTokenManager {
  
  /**
   * Store saved token from successful transaction using secure service role
   */
  async storeToken(tokenData: TokenData): Promise<boolean> {
    try {
      // Create secure operation context
      const operationContext = {
        userId: tokenData.user_id,
        operation: 'store_payment_token',
        reason: 'Store recurring payment token after successful transaction',
        source: 'MidtransTokenManager.storeToken',
        metadata: {
          saved_token_id: tokenData.saved_token_id,
          transaction_id: tokenData.transaction_id,
          masked_card: tokenData.masked_card,
          card_type: tokenData.card_type,
          has_expiry: !!tokenData.expired_at
        }
      }

      // First check if token already exists for this user using secure wrapper
      const existingTokens = await SecureServiceRoleHelpers.secureSelect(
        operationContext,
        'indb_payment_saved_tokens',
        ['id'],
        { 
          user_id: tokenData.user_id,
          saved_token_id: tokenData.saved_token_id 
        }
      )

      if (existingTokens.length > 0) {
        // Update existing token using secure wrapper
        const updateData = {
          expired_at: tokenData.expired_at,
          masked_card: tokenData.masked_card,
          card_type: tokenData.card_type,
          transaction_id: tokenData.transaction_id,
          is_active: true,
          updated_at: new Date().toISOString()
        }

        const updateResult = await SecureServiceRoleHelpers.secureUpdate(
          operationContext,
          'indb_payment_saved_tokens',
          updateData,
          { id: existingTokens[0].id }
        )

        return updateResult.length > 0

      } else {
        // Insert new token using secure wrapper
        const insertData = {
          user_id: tokenData.user_id,
          saved_token_id: tokenData.saved_token_id,
          expired_at: tokenData.expired_at,
          masked_card: tokenData.masked_card,
          card_type: tokenData.card_type,
          transaction_id: tokenData.transaction_id,
          gateway_name: 'midtrans',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const insertResult = await SecureServiceRoleHelpers.secureInsert(
          operationContext,
          'indb_payment_saved_tokens',
          insertData
        )

        return !!insertResult
      }

    } catch (error) {
      console.error('Error storing token:', error)
      return false
    }
  }

  /**
   * Get active token for user using secure service role
   */
  async getActiveToken(userId: string): Promise<TokenData | null> {
    try {
      // Create secure operation context
      const operationContext = {
        userId: userId,
        operation: 'get_active_payment_token',
        reason: 'Retrieve active payment token for recurring billing',
        source: 'MidtransTokenManager.getActiveToken',
        metadata: {
          gateway_name: 'midtrans'
        }
      }

      const tokens = await SecureServiceRoleHelpers.secureSelect(
        operationContext,
        'indb_payment_saved_tokens',
        ['*'],
        {
          user_id: userId,
          is_active: true,
          gateway_name: 'midtrans'
        }
      )

      if (!tokens || tokens.length === 0) {
        return null
      }

      // Get the most recent token
      const token = tokens.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]

      // Check if token is expired
      if (token.expired_at && new Date(token.expired_at) <= new Date()) {
        // Mark token as expired
        await this.deactivateToken(token.id)
        return null
      }

      return {
        saved_token_id: token.saved_token_id,
        expired_at: token.expired_at,
        masked_card: token.masked_card,
        card_type: token.card_type,
        user_id: token.user_id,
        transaction_id: token.transaction_id
      }

    } catch (error) {
      console.error('Error getting active token:', error)
      return null
    }
  }

  /**
   * Get all tokens for user using secure service role
   */
  async getUserTokens(userId: string): Promise<TokenData[]> {
    try {
      // Create secure operation context
      const operationContext = {
        userId: userId,
        operation: 'get_user_payment_tokens',
        reason: 'Retrieve all payment tokens for user management',
        source: 'MidtransTokenManager.getUserTokens',
        metadata: {
          gateway_name: 'midtrans'
        }
      }

      const tokens = await SecureServiceRoleHelpers.secureSelect(
        operationContext,
        'indb_payment_saved_tokens',
        ['*'],
        {
          user_id: userId,
          gateway_name: 'midtrans'
        }
      )

      if (!tokens) {
        return []
      }

      // Sort by created_at descending and map to TokenData interface
      return tokens
        .sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .map((token: any) => ({
          saved_token_id: token.saved_token_id,
          expired_at: token.expired_at,
          masked_card: token.masked_card,
          card_type: token.card_type,
          user_id: token.user_id,
          transaction_id: token.transaction_id
        }))

    } catch (error) {
      console.error('Error getting user tokens:', error)
      return []
    }
  }

  /**
   * Deactivate token using secure service role
   */
  async deactivateToken(tokenId: string): Promise<boolean> {
    try {
      // Note: This is a system operation, but we should still validate ownership
      // For now, using 'system' as userId but in production this should be enhanced
      const operationContext = {
        userId: 'system',
        operation: 'deactivate_payment_token',
        reason: 'Deactivate expired or invalid payment token',
        source: 'MidtransTokenManager.deactivateToken',
        metadata: {
          tokenId: tokenId
        }
      }

      const updateResult = await SecureServiceRoleHelpers.secureUpdate(
        operationContext,
        'indb_payment_saved_tokens',
        {
          is_active: false,
          updated_at: new Date().toISOString()
        },
        { id: tokenId }
      )

      return updateResult.length > 0

    } catch (error) {
      console.error('Error deactivating token:', error)
      return false
    }
  }

  /**
   * Deactivate all tokens for user using secure service role
   */
  async deactivateUserTokens(userId: string): Promise<boolean> {
    try {
      // Create secure operation context
      const operationContext = {
        userId: userId,
        operation: 'deactivate_all_user_tokens',
        reason: 'Deactivate all payment tokens for user (account closure, security)',
        source: 'MidtransTokenManager.deactivateUserTokens',
        metadata: {
          gateway_name: 'midtrans'
        }
      }

      const updateResult = await SecureServiceRoleHelpers.secureUpdate(
        operationContext,
        'indb_payment_saved_tokens',
        {
          is_active: false,
          updated_at: new Date().toISOString()
        },
        {
          user_id: userId,
          gateway_name: 'midtrans'
        }
      )

      return updateResult.length > 0

    } catch (error) {
      console.error('Error deactivating user tokens:', error)
      return false
    }
  }

  /**
   * Clean up expired tokens using secure service role
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      // This is a system maintenance operation
      const operationContext = {
        userId: 'system',
        operation: 'cleanup_expired_tokens',
        reason: 'System maintenance - deactivate expired payment tokens',
        source: 'MidtransTokenManager.cleanupExpiredTokens',
        metadata: {
          gateway_name: 'midtrans',
          expiry_threshold: new Date().toISOString()
        }
      }

      // First find expired tokens
      const expiredTokens = await SecureServiceRoleHelpers.secureSelect(
        operationContext,
        'indb_payment_saved_tokens',
        ['id'],
        {
          gateway_name: 'midtrans',
          is_active: true
        }
      )

      // Filter by expiry date (since we can't use 'lt' in the where conditions)
      const currentTime = new Date().toISOString()
      const actuallyExpired = expiredTokens.filter((token: any) => 
        token.expired_at && token.expired_at < currentTime
      )

      if (actuallyExpired.length === 0) {
        return 0
      }

      // Update expired tokens to inactive
      const updateResult = await SecureServiceRoleHelpers.secureUpdate(
        operationContext,
        'indb_payment_saved_tokens',
        { is_active: false },
        {
          gateway_name: 'midtrans'
        }
      )

      return actuallyExpired.length

    } catch (error) {
      console.error('Error cleaning up expired tokens:', error)
      return 0
    }
  }
}