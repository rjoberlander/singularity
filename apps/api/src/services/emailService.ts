// Email service for sending return management emails
import nodemailer from 'nodemailer';
import { generateEmailTemplate } from '../modules/return-management/integrations/email';

interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
}

interface EmailData {
  to: string;
  subject: string;
  templateType: string;
  data: any;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;
  private failedEmails: (EmailData & { failedAt?: string; error?: string; retryCount?: number })[] = [];
  private retryInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeTransporter();
    this.startRetryQueue();
  }

  // Mask email for security in logs
  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return 'invalid-email';
    const [localPart, domain] = email.split('@');
    const masked = localPart.length > 3 
      ? localPart.substring(0, 3) + '***' 
      : '***';
    return `${masked}@${domain}`;
  }

  // Generate text version of email for better compatibility
  private generateTextVersion(templateType: string, data: any): string {
    switch (templateType) {
      case 'confirmation':
        return `Return Order Confirmation #${data.returnNumber}\n\n` +
               `We have received your return request.\n` +
               `Total Estimated Refund: $${data.estimatedRefund.toFixed(2)}\n\n` +
               `Please follow the instructions in this email to complete your return.`;
      case 'submitted':
        return `Return Submitted - ${data.returnNumber}\n\n` +
               `Your return has been submitted and approved.\n` +
               `Total Max Refund: $${data.totalAmount.toFixed(2)}\n\n` +
               `Please ship your items to our return center.`;
      case 'mailed':
        return `Return Shipped - ${data.returnNumber}\n\n` +
               `Thank you for shipping your return!\n` +
               `Tracking: ${data.trackingNumbers.join(', ')}\n\n` +
               `We'll inspect it once received.`;
      case 'received':
        return `Return Received - ${data.returnNumber}\n\n` +
               `We have received your return and are currently inspecting the items.`;
      case 'closed':
        return `Return ${data.outcome === 'refunded' ? 'Refunded' : 'Rejected'} - ${data.returnNumber}\n\n` +
               data.outcome === 'refunded' 
                 ? `Refund Amount: $${data.refundAmount?.toFixed(2)}\n` +
                   `Your refund will be processed within 7-10 business days.`
                 : `Reason: ${data.reason || 'Items did not meet return policy requirements'}`;
      case 'cancelled':
        return `Return Cancelled - ${data.returnNumber}\n\n` +
               `${data.reason || 'Your return request has been cancelled.'}\n\n` +
               `If you believe this was done in error, please contact customer service.`;
      case 'reminder':
        return `Return Reminder - ${data.returnNumber}\n\n` +
               `${data.message}\n\n` +
               `Please take action to avoid delays in processing your return.`;
      case 'escalation':
        return `Return Escalated - ${data.returnNumber}\n\n` +
               `${data.message}\n\n` +
               `Assigned to: ${data.assignedTo}\n` +
               `Reason: ${data.escalationReason}`;
      case 'abandoned':
        return `Return About to Expire - ${data.returnNumber}\n\n` +
               `${data.message}\n\n` +
               `Please complete your return soon to avoid expiration.`;
      case 'verification':
        return `Email Verification Required\n\n` +
               `Your verification code is: ${data.verificationCode}\n\n` +
               `Please enter this code in the return portal to access your order information.\n` +
               `This code will expire in 10 minutes for security.`;
      default:
        return `Return Update - ${data.returnNumber}`;
    }
  }

  // Email validation
  private validateEmail(email: string): boolean {
    // RFC 5322 compliant email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Additional checks
    if (!email || email.length > 254) return false;
    if (!emailRegex.test(email)) return false;
    
    // Check for common typos
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [localPart, domain] = parts;
    if (localPart.length > 64) return false;
    
    // Check for valid domain
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    if (domainParts.some(part => part.length === 0)) return false;
    
    return true;
  }

  private initializeTransporter() {
    // Check if email credentials are configured
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailFrom = process.env.EMAIL_FROM || '"CR Fence & Rail Returns" <returns@crfencerail.com>';
    
    if (!emailUser || !emailPass) {
      console.error('❌ Email service disabled: credentials not configured');
      this.transporter = null;
      return;
    }

    const emailConfig: EmailConfig = {
      smtp: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      },
      from: emailFrom
    };

    this.config = emailConfig;
    
    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: {
          user: this.config.smtp.auth.user,
          pass: this.config.smtp.auth.pass
        }
      });

      console.log('✅ Email service initialized with host:', this.config.smtp.host);
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error instanceof Error ? error.message : 'Unknown error');
      this.transporter = null;
    }
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    // Validate email address
    if (!this.validateEmail(emailData.to)) {
      console.error(`❌ Invalid email address: ${this.maskEmail(emailData.to)}`);
      return false;
    }

    if (!this.transporter || !this.config) {
      console.warn('⚠️ Email service not configured - email would be sent in production');
      console.log(`📧 [DEVELOPMENT MODE] Email preview:
        To: ${this.maskEmail(emailData.to)}
        Subject: ${emailData.subject}
        Template: ${emailData.templateType}
        Data: ${JSON.stringify(emailData.data, null, 2)}`);
      // Don't add to failed queue in development mode
      return true;
    }

    try {
      const htmlContent = generateEmailTemplate(emailData.templateType, emailData.data);
      
      const mailOptions = {
        from: this.config.from,
        to: emailData.to,
        subject: emailData.subject,
        html: htmlContent,
        // Add text version for better compatibility
        text: this.generateTextVersion(emailData.templateType, emailData.data)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${this.maskEmail(emailData.to)}: ${emailData.subject}`);
      // Only log message ID in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`   Message ID: ${result.messageId}`);
      }
      return true;
    } catch (error: any) {
      console.error(`❌ Email failed to ${this.maskEmail(emailData.to)}:`, error.message);
      // Add to failed queue with timestamp
      this.failedEmails.push({
        ...emailData,
        failedAt: new Date().toISOString(),
        error: error.message
      } as EmailData & { failedAt: string; error: string });
      return false;
    }
  }

  // Send email with retry logic
  async sendEmailWithRetry(emailData: EmailData, maxRetries: number = 3): Promise<boolean> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendEmail(emailData);
        if (result) return true;
        
        // If sendEmail returned false, don't retry (validation failed or service not configured)
        if (!this.transporter || !this.validateEmail(emailData.to)) {
          return false;
        }
      } catch (error: any) {
        lastError = error;
        console.log(`⚠️ Email attempt ${attempt}/${maxRetries} failed:`, error.message);
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    
    console.error('❌ Email failed after all retries:', lastError?.message);
    return false;
  }

  // Return status specific email methods
  async sendSubmittedEmail(to: string, returnNumber: string, items: any[], totalAmount: number, customerName?: string, shopifyOrderNumber?: string): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: `Return Submitted - ${returnNumber}`,
      templateType: 'submitted',
      data: {
        returnNumber,
        items,
        totalAmount,
        firstName: this.extractFirstName(customerName),
        shopifyOrderNumber
      }
    });
  }

  async sendMailedEmail(to: string, returnNumber: string, trackingNumbers: string[], customerName?: string, shopifyOrderNumber?: string): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: `Return Shipped - ${returnNumber}`,
      templateType: 'mailed',
      data: {
        returnNumber,
        trackingNumbers,
        firstName: this.extractFirstName(customerName),
        shopifyOrderNumber
      }
    });
  }

  async sendReceivedEmail(to: string, returnNumber: string, customerName?: string, shopifyOrderNumber?: string): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: `Return Received - ${returnNumber}`,
      templateType: 'received',
      data: {
        returnNumber,
        firstName: this.extractFirstName(customerName),
        shopifyOrderNumber
      }
    });
  }

  async sendClosedEmail(to: string, returnNumber: string, outcome: 'refunded' | 'rejected', refundAmount?: number, originalAmount?: number, internalNote?: string, reason?: string, customerName?: string, items?: any[], shopifyOrderNumber?: string): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: `Return ${outcome === 'refunded' ? 'Refunded' : 'Rejected'} - ${returnNumber}`,
      templateType: 'closed',
      data: {
        returnNumber,
        outcome,
        refundAmount,
        originalAmount,
        internalNote,
        reason,
        firstName: this.extractFirstName(customerName),
        items,
        shopifyOrderNumber
      }
    });
  }

  async sendCancelledEmail(to: string, returnNumber: string, reason?: string): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: `Return Cancelled - ${returnNumber}`,
      templateType: 'cancelled',
      data: {
        returnNumber,
        reason: reason || 'Your return request has been cancelled.'
      }
    });
  }

  // Reminder emails for incomplete returns
  async sendReminderEmail(to: string, returnNumber: string, status: string, daysSinceCreated: number): Promise<boolean> {
    const reminderMessages = {
      'submitted': `It's been ${daysSinceCreated} days since you submitted your return. Please ship your items to complete the return process.`,
      'mailed': `We're still waiting to receive your return package. If you've already shipped it, please ensure the tracking is accurate.`,
      'received': `Your return has been in our inspection queue for ${daysSinceCreated} days. We'll complete the inspection shortly.`
    };

    return this.sendEmailWithRetry({
      to,
      subject: `Return Reminder - ${returnNumber}`,
      templateType: 'reminder',
      data: {
        returnNumber,
        status,
        message: reminderMessages[status as keyof typeof reminderMessages] || `Your return requires attention.`,
        daysSinceCreated
      }
    });
  }

  // Escalation email for returns requiring management attention
  async sendEscalationEmail(to: string, returnNumber: string, escalationReason: string, assignedTo?: string): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: `Return Escalated - ${returnNumber}`,
      templateType: 'escalation',
      data: {
        returnNumber,
        escalationReason,
        assignedTo: assignedTo || 'Management Team',
        message: 'Your return has been escalated to our management team for special handling.'
      }
    });
  }

  // Abandoned return notification
  async sendAbandonedReturnEmail(to: string, returnNumber: string, daysSinceCreated: number): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: `Return About to Expire - ${returnNumber}`,
      templateType: 'abandoned',
      data: {
        returnNumber,
        daysSinceCreated,
        expiresIn: 365 - daysSinceCreated,
        message: `Your return has been inactive for ${daysSinceCreated} days. It will expire in ${365 - daysSinceCreated} days if no action is taken.`
      }
    });
  }

  // Retry failed emails
  private async retryFailedEmails(): Promise<void> {
    if (this.failedEmails.length === 0) return;
    
    console.log(`📨 Retrying ${this.failedEmails.length} failed emails...`);
    const currentQueue = [...this.failedEmails];
    this.failedEmails = [];
    
    for (const emailData of currentQueue) {
      const retryCount = (emailData.retryCount || 0) + 1;
      
      // Max 3 retry attempts
      if (retryCount > 3) {
        console.error(`❌ Email permanently failed after 3 retries: ${this.maskEmail(emailData.to)}`);
        continue;
      }
      
      // Wait before retrying based on retry count
      await new Promise(resolve => setTimeout(resolve, retryCount * 5000));
      
      const result = await this.sendEmail(emailData);
      if (!result) {
        // Add back to queue with increased retry count
        this.failedEmails.push({ ...emailData, retryCount });
      }
    }
  }

  // Start retry queue
  private startRetryQueue(): void {
    // Retry failed emails every 5 minutes
    this.retryInterval = setInterval(() => {
      this.retryFailedEmails().catch(error => {
        console.error('❌ Error in retry queue:', error);
      });
    }, 5 * 60 * 1000);
  }

  // Get failed email queue status
  getQueueStatus(): { total: number; emails: string[] } {
    return {
      total: this.failedEmails.length,
      emails: this.failedEmails.map(e => this.maskEmail(e.to))
    };
  }

  // Clear failed email queue
  clearFailedQueue(): void {
    const count = this.failedEmails.length;
    this.failedEmails = [];
    console.log(`🗑️ Cleared ${count} failed emails from queue`);
  }

  // Verify SMTP connection
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }
    
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error: any) {
      console.error('❌ SMTP connection failed:', error.message);
      return false;
    }
  }

  async sendConfirmationEmail(to: string, returnNumber: string, items: any[], estimatedRefund: number, customerName?: string, shopifyOrderNumber?: string): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: `Return Confirmation - ${returnNumber}`,
      templateType: 'confirmation',
      data: {
        returnNumber,
        items,
        estimatedRefund,
        instructions: 'Please follow the return instructions in this email.',
        firstName: this.extractFirstName(customerName),
        shopifyOrderNumber
      }
    });
  }

  // Helper function to extract first name from customer name
  private extractFirstName(customerName?: string): string {
    if (!customerName) return 'Customer';
    const firstName = customerName.trim().split(' ')[0];
    return firstName || 'Customer';
  }

  // Send verification code email
  async sendVerificationEmail(to: string, verificationCode: string, customerName?: string): Promise<boolean> {
    return this.sendEmailWithRetry({
      to,
      subject: 'Verify Your Email - Return Portal Access',
      templateType: 'verification',
      data: {
        verificationCode,
        email: to,
        firstName: this.extractFirstName(customerName)
      }
    });
  }

  // Send signup confirmation email
  async sendSignupConfirmation(confirmationData: {
    email: string;
    confirmationUrl: string;
  }): Promise<boolean> {
    const { email, confirmationUrl } = confirmationData;
    
    const subject = 'Welcome to SlackKB - Confirm Your Email';
    
    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Welcome to SlackKB</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
          .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .btn:hover { background-color: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #007bff;">Welcome to SlackKB!</h1>
          </div>
          <div class="content">
            <h2>Confirm your email address</h2>
            <p>Thanks for signing up for SlackKB!</p>
            <p>To complete your registration and access your account, please confirm your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" class="btn">Confirm Email</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${confirmationUrl}</p>
            
            <p>This link will expire in 24 hours for security reasons.</p>
            
            <p>If you did not create an account with SlackKB, please disregard this email.</p>
            
            <p>Welcome to the team!</p>
            <p>- The SlackKB Team</p>
          </div>
          <div class="footer">
            <p>This email was sent to ${email} because you signed up for SlackKB.</p>
            <p>If you didn't sign up, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create text version
    const textContent = `
Welcome to SlackKB!

Thanks for signing up for SlackKB!

To complete your registration and access your account, please confirm your email address by visiting:

${confirmationUrl}

This link will expire in 24 hours for security reasons.

If you did not create an account with SlackKB, please disregard this email.

Welcome to the team!
- The SlackKB Team

---
This email was sent to ${email} because you signed up for SlackKB.
If you didn't sign up, you can safely ignore this email.
    `;

    if (!this.transporter || !this.config) {
      console.warn('⚠️ Email service not configured - signup confirmation email would be sent in production');
      console.log(`📧 [DEVELOPMENT MODE] Signup confirmation email preview:
        To: ${this.maskEmail(email)}
        Subject: ${subject}
        URL: ${confirmationUrl}`);
      return true;
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Signup confirmation email sent to ${this.maskEmail(email)}: ${subject}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`   Message ID: ${result.messageId}`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to send signup confirmation email to ${this.maskEmail(email)}:`, error.message);
      return false;
    }
  }

  // Send user invitation email
  async sendInvitation(invitationData: {
    email: string;
    inviterName: string;
    workspaceName: string;
    invitationUrl: string;
    expiresAt?: Date;
  }): Promise<boolean> {
    const { email, inviterName, workspaceName, invitationUrl, expiresAt } = invitationData;
    
    const subject = `You're invited to join ${workspaceName} on SlackKB`;
    
    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>SlackKB Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
          .footer { background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #6c757d; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .btn:hover { background-color: #0056b3; }
          .expiration { color: #dc3545; font-size: 14px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #007bff;">SlackKB Invitation</h1>
          </div>
          <div class="content">
            <h2>You're invited to join ${workspaceName}!</h2>
            <p>Hi there!</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> on SlackKB.</p>
            <p>SlackKB is a knowledge management platform that helps teams organize, search, and share information effectively.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}" class="btn">Accept Invitation</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">${invitationUrl}</p>
            
            ${expiresAt ? `<p class="expiration"><strong>Note:</strong> This invitation expires on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.</p>` : ''}
            
            <p>If you have any questions or need help, please don't hesitate to contact us.</p>
            <p>Welcome aboard!</p>
          </div>
          <div class="footer">
            <p>This invitation was sent by ${inviterName} from ${workspaceName}.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create text version
    const textContent = `
You're invited to join ${workspaceName} on SlackKB!

Hi there!

${inviterName} has invited you to join ${workspaceName} on SlackKB.

SlackKB is a knowledge management platform that helps teams organize, search, and share information effectively.

To accept this invitation, please visit:
${invitationUrl}

${expiresAt ? `Note: This invitation expires on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.` : ''}

If you have any questions or need help, please don't hesitate to contact us.

Welcome aboard!

---
This invitation was sent by ${inviterName} from ${workspaceName}.
If you didn't expect this invitation, you can safely ignore this email.
    `;

    if (!this.transporter || !this.config) {
      console.warn('⚠️ Email service not configured - invitation email would be sent in production');
      console.log(`📧 [DEVELOPMENT MODE] Invitation email preview:
        To: ${this.maskEmail(email)}
        Subject: ${subject}
        Inviter: ${inviterName}
        Workspace: ${workspaceName}
        URL: ${invitationUrl}
        Expires: ${expiresAt ? expiresAt.toISOString() : 'Never'}`);
      return true;
    }

    try {
      const mailOptions = {
        from: this.config.from,
        to: email,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Invitation email sent to ${this.maskEmail(email)}: ${subject}`);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`   Message ID: ${result.messageId}`);
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ Failed to send invitation email to ${this.maskEmail(email)}:`, error.message);
      return false;
    }
  }

  // Test method to verify email service is working
  async testEmailService(testEmail: string = 'rjoberlander@gmail.com'): Promise<void> {
    console.log('🧪 Testing email service...');
    
    const testData = {
      returnNumber: 'RMA-001',
      items: [
        {
          product_name: 'Test Fence Panel',
          sku: 'FP-001',
          quantity: 1,
          refund_amount: 150.00,
          reason: 'Testing email system'
        }
      ],
      totalAmount: 150.00,
      trackingNumbers: ['1234567890', '0987654321'],
      outcome: 'refunded' as const,
      refundAmount: 150.00,
      reason: 'Email testing completed successfully'
    };

    console.log('\n📧 Sending test emails to:', testEmail);
    
    try {
      console.log('1. Sending submitted email...');
      await this.sendSubmittedEmail(testEmail, testData.returnNumber, testData.items, testData.totalAmount);
      
      console.log('2. Sending mailed email...');
      await this.sendMailedEmail(testEmail, testData.returnNumber, testData.trackingNumbers);
      
      console.log('3. Sending received email...');
      await this.sendReceivedEmail(testEmail, testData.returnNumber);
      
      console.log('4. Sending closed (refunded) email...');
      await this.sendClosedEmail(testEmail, testData.returnNumber, testData.outcome, testData.refundAmount);
      
      console.log('5. Sending closed (rejected) email...');
      await this.sendClosedEmail(testEmail, 'RMA-002', 'rejected', undefined, undefined, undefined, 'Items damaged beyond acceptable condition');
      
      console.log('6. Sending confirmation email...');
      await this.sendConfirmationEmail(testEmail, testData.returnNumber, testData.items, testData.totalAmount);
      
      console.log('\n✅ All test emails sent successfully!');
    } catch (error) {
      console.error('❌ Test email sending failed:', error);
    }
  }
}

export const emailService = new EmailService();
export default EmailService;