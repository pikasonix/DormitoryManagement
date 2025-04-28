"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const checkEnv_1 = require("./utils/checkEnv");
dotenv_1.default.config();
// Debug database connection
console.log('Database connection details:');
try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL is not set');
    }
    // Replace template literals if they exist
    const processedUrl = dbUrl
        .replace(/\${([^}]+)}/g, (_, key) => process.env[key] || '');
    // Log parsed URL components for debugging (hide sensitive info)
    const urlObj = new URL(processedUrl);
    console.log('Database connection components:', {
        protocol: urlObj.protocol,
        host: urlObj.hostname,
        port: urlObj.port,
        database: urlObj.pathname.slice(1),
        params: urlObj.search,
        auth: urlObj.username ? 'present (hidden)' : 'not present'
    });
    console.log('Database URL validation:', 'Passed');
}
catch (error) {
    console.error('Error with DATABASE_URL:', error.message);
    console.error('Please make sure DATABASE_URL is properly set in Railway variables');
    process.exit(1);
}
const prisma = new client_1.PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});
const port = Number(process.env.PORT) || 5002;
// Debug environment variables
console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? 'Set (hidden)' : 'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set (hidden)' : 'Not set');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
// Check environment variables before doing anything else
(0, checkEnv_1.checkRequiredEnvVars)();
// Test database connection
prisma.$connect()
    .then(() => {
    console.log('Database connected successfully');
    app_1.default.listen(port, '0.0.0.0', () => {
        console.log(`\n=== Server running on port ${port} ===\n`);
    });
})
    .catch((error) => {
    console.error('Database connection failed:', error);
    console.error('Connection details:', {
        error: error.message,
        code: error.code,
        meta: error.meta
    });
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
});
console.log('Database URL format check:', {
    hasProtocol: (_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.startsWith('postgresql://'),
    hasHost: process.env.PGHOST ? 'Yes' : 'No',
    hasPort: process.env.PGPORT ? 'Yes' : 'No',
    hasDatabase: process.env.PGDATABASE ? 'Yes' : 'No'
});
