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
exports.VNPay = void 0;
const constants_1 = require("./constants");
const enums_1 = require("./enums");
const logger_service_1 = require("./services/logger.service");
const payment_service_1 = require("./services/payment.service");
const query_service_1 = require("./services/query.service");
const verification_service_1 = require("./services/verification.service");
const common_1 = require("./utils/common");
/**
 * Lớp hỗ trợ thanh toán qua VNPay
 * @en VNPay class to support VNPay payment
 * @see https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * @example
 * import { VNPay } from 'vnpay';
 *
 * const vnpay = new VNPay({
 *     vnpayHost: 'https://sandbox.vnpayment.vn',
 *     tmnCode: 'TMNCODE',
 *     secureSecret: 'SERCRET',
 *     testMode: true, // optional
 *     hashAlgorithm: 'SHA512', // optional
 *     // Using new endpoints configuration
 *     endpoints: {
 *       paymentEndpoint: 'paymentv2/vpcpay.html',
 *       queryDrRefundEndpoint: 'merchant_webapi/api/transaction',
 *       getBankListEndpoint: 'qrpayauth/api/merchant/get_bank_list',
 *     }
 * });
 *
 * const tnx = '12345678'; // Generate your own transaction code
 * const urlString = vnpay.buildPaymentUrl({
 *     vnp_Amount: 100000,
 *     vnp_IpAddr: '192.168.0.1',
 *     vnp_ReturnUrl: 'http://localhost:8888/order/vnpay_return',
 *     vnp_TxnRef: tnx,
 *     vnp_OrderInfo: `Thanh toan cho ma GD: ${tnx}`,
 * }),
 *
 */
