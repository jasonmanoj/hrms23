import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(config.get<string>('SMTP_PORT') ?? 587),
        auth: config.get<string>('SMTP_USER')
          ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASS') }
          : undefined,
      });
    }
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transporter) {
      // No SMTP configured (e.g. local dev) - log instead of failing the request.
      this.logger.log(`[mail:noop] to=${to} subject="${subject}"`);
      return;
    }
    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM'),
      to,
      subject,
      text,
    });
  }
}
