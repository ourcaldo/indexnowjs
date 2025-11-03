/**
 * Paddle Subscription Service
 * Handles subscription lifecycle management
 */

import { PaddleService } from './PaddleService'
import { supabaseAdmin } from '@/lib/database'

export class PaddleSubscriptionService {
  /**
   * Get subscription details from Paddle
   */
  static async getSubscription(subscriptionId: string) {
    const paddle = await PaddleService.getInstance()
    const subscription = await paddle.subscriptions.get(subscriptionId)
    return subscription
  }

  /**
   * Cancel subscription
   * @param subscriptionId - Paddle subscription ID
   * @param effectiveFrom - When to cancel ('immediately' or 'next_billing_period')
   */
  static async cancelSubscription(
    subscriptionId: string,
    effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period'
  ) {
    const paddle = await PaddleService.getInstance()

    const subscription = await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom,
    })

    // Update local subscription record
    const { error } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .update({
        status: effectiveFrom === 'immediately' ? 'canceled' : 'active',
        cancel_at_period_end: effectiveFrom === 'next_billing_period',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (error) {
      console.error('Failed to sync subscription cancellation to database:', error)
      throw new Error(`Database sync failed after Paddle cancellation: ${error.message}`)
    }

    return subscription
  }

  /**
   * Pause subscription
   */
  static async pauseSubscription(
    subscriptionId: string,
    options?: { effectiveFrom?: 'next_billing_period' | 'immediately' }
  ) {
    const paddle = await PaddleService.getInstance()

    const subscription = await paddle.subscriptions.pause(
      subscriptionId,
      options || {}
    )

    // Update local subscription record
    const { error } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (error) {
      console.error('Failed to sync subscription pause to database:', error)
      throw new Error(`Database sync failed after Paddle pause: ${error.message}`)
    }

    return subscription
  }

  /**
   * Resume paused subscription
   */
  static async resumeSubscription(
    subscriptionId: string,
    effectiveFrom: 'next_billing_period' | 'immediately' = 'immediately'
  ) {
    const paddle = await PaddleService.getInstance()

    const subscription = await paddle.subscriptions.resume(
      subscriptionId,
      { effectiveFrom }
    )

    // Update local subscription record
    const { error } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .update({
        status: 'active',
        paused_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (error) {
      console.error('Failed to sync subscription resume to database:', error)
      throw new Error(`Database sync failed after Paddle resume: ${error.message}`)
    }

    return subscription
  }

  /**
   * Update subscription (e.g., change plan)
   */
  static async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ) {
    const paddle = await PaddleService.getInstance()

    const subscription = await paddle.subscriptions.update(subscriptionId, {
      items: [
        {
          priceId: newPriceId,
          quantity: 1,
        },
      ],
    })

    // Update local subscription record
    const { error } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .update({
        paddle_price_id: newPriceId,
        updated_at: new Date().toISOString(),
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (error) {
      console.error('Failed to sync subscription update to database:', error)
      throw new Error(`Database sync failed after Paddle update: ${error.message}`)
    }

    return subscription
  }

  /**
   * Get subscription from database by user ID
   */
  static async getSubscriptionByUserId(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('indb_payment_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error) {
      throw new Error(`Failed to get subscription for user: ${error.message}`)
    }

    return data
  }
}
