import * as fs from 'fs'
import * as path from 'path'
import * as nodemailer from 'nodemailer'

interface ContactFormData {
  name: string
  email: string
  type: string
  subject: string
  orderId: string
  message: string
  ipAddress: string
  userAgent: string
  submittedAt: string
}

export class ContactEmailService {
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
      console.log('🔧 Initializing Contact Email SMTP transporter...')
      
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('⚠️ SMTP configuration incomplete, contact email service disabled')
        return
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      })

      await this.transporter.verify()
      console.log('✅ Contact Email SMTP transporter initialized successfully')
      this.isInitialized = true
      
    } catch (error) {
      console.error('❌ Failed to initialize Contact Email SMTP transporter:', error)
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
      const template = fs.readFileSync(templatePath, 'utf8')
      return template
    } catch (error) {
      console.error(`❌ Failed to load email template: ${templateName}`, error)
      
      // Fallback inline template for contact form
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Contact Form Submission</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: var(--brand-primary);">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: var(--brand-primary); border-bottom: 2px solid var(--brand-accent); padding-bottom: 10px;">
              New Contact Form Submission
            </h2>
            
            <div style="background: var(--secondary); padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Name:</strong> {{name}}</p>
              <p><strong>Email:</strong> {{email}}</p>
              <p><strong>Type:</strong> {{type}}</p>
              <p><strong>Subject:</strong> {{subject}}</p>
              {{#if orderId}}<p><strong>Order ID:</strong> {{orderId}}</p>{{/if}}
            </div>
            
            <div style="margin: 20px 0;">
              <h3 style="color: var(--brand-primary);">Message:</h3>
              <div style="background: white; border: 1px solid hsl(var(--border)); padding: 15px; border-radius: 5px; white-space: pre-wrap;">{{message}}</div>
            </div>
            
            <div style="margin: 20px 0; padding: 15px; background: var(--secondary); border-radius: 5px; font-size: 12px; color: var(--brand-text);">
              <p><strong>Submission Details:</strong></p>
              <p>IP Address: {{ipAddress}}</p>
              <p>User Agent: {{userAgent}}</p>
              <p>Submitted At: {{submittedAt}}</p>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    try {
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

      return rendered
    } catch (error) {
      console.error('❌ Failed to render contact email template:', error)
      throw error
    }
  }

  async sendContactFormSubmission(data: ContactFormData): Promise<void> {
    try {
      console.log(`📤 Preparing to send contact form submission email`)
      console.log('📊 Contact form data:', {
        name: data.name,
        email: data.email,
        type: data.type,
        subject: data.subject,
        hasOrderId: Boolean(data.orderId)
      })

      await this.ensureInitialized()
      
      if (!this.transporter) {
        throw new Error('Contact Email SMTP transporter not available')
      }

      // Load and render template
      const templateHtml = this.loadTemplate('contact-form')
      const renderedHtml = this.renderTemplate(templateHtml, data)

      // Get admin email from environment or fallback to site contact email
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER

      const mailOptions = {
        from: `${process.env.SMTP_FROM_NAME || 'IndexNow Studio'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
        to: adminEmail,
        replyTo: data.email, // Allow direct reply to the customer
        subject: `[${data.type}] ${data.subject} - Contact Form`,
        html: renderedHtml
      }

      console.log('📬 Sending contact form email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        replyTo: mailOptions.replyTo,
        subject: mailOptions.subject,
        htmlLength: renderedHtml.length
      })

      const result = await this.transporter.sendMail(mailOptions)
      
      console.log('✅ Contact form submission email sent successfully!')
      console.log('📨 Email result:', {
        messageId: result.messageId,
        response: result.response
      })

    } catch (error) {
      console.error('❌ Failed to send contact form submission email:', error)
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error name:', error.name)
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      
      throw error
    }
  }

  async testConfiguration(): Promise<boolean> {
    try {
      await this.ensureInitialized()

      if (!this.transporter) {
        return false
      }

      await this.transporter.verify()
      console.log('✅ Contact Email SMTP connection test successful')
      return true
    } catch (error) {
      console.error('❌ Contact Email SMTP connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const contactEmailService = new ContactEmailService()