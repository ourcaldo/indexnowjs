import * as fs from 'fs'
import * as path from 'path'
import * as nodemailer from 'nodemailer'

interface EmailTemplate {
  subject: string
  html: string
}

interface BillingConfirmationData {
  customerName: string
  orderId: string
  packageName: string
  billingPeriod: string
  amount: string
  paymentMethod: string
  bankName?: string
  accountName?: string
  accountNumber?: string
  orderDate: string
  expiryTime?: string
  vaNumber?: string
  vaBank?: string
  storeCode?: string
  storeName?: string
}

interface PaymentReceivedData {
  customerName: string
  orderId: string
  packageName: string
  billingPeriod: string
  amount: string
  paymentDate: string
}

interface PackageActivatedData {
  customerName: string
  packageName: string
  billingPeriod: string
  expiresAt: string
  activationDate: string
  dashboardUrl: string
}

interface OrderExpiredData {
  customerName: string
  orderId: string
  packageName: string
  billingPeriod: string
  amount: string
  status: string
  expiredDate: string
  subscribeUrl: string
}


export class EmailService {
  private transporter: nodemailer.Transporter | null = null
  private isInitialized: boolean = false

  constructor() {
    // Don't initialize during build time - use lazy initialization
  }

  private async initializeTransporter() {
    // Skip initialization during build process
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return
    }

    if (this.isInitialized) {
      return
    }

    try {
      console.log('🔧 Initializing SMTP transporter...')
      
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP configuration incomplete, email service disabled')
        return
      }

      console.log(`📧 SMTP Config: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || '465'}`)
      console.log(`👤 SMTP User: ${process.env.SMTP_USER}`)

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true, // true for 465, false for other ports like 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false // Accept self-signed certificates
        }
      })

      // Test the connection
      await this.transporter.verify()
      console.log('✅ SMTP transporter initialized and verified successfully')
      this.isInitialized = true
      
    } catch (error) {
      console.error('❌ Failed to initialize SMTP transporter:', error)
      this.transporter = null
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeTransporter()
    }
  }

  private loadTemplate(templateName: string): string {
    try {
      const templatePath = path.join(process.cwd(), 'lib', 'email', 'templates', `${templateName}.html`)
      console.log(`📄 Loading email template from: ${templatePath}`)
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`)
      }

      const template = fs.readFileSync(templatePath, 'utf-8')
      console.log(`✅ Template loaded successfully (${template.length} characters)`)
      return template
    } catch (error) {
      console.error(`❌ Failed to load template '${templateName}':`, error)
      throw error
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    try {
      console.log('🔄 Rendering email template with data:', Object.keys(data))
      
      let rendered = template
      
      // Replace simple variables {{variable}}
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g')
        rendered = rendered.replace(regex, String(value || ''))
      })

      // Handle conditional blocks {{#if variable}}...{{/if}}
      rendered = rendered.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
        return data[variable] ? content : ''
      })

      console.log('✅ Template rendered successfully')
      return rendered
    } catch (error) {
      console.error('❌ Failed to render template:', error)
      throw error
    }
  }


  async sendBillingConfirmation(email: string, data: BillingConfirmationData): Promise<void> {
    try {
      console.log(`📤 Preparing to send billing confirmation email to: ${email}`)
      console.log('📊 Email data:', {
        customerName: data.customerName,
        orderId: data.orderId,
        packageName: data.packageName,
        amount: data.amount
      })

      await this.ensureInitialized()
      
      if (!this.transporter) {
        throw new Error('SMTP transporter not available')
      }

      // Load and render template
      const templateHtml = this.loadTemplate('billing-confirmation')
      const renderedHtml = this.renderTemplate(templateHtml, data)

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'IndexNow Studio'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Order Confirmation - ${data.packageName} Subscription`,
        html: renderedHtml
      }

      console.log('📬 Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        htmlLength: renderedHtml.length
      })

      const result = await this.transporter.sendMail(mailOptions)
      
      console.log('✅ Billing confirmation email sent successfully!')
      console.log('📨 Email result:', {
        messageId: result.messageId,
        response: result.response
      })

    } catch (error) {
      console.error('❌ Failed to send billing confirmation email:', error)
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      
      throw error
    }
  }

  async sendPaymentReceived(email: string, data: PaymentReceivedData): Promise<void> {
    try {
      console.log(`📤 Preparing to send payment received email to: ${email}`)

      if (!this.transporter) {
        await this.initializeTransporter()
        if (!this.transporter) {
          throw new Error('SMTP transporter not available')
        }
      }

      const templateHtml = this.loadTemplate('payment-received')
      const renderedHtml = this.renderTemplate(templateHtml, data)

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'IndexNow Studio'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Payment Received - ${data.packageName} Subscription`,
        html: renderedHtml
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Payment received email sent successfully!')

    } catch (error) {
      console.error('❌ Failed to send payment received email:', error)
      throw error
    }
  }

  async sendPackageActivated(email: string, data: PackageActivatedData): Promise<void> {
    try {
      console.log(`📤 Preparing to send package activated email to: ${email}`)

      if (!this.transporter) {
        await this.initializeTransporter()
        if (!this.transporter) {
          throw new Error('SMTP transporter not available')
        }
      }

      const templateHtml = this.loadTemplate('package-activated')
      const renderedHtml = this.renderTemplate(templateHtml, data)

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'IndexNow Studio'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Package Activated - Welcome to ${data.packageName}!`,
        html: renderedHtml
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Package activated email sent successfully!')

    } catch (error) {
      console.error('❌ Failed to send package activated email:', error)
      throw error
    }
  }

  async sendOrderExpired(email: string, data: OrderExpiredData): Promise<void> {
    try {
      console.log(`📤 Preparing to send order expired email to: ${email}`)

      if (!this.transporter) {
        await this.initializeTransporter()
        if (!this.transporter) {
          throw new Error('SMTP transporter not available')
        }
      }

      const templateHtml = this.loadTemplate('order-expired')
      const renderedHtml = this.renderTemplate(templateHtml, data)

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'IndexNow Studio'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: email,
        subject: `Order Expired - ${data.packageName} Subscription`,
        html: renderedHtml
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('✅ Order expired email sent successfully!')

    } catch (error) {
      console.error('❌ Failed to send order expired email:', error)
      throw error
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized()

      if (!this.transporter) {
        return false
      }

      await this.transporter.verify()
      console.log('✅ SMTP connection test successful')
      return true
    } catch (error) {
      console.error('❌ SMTP connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()