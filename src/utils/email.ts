import nodemailer from 'nodemailer';

/**
 * Email configuration from environment variables.
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
 */
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;
const emailFrom = process.env.EMAIL_FROM || 'noreply@example.com';

/**
 * Creates a nodemailer transporter.
 * Returns null if SMTP is not configured.
 */
function createTransporter() {
  if (!smtpHost || !smtpUser || !smtpPassword) {
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
}

/**
 * Sends an email.
 * Returns true if sent successfully, false if SMTP is not configured.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    console.warn('SMTP not configured. Email not sent.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Sends a welcome email with email verification link.
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
): Promise<boolean> {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Enterprise CMS';

  return sendEmail({
    to,
    subject: `Verify your email - ${siteName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1d4ed8; margin-bottom: 20px;">Welcome to ${siteName}!</h2>
        <p style="color: #374151; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #374151; line-height: 1.6;">
          Thank you for creating an account. Please verify your email address by clicking the button below:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #1d4ed8;">${verificationUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to ${siteName}! Please verify your email by visiting: ${verificationUrl}`,
  });
}

/**
 * Sends a password reset email.
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Enterprise CMS';

  return sendEmail({
    to,
    subject: `Reset your password - ${siteName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1d4ed8; margin-bottom: 20px;">Password Reset Request</h2>
        <p style="color: #374151; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #374151; line-height: 1.6;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #1d4ed8;">${resetUrl}</a>
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Reset your password by visiting: ${resetUrl}`,
  });
}

/**
 * Sends an account notification email (e.g., password changed, email changed).
 */
export async function sendAccountNotificationEmail(
  to: string,
  name: string,
  message: string
): Promise<boolean> {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Enterprise CMS';

  return sendEmail({
    to,
    subject: `Account Update - ${siteName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1d4ed8; margin-bottom: 20px;">Account Update</h2>
        <p style="color: #374151; line-height: 1.6;">Hi ${name},</p>
        <p style="color: #374151; line-height: 1.6;">${message}</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          If you didn't make this change, please contact support immediately.
        </p>
      </div>
    `,
    text: message,
  });
}