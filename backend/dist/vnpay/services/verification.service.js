"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationService = void 0;
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const common_1 = require("../utils/common");
const payment_util_1 = require("../utils/payment.util");
/**
 * Dịch vụ xác thực dữ liệu từ VNPay
 * @en Verification service for VNPay data
 */
class VerificationService {
    /**
     * Khởi tạo dịch vụ xác thực
     * @en Initialize verification service
     *
     * @param config - Cấu hình VNPay
     * @en @param config - VNPay configuration
     *
     * @param logger - Dịch vụ logger
     * @en @param logger - Logger service
     *
     * @param hashAlgorithm - Thuật toán băm
     * @en @param hashAlgorithm - Hash algorithm
     */
    constructor(config, logger, hashAlgorithm) {
        this.config = config;
        this.logger = logger;
        this.hashAlgorithm = hashAlgorithm;
    }
    /**
     * Phương thức xác thực tính đúng đắn của các tham số trả về từ VNPay
     * @en Method to verify the return url from VNPay
     *
     * @param {ReturnQueryFromVNPay} query - Đối tượng dữ liệu trả về từ VNPay
     * @en @param {ReturnQueryFromVNPay} query - The object of data return from VNPay
     *
     * @param {VerifyReturnUrlOptions<LoggerFields>} options - Tùy chọn
     * @en @param {VerifyReturnUrlOptions<LoggerFields>} options - Options
     *
     * @returns {VerifyReturnUrl} Kết quả xác thực
     * @en @returns {VerifyReturnUrl} The verification result
     */
    verifyReturnUrl(query, options) {
        var _a, _b, _c;
        const { vnp_SecureHash = '', vnp_SecureHashType } = query, cloneQuery = __rest(query, ["vnp_SecureHash", "vnp_SecureHashType"]);
        if (typeof (cloneQuery === null || cloneQuery === void 0 ? void 0 : cloneQuery.vnp_Amount) !== 'number') {
            const isValidAmount = constants_1.numberRegex.test((_a = cloneQuery === null || cloneQuery === void 0 ? void 0 : cloneQuery.vnp_Amount) !== null && _a !== void 0 ? _a : '');
            if (!isValidAmount) {
                throw new Error('Invalid amount');
            }
            cloneQuery.vnp_Amount = Number(cloneQuery.vnp_Amount);
        }
        const searchParams = (0, payment_util_1.buildPaymentUrlSearchParams)(cloneQuery);
        const isVerified = (0, payment_util_1.verifySecureHash)({
            secureSecret: this.config.secureSecret,
            data: searchParams.toString(),
            hashAlgorithm: this.hashAlgorithm,
            receivedHash: vnp_SecureHash,
        });
        let outputResults = {
            isVerified,
            isSuccess: cloneQuery.vnp_ResponseCode === '00',
            message: (0, common_1.getResponseByStatusCode)((_c = (_b = cloneQuery.vnp_ResponseCode) === null || _b === void 0 ? void 0 : _b.toString()) !== null && _c !== void 0 ? _c : '', this.config.vnp_Locale),
        };
        if (!isVerified) {
            outputResults = Object.assign(Object.assign({}, outputResults), { message: 'Wrong checksum' });
        }
        const result = Object.assign(Object.assign(Object.assign({}, cloneQuery), outputResults), { vnp_Amount: cloneQuery.vnp_Amount / 100 });
        const data2Log = Object.assign(Object.assign({ createdAt: new Date(), method: 'verifyReturnUrl' }, result), { vnp_SecureHash: (options === null || options === void 0 ? void 0 : options.withHash) ? vnp_SecureHash : undefined });
        this.logger.log(data2Log, options, 'verifyReturnUrl');
        return result;
    }
    /**
     * Phương thức xác thực tính đúng đắn của lời gọi ipn từ VNPay
     *
     * Sau khi nhận được lời gọi, hệ thống merchant cần xác thực dữ liệu nhận được từ VNPay,
     * kiểm tra đơn hàng có hợp lệ không, kiểm tra số tiền thanh toán có đúng không.
     *
     * @en Method to verify the ipn url from VNPay
     *
     * After receiving the call, the merchant system needs to verify the data received from VNPay,
     * check if the order is valid, check if the payment amount is correct.
     *
     * @param {ReturnQueryFromVNPay} query - Đối tượng dữ liệu trả về từ VNPay
     * @en @param {ReturnQueryFromVNPay} query - The object of data return from VNPay
     *
     * @param {VerifyIpnCallOptions<LoggerFields>} options - Tùy chọn
     * @en @param {VerifyIpnCallOptions<LoggerFields>} options - Options
     *
     * @returns {VerifyIpnCall} Kết quả xác thực
     * @en @returns {VerifyIpnCall} The verification result
     */
    verifyIpnCall(query, options) {
        const hash = query.vnp_SecureHash;
        // Use silent logger to avoid double logging
        const silentOptions = { logger: { loggerFn: utils_1.ignoreLogger } };
        // Fix the 'any' type issue by using a more specific type
        const result = this.verifyReturnUrl(query, silentOptions);
        const data2Log = Object.assign(Object.assign({ createdAt: new Date(), method: 'verifyIpnCall' }, result), ((options === null || options === void 0 ? void 0 : options.withHash) ? { vnp_SecureHash: hash } : {}));
        this.logger.log(data2Log, options, 'verifyIpnCall');
        return result;
    }
}
exports.VerificationService = VerificationService;
