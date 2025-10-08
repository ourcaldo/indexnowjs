/**
 * Email service type definitions for IndexNow Studio
 */

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

export interface EmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  template?: string;
  templateData?: Record<string, any>;
  htmlContent?: string;
  textContent?: string;
}