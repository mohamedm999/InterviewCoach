import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private fromAddress: string;

  constructor(private configService: ConfigService) {
    const host = configService.get<string>('MAIL_HOST');
    const port = configService.get<number>('MAIL_PORT') || 587;
    const user = configService.get<string>('MAIL_USER');
    const pass = configService.get<string>('MAIL_PASS');
    this.fromAddress = configService.get<string>('MAIL_FROM') || 'no-reply@interviewcoach.app';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
      this.logger.log('Mail transporter configured.');
    } else {
      // Ethereal sandbox for development
      nodemailer.createTestAccount().then((account) => {
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          auth: { user: account.user, pass: account.pass },
        });
        this.logger.warn(
          `MAIL_HOST not set. Using Ethereal sandbox: ${account.user} / ${account.pass}`,
        );
      });
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const url = `${appUrl}/auth/verify?token=${token}`;
    await this.send(email, 'Verify your InterviewCoach account', `
      <h2>Welcome to InterviewCoach!</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${url}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Verify Email</a>
      <p>Link expires in 24 hours.</p>
    `);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const url = `${appUrl}/auth/reset-password?token=${token}`;
    await this.send(email, 'Reset your InterviewCoach password', `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the link below:</p>
      <a href="${url}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Reset Password</a>
      <p>Link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Mail not sent to ${to} (no transporter configured yet)`);
      return;
    }
    const info = await this.transporter.sendMail({
      from: this.fromAddress,
      to,
      subject,
      html,
    });
    this.logger.log(`Email sent: ${nodemailer.getTestMessageUrl(info) || info.messageId}`);
  }
}
