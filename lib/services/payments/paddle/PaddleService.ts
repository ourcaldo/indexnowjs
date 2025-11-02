/**
 * Paddle Service - Core SDK Wrapper
 * Provides singleton instance of Paddle SDK and gateway configuration management
 */

import { Paddle, Environment } from '@paddle/paddle-node-sdk'
import { supabaseAdmin } from '@/lib/database'

export class PaddleService {
  private static instance: Paddle | null = null

  /**
   * Get singleton instance of Paddle SDK
   * Initializes with API key from DATABASE (not environment variables)
   */
  static async getInstance(): Promise<Paddle> {
    if (this.instance) {
      return this.instance
    }

    // Get gateway configuration from database
    const gateway = await this.getGatewayConfig()

    if (!gateway) {
      throw new Error('Paddle gateway is not configured or inactive')
    }

    // CRITICAL: Get API key from DATABASE (not environment variables)
    const apiCredentials = gateway.api_credentials || {}
    const apiKey = apiCredentials.api_key

    if (!apiKey) {
      throw new Error('PADDLE API key not found in database. Please update indb_payment_gateways.api_credentials with actual API key.')
    }

    // Initialize Paddle SDK
    const envString = gateway.configuration?.environment || 'sandbox'
    const environment: Environment = envString === 'production' ? Environment.production : Environment.sandbox
    
    this.instance = new Paddle(apiKey, {
      environment,
    })

    return this.instance
  }

  /**
   * Get Paddle gateway configuration from database
   */
  static async getGatewayConfig() {
    const { data, error } = await supabaseAdmin
      .from('indb_payment_gateways')
      .select('*')
      .eq('slug', 'paddle')
      .eq('is_active', true)
      .single()

    if (error) {
      throw new Error(`Failed to load Paddle gateway configuration: ${error.message}`)
    }

    return data
  }

  /**
   * Reset instance (useful for testing)
   */
  static resetInstance(): void {
    this.instance = null
  }

  /**
   * Check if Paddle is configured and active
   * Verifies that API key is stored in database
   */
  static async isConfigured(): Promise<boolean> {
    try {
      const gateway = await this.getGatewayConfig()
      const apiCredentials = gateway?.api_credentials || {}
      const hasApiKey = !!apiCredentials.api_key
      return !!gateway && hasApiKey
    } catch (error) {
      return false
    }
  }
}
