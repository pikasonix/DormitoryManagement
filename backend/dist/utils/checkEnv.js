"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRequiredEnvVars = checkRequiredEnvVars;
function checkRequiredEnvVars() {
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    }
}
