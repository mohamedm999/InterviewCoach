import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailtrapClient } from 'mailtrap';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mailtrapClient: MailtrapClient | null = null;
  private readonly transporterReady: Promise<nodemailer.Transporter> | null =
    null;
  private readonly appUrl: string;
  private readonly mailFrom: string;
  private readonly isLocalDevelopment: boolean;
  private usingEthereal = false;

  constructor(private configService: ConfigService) {
    const nodeEnv = configService.get<string>('nodeEnv') || 'development';
    const mailtrapToken = configService.get<string>('mail.mailtrapToken');
    const host = configService.get<string>('mail.host');
    const port = configService.get<number>('mail.port') || 587;
    const user = configService.get<string>('mail.user');
    const pass = configService.get<string>('mail.password');

    this.appUrl =
      configService.get<string>('appUrl') || 'http://localhost:3001';
    this.mailFrom =
      configService.get<string>('mail.from') || 'noreply@interviewcoach.app';
    this.isLocalDevelopment = nodeEnv === 'development';

    // Priority 1: Mailtrap API token
    if (mailtrapToken) {
      this.mailtrapClient = new MailtrapClient({ token: mailtrapToken });
      this.logger.log('Mail configured via Mailtrap API');
      return;
    }

    // Priority 2: SMTP credentials
    if (host && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Mail transporter configured for ${host}:${port}`);
      this.transporterReady = Promise.resolve(transporter);
      return;
    }

    // Priority 3: Ethereal sandbox (dev only)
    if (!this.isLocalDevelopment) {
      throw new Error(
        'MAIL_HOST, MAIL_USER, and MAIL_PASSWORD are required outside local development',
      );
    }

    this.usingEthereal = true;
    this.transporterReady = nodemailer.createTestAccount().then((account) => {
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: account.user, pass: account.pass },
      });
      this.logger.warn(
        'No mail credentials set. Using Ethereal sandbox (dev only).',
      );
      return transporter;
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `${this.appUrl}/auth/verify?token=${token}`;

    await this.send(
      email,
      'Verify your InterviewCoach account',
      `
      <h2>Welcome to InterviewCoach!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${url}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Verify Email</a>
      <p>Link expires in 24 hours.</p>
    `,
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const url = `${this.appUrl}/auth/reset-password?token=${token}`;

    if (this.isLocalDevelopment && this.usingEthereal) {
      this.logger.debug(`Password reset email queued for ${email}`);
    }

    await this.send(
      email,
      'Reset your InterviewCoach password',
      `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the link below:</p>
      <a href="${url}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a>
      <p>Link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
    );
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (this.mailtrapClient) {
      await this.mailtrapClient.send({
        from: { email: 'hello@demomailtrap.co', name: 'InterviewCoach' },
        to: [{ email: to }],
        subject,
        html,
      });
      this.logger.log(`Email sent via Mailtrap to ${to}`);
      return;
    }

    const transporter = await this.transporterReady!;
    const info = await transporter.sendMail({
      from: this.mailFrom,
      to,
      subject,
      html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl && this.isLocalDevelopment && this.usingEthereal) {
      this.logger.debug(`Ethereal preview available: ${previewUrl}`);
      return;
    }

    this.logger.log(`Email sent to ${to} with messageId ${info.messageId}`);
  }
}
