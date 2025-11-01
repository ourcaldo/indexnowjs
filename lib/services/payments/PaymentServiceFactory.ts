/**
 * Payment Service Factory
 * Creates and configures payment service instances
 */

import { PaymentProcessor } from './core/PaymentProcessor'
import { supabaseAdmin } from '@/lib/database'
import { SecureServiceRoleWrapper } from '../security/SecureServiceRoleWrapper'
import { PaddleService } from './paddle'

export class PaymentServiceFactory {
  private static processor: PaymentProcessor | null = null

  /**
   * Get configured payment processor instance
   */
  static async getPaymentProcessor(): Promise<PaymentProcessor> {
    if (!this.processor) {
      this.processor = new PaymentProcessor()
      await this.initializeGateways(this.processor)
    }
    return this.processor
  }

  /**
   * Initialize and register payment gateways
   */
  private static async initializeGateways(processor: PaymentProcessor): Promise<void> {
    try {
      // Get active payment gateway configurations
      const gateways = await SecureServiceRoleWrapper.executeSecureOperation(
        {
          userId: 'system',
          operation: 'load_active_payment_gateways',
          reason: 'Loading active payment gateways for payment processor initialization',
          source: 'services/payments/PaymentServiceFactory',
          metadata: {
            operation_type: 'gateway_config_lookup'
          }
        },
        {
          table: 'indb_payment_gateways',
          operationType: 'select',
          columns: ['*'],
          whereConditions: { is_active: true }
        },
        async () => {
          const { data: gateways, error } = await supabaseAdmin
            .from('indb_payment_gateways')
            .select('*')
            .eq('is_active', true)

          if (error) {
            throw new Error(`Failed to load payment gateways: ${error.message}`)
          }

          return gateways || []
        }
      )

      // Register each gateway
      for (const gateway of gateways || []) {
        await this.registerGateway(processor, gateway)
      }

    } catch (error) {
      console.error('Error initializing payment gateways:', error)
    }
  }

  /**
   * Register individual gateway
   */
  private static async registerGateway(processor: PaymentProcessor, config: any): Promise<void> {
    try {
      const gatewaySlug = config.slug.toLowerCase()
      
      switch (gatewaySlug) {
        case 'paddle':
          await this.initializePaddleGateway()
          break
          
        default:
          console.warn(`Unknown payment gateway: ${config.slug}`)
      }
    } catch (error) {
      console.error(`Error registering ${config.slug} gateway:`, error)
    }
  }

  /**
   * Initialize Paddle gateway
   */
  private static async initializePaddleGateway(): Promise<void> {
    try {
      // Verify Paddle is configured
      const isConfigured = await PaddleService.isConfigured()
      
      if (!isConfigured) {
        throw new Error('Paddle gateway is not properly configured')
      }

      // Initialize Paddle SDK instance
      await PaddleService.getInstance()
      
      console.log('✅ Paddle payment gateway initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Paddle gateway:', error)
      throw error
    }
  }

  /**
   * Reset processor instance (useful for testing)
   */
  static resetProcessor(): void {
    this.processor = null
  }
}