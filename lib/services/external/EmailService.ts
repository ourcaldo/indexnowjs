/**
 * Email Service for IndexNow Studio
 * Centralized email service for notifications and communications
 */

import nodemailer from 'nodemailer';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { EMAIL_TEMPLATES, EmailTemplate } from '@/lib/core/constants/AppConstants';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  template?: EmailTemplate;
  templateData?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipients: string[];
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;
  private isInitialized = false;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Initialize email service with SMTP configuration
   */
  async initialize(): Promise<boolean> {
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection
      if (this.transporter) {
        await this.transporter.verify();
      }
      this.isInitialized = true;
      
      console.log('✅ SMTP transporter initialized and verified successfully');
      return true;
    } catch (error) {
      console.error('❌ SMTP initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Send email using template or custom content
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.isInitialized || !this.transporter) {
      return {
        success: false,
        error: 'Email service not initialized',
        recipients: [],
      };
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const recipientEmails = recipients.map(r => r.email);

      let htmlContent = options.htmlContent;
      let textContent = options.textContent;

      // Load template if specified
      if (options.template) {
        const templateResult = await this.loadTemplate(options.template, options.templateData);
        htmlContent = templateResult.html;
        textContent = templateResult.text;
      }

      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', '),
        subject: options.subject,
        html: htmlContent,
        text: textContent,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
        replyTo: options.replyTo,
        cc: options.cc?.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', '),
        bcc: options.bcc?.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', '),
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        recipients: recipientEmails,
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recipients: [],
      };
    }
  }

  /**
   * Load email template and replace placeholders
   */
  private async loadTemplate(
    template: EmailTemplate,
    data: Record<string, any> = {}
  ): Promise<{ html: string; text: string }> {
    try {
      const templatePath = join(process.cwd(), 'lib', 'email', 'templates', `${template}.html`);
      let htmlContent = await readFile(templatePath, 'utf-8');

      // Replace placeholders in template
      Object.entries(data).forEach(([key, value]) => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        htmlContent = htmlContent.replace(placeholder, String(value));
      });

      // Generate text version by stripping HTML tags
      const textContent = htmlContent
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      return { html: htmlContent, text: textContent };
    } catch (error) {
      console.error(`Failed to load template ${template}:`, error);
      return { html: '', text: '' };
    }
  }

  /**
   * Send job completion notification
   */
  async sendJobCompletionEmail(
    recipient: EmailRecipient,
    jobData: {
      jobName: string;
      totalUrls: number;
      successfulUrls: number;
      failedUrls: number;
      duration: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: recipient,
      subject: `Job Completed: ${jobData.jobName}`,
      template: EMAIL_TEMPLATES.JOB_COMPLETION,
      templateData: jobData,
    });
  }

  /**
   * Send job failure notification
   */
  async sendJobFailureEmail(
    recipient: EmailRecipient,
    jobData: {
      jobName: string;
      errorMessage: string;
      failedAt: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: recipient,
      subject: `Job Failed: ${jobData.jobName}`,
      template: EMAIL_TEMPLATES.JOB_FAILURE,
      templateData: jobData,
    });
  }

  /**
   * Send quota alert notification
   */
  async sendQuotaAlertEmail(
    recipient: EmailRecipient,
    quotaData: {
      serviceAccountName: string;
      currentUsage: number;
      quotaLimit: number;
      percentageUsed: number;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: recipient,
      subject: 'Quota Alert: Service Account Limit Reached',
      template: EMAIL_TEMPLATES.QUOTA_ALERT,
      templateData: quotaData,
    });
  }

  /**
   * Send daily report email
   */
  async sendDailyReportEmail(
    recipient: EmailRecipient,
    reportData: {
      date: string;
      totalJobs: number;
      successfulJobs: number;
      failedJobs: number;
      totalUrls: number;
      quotaUsage: number;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: recipient,
      subject: `Daily Report - ${reportData.date}`,
      template: EMAIL_TEMPLATES.DAILY_REPORT,
      templateData: reportData,
    });
  }


  /**
   * Send payment received confirmation
   */
  async sendPaymentReceivedEmail(
    recipient: EmailRecipient,
    paymentData: {
      orderId: string;
      packageName: string;
      amount: string;
      currency: string;
      paymentMethod: string;
      activationDate: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: recipient,
      subject: `Payment Received - Order ${paymentData.orderId}`,
      template: EMAIL_TEMPLATES.PAYMENT_RECEIVED,
      templateData: paymentData,
    });
  }

  /**
   * Send login notification
   */
  async sendLoginNotificationEmail(
    recipient: EmailRecipient,
    loginData: {
      timestamp: string;
      ipAddress: string;
      userAgent: string;
      location: string;
    }
  ): Promise<EmailResult> {
    return this.sendEmail({
      to: recipient,
      subject: 'New Login to Your Account',
      template: EMAIL_TEMPLATES.LOGIN_NOTIFICATION,
      templateData: loginData,
    });
  }

  /**
   * Test email configuration
   */
  async testConfiguration(testEmail: string): Promise<EmailResult> {
    return this.sendEmail({
      to: { email: testEmail },
      subject: 'Test Email - IndexNow Studio',
      htmlContent: `
        <h2>Test Email</h2>
        <p>This is a test email to verify your SMTP configuration.</p>
        <p>If you received this email, your configuration is working correctly!</p>
        <hr>
        <p><small>Sent from IndexNow Studio at ${new Date().toISOString()}</small></p>
      `,
      textContent: 'Test email from IndexNow Studio. Your SMTP configuration is working correctly!',
    });
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    config: Omit<EmailConfig, 'pass'>;
  } {
    return {
      initialized: this.isInitialized,
      config: {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        user: this.config.user,
        fromName: this.config.fromName,
        fromEmail: this.config.fromEmail,
      },
    };
  }

  /**
   * Close email service
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.isInitialized = false;
    }
  }
}

// Factory function to create email service from environment
export const createEmailServiceFromEnv = (): EmailService => {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'IndexNow Studio',
    fromEmail: process.env.SMTP_FROM_EMAIL || '',
  };

  return new EmailService(config);
};

export default EmailService;