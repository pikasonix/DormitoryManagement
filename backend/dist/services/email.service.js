"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
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
        });
    }
    /**
     * Gửi email đến người nhận
     */
    sendEmail(to, subject, html) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.transporter.sendMail({
                    from: process.env.SMTP_FROM,
                    to,
                    subject,
                    html
                });
                console.log(`Email sent to ${to}`);
                return result;
            }
            catch (error) {
                console.error('Email sending failed:', error);
                if (error instanceof Error) {
                    throw new Error(`Failed to send email: ${error.message}`);
                }
                else {
                    throw new Error('Failed to send email: Unknown error occurred');
                }
            }
        });
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
