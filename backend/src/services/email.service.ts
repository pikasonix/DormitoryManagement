import nodemailer from 'nodemailer'

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }

  /**
   * Gửi email đến người nhận
   */
  async sendEmail(to: string, subject: string, html: string) {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject,
        html
      })
      console.log(`Email sent to ${to}`)
      return result
    } catch (error: unknown) {
      console.error('Email sending failed:', error)

      if (error instanceof Error) {
        throw new Error(`Failed to send email: ${error.message}`)
      } else {
        throw new Error('Failed to send email: Unknown error occurred')
      }
    }
  }
}

export const emailService = new EmailService()