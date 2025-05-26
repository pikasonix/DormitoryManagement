"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaymentUrlSearchParams = buildPaymentUrlSearchParams;
exports.createPaymentUrl = createPaymentUrl;
exports.calculateSecureHash = calculateSecureHash;
exports.verifySecureHash = verifySecureHash;
const crypto_1 = __importDefault(require("crypto"));
const common_1 = require("./common");
/**
 * Hàm tạo các parameter cho query string
 * @en Function to build payment URL search parameters
 */
function buildPaymentUrlSearchParams(data) {
    const params = new URLSearchParams();
    // Sort keys
    const sortedKeys = Object.keys(data).sort();
    // Add sorted parameters
    for (const key of sortedKeys) {
        if (data[key] !== undefined && data[key] !== null) {
            params.append(key, String(data[key]));
        }
    }
    return params;
}
/**
 * Hàm tạo URL thanh toán dựa trên config và data
 * @en Function to create payment URL based on config and data
 */
function createPaymentUrl({ config, data, }) {
    var _a;
    // Use the endpoints.paymentEndpoint if available, or fall back to config.paymentEndpoint for backward compatibility
    const paymentEndpoint = ((_a = config.endpoints) === null || _a === void 0 ? void 0 : _a.paymentEndpoint) || config.paymentEndpoint;
    const redirectUrl = new URL((0, common_1.resolveUrlString)(config.vnpayHost, paymentEndpoint));
    const searchParams = buildPaymentUrlSearchParams(data);
    redirectUrl.search = searchParams.toString();
    return redirectUrl;
}
/**
 * Hàm tính toán mã bảo mật
 * @en Function to calculate secure hash
 */
function calculateSecureHash({ secureSecret, data, hashAlgorithm, bufferEncode, }) {
    return crypto_1.default
        .createHmac(hashAlgorithm, secureSecret)
        .update(Buffer.from(data, bufferEncode))
        .digest('hex');
}
/**
 * Hàm xác minh mã bảo mật
 * @en Function to verify secure hash
 */
function verifySecureHash({ secureSecret, data, hashAlgorithm, receivedHash, }) {
    const calculatedHash = crypto_1.default
        .createHmac(hashAlgorithm, secureSecret)
        .update(Buffer.from(data, 'utf-8'))
        .digest('hex');
    return calculatedHash === receivedHash;
}
