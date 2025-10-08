import { NextRequest } from 'next/server'
import { adminApiWrapper, createStandardError } from '@/lib/core/api-response-middleware'
import { formatSuccess } from '@/lib/core/api-response-formatter'
import { ActivityLogger, ActivityEventTypes } from '@/lib/monitoring'
import * as nodemailer from 'nodemailer'
import { logger, ErrorType, ErrorSeverity } from '@/lib/monitoring/error-handling'

export const POST = adminApiWrapper(async (request: NextRequest, adminUser) => {
  const body = await request.json()
  const {
    smtp_host,
    smtp_port,
    smtp_user,
    smtp_pass,
    smtp_from_name,
    smtp_from_email,
    smtp_secure
  } = body

  // Validate required fields
  if (!smtp_host || !smtp_user || !smtp_pass || !smtp_from_email) {
    return await createStandardError(
      ErrorType.VALIDATION,
      'All SMTP fields are required for testing',
      400,
      ErrorSeverity.LOW
    )
  }

  // Create transporter with provided settings
  const transporter = nodemailer.createTransport({
    host: smtp_host,
    port: parseInt(smtp_port) || 465,
    secure: smtp_secure !== false,
    auth: {
      user: smtp_user,
      pass: smtp_pass
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  // Test the connection
  try {
    await transporter.verify()
  } catch (verifyError) {
    logger.error({ error: verifyError instanceof Error ? verifyError.message : String(verifyError) }, 'SMTP verification failed:')
    return await createStandardError(
      ErrorType.EXTERNAL_API,
      `SMTP connection failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`,
      400,
      ErrorSeverity.MEDIUM
    )
  }

  const EMAIL_COLOR_MAPPING = {
    brandPrimary: { css: 'var(--brand-primary)', value: '#1A1A1A' },
    brandAccent: { css: 'var(--brand-accent)', value: '#3D8BFF' },
    brandText: { css: 'var(--brand-text)', value: '#6C757D' },
    secondary: { css: 'var(--light-gray)', value: '#F7F9FC' },
    background: { css: 'var(--pure-white)', value: '#FFFFFF' },
    border: { css: 'var(--cool-gray)', value: '#E0E6ED' },
    lightBlueBg: { css: 'var(--light-blue-bg)', value: '#F0F9FF' }
  }
  
  const emailColors = Object.fromEntries(
    Object.entries(EMAIL_COLOR_MAPPING).map(([key, config]) => [key, config.value])
  )

  // Send test email
  const testEmailOptions = {
    from: `${smtp_from_name || 'IndexNow Studio'} <${smtp_from_email}>`,
    to: adminUser?.email || smtp_from_email,
    subject: 'IndexNow Studio - SMTP Test Email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SMTP Test Email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${emailColors.brandPrimary}; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${emailColors.secondary}; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: ${emailColors.brandAccent}; margin: 0 0 10px 0; font-size: 24px;">✅ SMTP Test Successful</h1>
          <p style="margin: 0; color: ${emailColors.brandText};">Your email configuration is working correctly!</p>
        </div>
        
        <div style="background: ${emailColors.background}; border: 1px solid ${emailColors.border}; border-radius: 8px; padding: 20px;">
          <h2 style="color: ${emailColors.brandPrimary}; margin: 0 0 15px 0; font-size: 18px;">Configuration Details</h2>
          <ul style="margin: 0; padding-left: 20px; color: ${emailColors.brandText};">
            <li><strong>SMTP Host:</strong> ${smtp_host}</li>
            <li><strong>SMTP Port:</strong> ${smtp_port}</li>
            <li><strong>Username:</strong> ${smtp_user}</li>
            <li><strong>Security:</strong> ${smtp_secure ? 'TLS/SSL Enabled' : 'No encryption'}</li>
            <li><strong>From Address:</strong> ${smtp_from_email}</li>
          </ul>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: ${emailColors.lightBlueBg}; border-radius: 8px; border-left: 4px solid ${emailColors.brandAccent};">
          <p style="margin: 0; color: ${emailColors.brandPrimary}; font-size: 14px;">
            <strong>Test completed at:</strong> ${new Date().toLocaleString()}<br>
            <strong>Tested by:</strong> ${adminUser?.email || 'Admin'}
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: ${emailColors.brandText}; font-size: 12px;">
          <p>IndexNow Studio - Professional URL Indexing Platform</p>
        </div>
      </body>
      </html>
    `
  }

  try {
    await transporter.sendMail(testEmailOptions)
  } catch (sendError) {
    logger.error({ error: sendError instanceof Error ? sendError.message : String(sendError) }, 'Failed to send test email:')
    return await createStandardError(
      ErrorType.EXTERNAL_API,
      `Failed to send test email: ${sendError instanceof Error ? sendError.message : 'Unknown error'}`,
      400,
      ErrorSeverity.MEDIUM
    )
  }

  // Log email test activity
  if (adminUser?.id) {
    try {
      await ActivityLogger.logAdminSettingsActivity(
        adminUser.id,
        ActivityEventTypes.SETTINGS_VIEW,
        'Tested SMTP email configuration',
        request,
        {
          section: 'site_settings',
          action: 'test_smtp',
          adminEmail: adminUser.email,
          smtpHost: smtp_host,
          testRecipient: adminUser.email
        }
      )
    } catch (logError) {
      logger.error({ error: logError instanceof Error ? logError.message : String(logError) }, 'Failed to log email test activity:')
    }
  }

  return formatSuccess({
    message: `Test email sent successfully to ${adminUser?.email || smtp_from_email}`
  }, undefined, 200)
})
