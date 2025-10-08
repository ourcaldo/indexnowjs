/**
 * Midtrans Client Service
 * Frontend service for handling Midtrans SDK interactions
 * Manages SDK loading, tokenization, and Snap popup display
 */

import { BILLING_ENDPOINTS } from '@/lib/core/constants/ApiEndpoints'


// Use existing Window interface declarations from the project

export interface SnapCallbacks {
  onSuccess?: (result: any) => void
  onPending?: (result: any) => void
  onError?: (result: any) => void
  onClose?: () => void
}

export interface CardTokenData {
  card_number: string
  card_exp_month: string
  card_exp_year: string
  card_cvv: string
}

export class MidtransClientService {
  /**
   * Load Midtrans Snap.js SDK for popup payments
   */
  static async loadSnapSDK(clientKey: string, environment: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector('#snap-script') && window.snap) {
        resolve()
        return
      }

      // Remove existing script if present but not working
      const existingScript = document.querySelector('#snap-script')
      if (existingScript) {
        existingScript.remove()
      }

      const script = document.createElement('script')
      script.src = environment === 'production' 
        ? 'https://app.midtrans.com/snap/snap.js'
        : 'https://app.sandbox.midtrans.com/snap/snap.js'
      script.setAttribute('data-client-key', clientKey)
      script.setAttribute('id', 'snap-script')
      script.async = true
      
      script.onload = () => {
        resolve()
      }
      
      script.onerror = () => {
        reject(new Error('Failed to load Midtrans Snap SDK'))
      }
      
      document.head.appendChild(script)
    })
  }

  /**
   * Load Midtrans 3DS SDK for credit card tokenization
   * CRITICAL: Must be loaded with proper data-client-key and data-environment for tokenization to work
   * Fixed to match original working implementation exactly
   */
  static async load3DSSDK(clientKey: string, environment: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script already exists and remove it to ensure clean reload
      const existingScript = document.querySelector('script[src*="midtrans-new-3ds"]') || document.querySelector('#midtrans-script')
      if (existingScript) {
        existingScript.remove()
        // Clean up the global object safely
        try {
          (window as any).MidtransNew3ds = undefined
        } catch (e) {
          // Ignore if property cannot be deleted
        }
      }
      const script = document.createElement('script')
      script.src = 'https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js'
      script.async = true  // Use async like the original implementation
      script.setAttribute('data-environment', environment || 'sandbox')  // Default to sandbox like original
      script.setAttribute('data-client-key', clientKey)
      script.setAttribute('id', 'midtrans-script')  // Use same ID as original

      script.onload = () => {
        // Wait a bit for the SDK to initialize, then verify it's working
        setTimeout(() => {
          if (window.MidtransNew3ds && typeof window.MidtransNew3ds.getCardToken === 'function') {
            resolve()
          } else {
            reject(new Error('Midtrans SDK not properly initialized'))
          }
        }, 100)
      }

      script.onerror = (error) => {
        reject(new Error('Failed to load Midtrans 3DS SDK'))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * Display Snap payment popup
   */
  static async showSnapPayment(token: string, callbacks: SnapCallbacks): Promise<void> {
    if (!window.snap || typeof window.snap.pay !== 'function') {
      throw new Error('Midtrans Snap SDK not loaded')
    }

    try {
      window.snap.pay(token, callbacks)
    } catch (error) {
      throw new Error('Failed to display Snap payment popup')
    }
  }

  /**
   * Get credit card token using 3DS SDK
   * Uses JSONP callback mechanism - response comes through global callback override
   * Implementation matches the original working version exactly
   */
  static async getCreditCardToken(cardData: CardTokenData): Promise<string> {
    return new Promise((resolve, reject) => {
      let isResolved = false

      // Add timeout to prevent hanging - same as original (15 seconds)
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          reject(new Error('Card tokenization timeout. Please try again.'))
        }
      }, 15000)

      if (!window.MidtransNew3ds) {
        clearTimeout(timeout)
        reject(new Error('Payment system not ready. Please refresh the page.'))
        return
      }

      // Check if getCardToken function is available

      // Wait for Midtrans SDK to be ready with timeout - exactly like original
      let retryCount = 0
      const maxRetries = 20

      const waitForSDK = () => {
        if (!window.MidtransNew3ds || typeof window.MidtransNew3ds.getCardToken !== 'function') {
          if (retryCount >= maxRetries) {
            clearTimeout(timeout)
            if (!isResolved) {
              isResolved = true
              reject(new Error('Midtrans payment system is not available. Please refresh the page and try again.'))
            }
            return
          }
          retryCount++
          setTimeout(waitForSDK, 300)
          return
        }

        // SDK is ready, proceed with tokenization
        
        // Store original callback and override it temporarily - exactly like original
        const originalCallback = (window as any).MidtransNew3ds.callback

        ;(window as any).MidtransNew3ds.callback = function(response: any) {
          if (!isResolved) {
            isResolved = true
            clearTimeout(timeout)

            // Restore original callback
            ;(window as any).MidtransNew3ds.callback = originalCallback

            if (response && response.status_code === '200' && response.token_id) {
              resolve(response.token_id)
            } else {
              reject(new Error(response?.status_message || 'Card tokenization failed'))
            }
          }
        }

        try {
          // Format card data exactly like the original implementation
          const formattedCardData = {
            card_number: cardData.card_number.replace(/\s/g, ''),
            card_exp_month: cardData.card_exp_month.padStart(2, '0'),
            card_exp_year: cardData.card_exp_year,
            card_cvv: cardData.card_cvv,
          }

          // Calling Midtrans getCardToken

          // Call getCardToken exactly like the original - with empty callback function
          window.MidtransNew3ds.getCardToken(formattedCardData, function() {
            // This callback is required by the API but the actual response comes via global callback
          })

        } catch (error) {
          clearTimeout(timeout)
          if (!isResolved) {
            isResolved = true
            // Restore original callback on error
            ;(window as any).MidtransNew3ds.callback = originalCallback
            reject(new Error('Payment processing failed. Please try again.'))
          }
        }
      }

      // Start waiting for SDK
      waitForSDK()
    })
  }

  /**
   * Handle 3DS authentication
   */
  static async handle3DSAuthentication(redirectUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.MidtransNew3ds || typeof window.MidtransNew3ds.authenticate !== 'function') {
        reject(new Error('Midtrans 3DS SDK not loaded'))
        return
      }

      try {
        window.MidtransNew3ds.authenticate(redirectUrl, {
          performAuthentication: (redirect_url: string) => {
            // Open 3DS authentication in popup/iframe
            const popup = window.open(redirect_url, '3ds_popup', 'width=500,height=600')
            
            const checkClosed = setInterval(() => {
              if (popup?.closed) {
                clearInterval(checkClosed)
                resolve()
              }
            }, 1000)
          },
          onSuccess: (response: any) => {
            resolve()
          },
          onPending: (response: any) => {
            // Handle pending state if needed
          },
          onFailure: (response: any) => {
            reject(new Error('3DS authentication failed'))
          }
        })
      } catch (error) {
        reject(new Error('Failed to handle 3DS authentication'))
      }
    })
  }

  /**
   * Get Midtrans configuration from backend
   */
  static async getMidtransConfig(token: string): Promise<{ client_key: string, environment: string }> {
    try {
      const response = await fetch(BILLING_ENDPOINTS.MIDTRANS_CONFIG, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to get Midtrans config: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get Midtrans configuration')
      }

      return data.data
    } catch (error) {
      throw error
    }
  }
}