class VNPay {
    /**
     * Khởi tạo đối tượng VNPay
     * @en Initialize VNPay instance
     *
     * @param {VNPayConfig} config - VNPay configuration
     */
    constructor(_a) {
        var _b, _c;
        var { vnpayHost = constants_1.VNPAY_GATEWAY_SANDBOX_HOST, vnp_Version = constants_1.VNP_VERSION, vnp_CurrCode = enums_1.VnpCurrCode.VND, vnp_Locale = enums_1.VnpLocale.VN, testMode = false, paymentEndpoint = constants_1.PAYMENT_ENDPOINT, endpoints = {} } = _a, config = __rest(_a, ["vnpayHost", "vnp_Version", "vnp_CurrCode", "vnp_Locale", "testMode", "paymentEndpoint", "endpoints"]);
        if (testMode) {
            vnpayHost = constants_1.VNPAY_GATEWAY_SANDBOX_HOST;
        }
        this.hashAlgorithm = (_b = config === null || config === void 0 ? void 0 : config.hashAlgorithm) !== null && _b !== void 0 ? _b : enums_1.HashAlgorithm.SHA512;
        // Initialize endpoints with defaults and overrides
        const initializedEndpoints = {
            paymentEndpoint: endpoints.paymentEndpoint || paymentEndpoint,
            queryDrRefundEndpoint: endpoints.queryDrRefundEndpoint || constants_1.QUERY_DR_REFUND_ENDPOINT,
            getBankListEndpoint: endpoints.getBankListEndpoint || constants_1.GET_BANK_LIST_ENDPOINT,
        };
        this.globalConfig = Object.assign({ vnpayHost,
            vnp_Version,
            vnp_CurrCode,
            vnp_Locale, vnp_OrderType: enums_1.ProductCode.Other, vnp_Command: constants_1.VNP_DEFAULT_COMMAND, paymentEndpoint: initializedEndpoints.paymentEndpoint, endpoints: initializedEndpoints }, config);
        this.loggerService = new logger_service_1.LoggerService((_c = config === null || config === void 0 ? void 0 : config.enableLog) !== null && _c !== void 0 ? _c : false, config === null || config === void 0 ? void 0 : config.loggerFn);
        this.paymentService = new payment_service_1.PaymentService(this.globalConfig, this.loggerService, this.hashAlgorithm);
        this.verificationService = new verification_service_1.VerificationService(this.globalConfig, this.loggerService, this.hashAlgorithm);
        this.queryService = new query_service_1.QueryService(this.globalConfig, this.loggerService, this.hashAlgorithm);
    }
    /**
     * Lấy cấu hình mặc định của VNPay
     * @en Get default config of VNPay
     *
     * @returns {DefaultConfig} Cấu hình mặc định
     * @en @returns {DefaultConfig} Default configuration
     */
    get defaultConfig() {
        return {
            vnp_TmnCode: this.globalConfig.tmnCode,
            vnp_Version: this.globalConfig.vnp_Version,
            vnp_CurrCode: this.globalConfig.vnp_CurrCode,
            vnp_Locale: this.globalConfig.vnp_Locale,
            vnp_Command: this.globalConfig.vnp_Command,
            vnp_OrderType: this.globalConfig.vnp_OrderType,
        };
    }
    /**
     * Lấy danh sách ngân hàng được hỗ trợ bởi VNPay
     * @en Get list of banks supported by VNPay
     *
     * @returns {Promise<Bank[]>} Danh sách ngân hàng
     * @en @returns {Promise<Bank[]>} List of banks
     */
    getBankList() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const response = yield fetch((0, common_1.resolveUrlString)((_a = this.globalConfig.vnpayHost) !== null && _a !== void 0 ? _a : constants_1.VNPAY_GATEWAY_SANDBOX_HOST, this.globalConfig.endpoints.getBankListEndpoint), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `tmn_code=${this.globalConfig.tmnCode}`,
            });
            const bankList = (yield response.json());
            for (const bank of bankList) {
                bank.logo_link = (0, common_1.resolveUrlString)((_b = this.globalConfig.vnpayHost) !== null && _b !== void 0 ? _b : constants_1.VNPAY_GATEWAY_SANDBOX_HOST, bank.logo_link.slice(1));
            }
            return bankList;
        });
    }
    /**
     * Phương thức xây dựng, tạo thành url thanh toán của VNPay
     * @en Build the payment url
     *
     * @param {BuildPaymentUrl} data - Dữ liệu thanh toán cần thiết để tạo URL
     * @en @param {BuildPaymentUrl} data - Payment data required to create URL
     *
     * @param {BuildPaymentUrlOptions<LoggerFields>} options - Tùy chọn bổ sung
     * @en @param {BuildPaymentUrlOptions<LoggerFields>} options - Additional options
     *
     * @returns {string} URL thanh toán
     * @en @returns {string} Payment URL
     * @see https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#tao-url-thanh-toan
     */
    buildPaymentUrl(data, options) {
        return this.paymentService.buildPaymentUrl(data, options);
    }
    /**
     * Phương thức xác thực tính đúng đắn của các tham số trả về từ VNPay
     * @en Method to verify the return url from VNPay
     *
     * @param {ReturnQueryFromVNPay} query - Đối tượng dữ liệu trả về từ VNPay
     * @en @param {ReturnQueryFromVNPay} query - The object of data returned from VNPay
     *
     * @param {VerifyReturnUrlOptions<LoggerFields>} options - Tùy chọn để xác thực
     * @en @param {VerifyReturnUrlOptions<LoggerFields>} options - Options for verification
     *
     * @returns {VerifyReturnUrl} Kết quả xác thực
     * @en @returns {VerifyReturnUrl} Verification result
     * @see https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#code-returnurl
     */
    verifyReturnUrl(query, options) {
        return this.verificationService.verifyReturnUrl(query, options);
    }
    /**
     * Phương thức xác thực tính đúng đắn của lời gọi ipn từ VNPay
     *
     * Sau khi nhận được lời gọi, hệ thống merchant cần xác thực dữ liệu nhận được từ VNPay,
     * kiểm tra đơn hàng có hợp lệ không, kiểm tra số tiền thanh toán có đúng không.
     *
     * Sau đó phản hồi lại VNPay kết quả xác thực thông qua các `IpnResponse`
     *
     * @en Method to verify the ipn call from VNPay
     *
     * After receiving the call, the merchant system needs to verify the data received from VNPay,
     * check if the order is valid, check if the payment amount is correct.
     *
     * Then respond to VNPay the verification result through `IpnResponse`
     *
     * @param {ReturnQueryFromVNPay} query - Đối tượng dữ liệu từ VNPay qua IPN
     * @en @param {ReturnQueryFromVNPay} query - The object of data from VNPay via IPN
     *
     * @param {VerifyIpnCallOptions<LoggerFields>} options - Tùy chọn để xác thực
     * @en @param {VerifyIpnCallOptions<LoggerFields>} options - Options for verification
     *
     * @returns {VerifyIpnCall} Kết quả xác thực
     * @en @returns {VerifyIpnCall} Verification result
     * @see https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#code-ipn-url
     */
    verifyIpnCall(query, options) {
        return this.verificationService.verifyIpnCall(query, options);
    }
    /**
     * Đây là API để hệ thống merchant truy vấn kết quả thanh toán của giao dịch tại hệ thống VNPAY.
     * @en This is the API for the merchant system to query the payment result of the transaction at the VNPAY system.
     *
     * @param {QueryDr} query - Dữ liệu truy vấn kết quả thanh toán
     * @en @param {QueryDr} query - The data to query payment result
     *
     * @param {QueryDrResponseOptions<LoggerFields>} options - Tùy chọn truy vấn
     * @en @param {QueryDrResponseOptions<LoggerFields>} options - Query options
     *
     * @returns {Promise<QueryDrResponse>} Kết quả truy vấn từ VNPay sau khi đã xác thực
     * @en @returns {Promise<QueryDrResponse>} Query result from VNPay after verification
     * @see https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&refund.html#truy-van-ket-qua-thanh-toan-PAY
     */
    queryDr(query, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.queryService.queryDr(query, options);
        });
    }
    /**
     * Đây là API để hệ thống merchant gửi yêu cầu hoàn tiền cho giao dịch qua hệ thống Cổng thanh toán VNPAY.
     * @en This is the API for the merchant system to refund the transaction at the VNPAY system.
     *
     * @param {Refund} data - Dữ liệu yêu cầu hoàn tiền
     * @en @param {Refund} data - The data to request refund
     *
     * @param {RefundOptions<LoggerFields>} options - Tùy chọn hoàn tiền
     * @en @param {RefundOptions<LoggerFields>} options - Refund options
     *
     * @returns {Promise<RefundResponse>} Kết quả hoàn tiền từ VNPay sau khi đã xác thực
     * @en @returns {Promise<RefundResponse>} Refund result from VNPay after verification
     * @see https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&refund.html#hoan-tien-thanh-toan-PAY
     */
    refund(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.queryService.refund(data, options);
        });
    }
}
exports.VNPay = VNPay;
