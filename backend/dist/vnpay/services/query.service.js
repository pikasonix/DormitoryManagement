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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryService = void 0;
const constants_1 = require("../constants");
const common_1 = require("../utils/common");
/**
 * Dịch vụ truy vấn kết quả và hoàn tiền VNPay
 * @en Query and refund service for VNPay
 */
class QueryService {
    /**
     * Khởi tạo dịch vụ truy vấn
     * @en Initialize query service
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
        this.bufferEncode = 'utf-8';
        this.config = config;
        this.logger = logger;
        this.hashAlgorithm = hashAlgorithm;
    }
    /**
     * Đây là API để hệ thống merchant truy vấn kết quả thanh toán của giao dịch tại hệ thống VNPAY.
     * @en This is the API for the merchant system to query the payment result of the transaction at the VNPAY system.
     *
     * @param {QueryDr} query - Dữ liệu truy vấn kết quả thanh toán
     * @en @param {QueryDr} query - The data to query payment result
     *
     * @param {QueryDrResponseOptions<LoggerFields>} options - Tùy chọn
     * @en @param {QueryDrResponseOptions<LoggerFields>} options - Options
     *
     * @returns {Promise<QueryDrResponse>} Kết quả truy vấn
     * @en @returns {Promise<QueryDrResponse>} The query result
     */
    queryDr(query, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const command = 'querydr';
            const dataQuery = Object.assign({ vnp_Version: (_a = this.config.vnp_Version) !== null && _a !== void 0 ? _a : constants_1.VNP_VERSION }, query);
            const queryEndpoint = this.config.endpoints.queryDrRefundEndpoint || constants_1.QUERY_DR_REFUND_ENDPOINT;
            const url = new URL((0, common_1.resolveUrlString)(this.config.vnpayHost, queryEndpoint));
            const stringToCreateHash = [
                dataQuery.vnp_RequestId,
                dataQuery.vnp_Version,
                command,
                this.config.tmnCode,
                dataQuery.vnp_TxnRef,
                dataQuery.vnp_TransactionDate,
                dataQuery.vnp_CreateDate,
                dataQuery.vnp_IpAddr,
                dataQuery.vnp_OrderInfo,
            ]
                .map(String)
                .join('|')
                .replace(/undefined/g, '');
            const requestHashed = (0, common_1.hash)(this.config.secureSecret, Buffer.from(stringToCreateHash, this.bufferEncode), this.hashAlgorithm);
            const body = Object.assign(Object.assign({}, dataQuery), { vnp_Command: command, vnp_TmnCode: this.config.tmnCode, vnp_SecureHash: requestHashed });
            const response = yield fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = (yield response.json());
            const message = (0, common_1.getResponseByStatusCode)((_c = (_b = responseData.vnp_ResponseCode) === null || _b === void 0 ? void 0 : _b.toString()) !== null && _c !== void 0 ? _c : '', this.config.vnp_Locale, constants_1.QUERY_DR_RESPONSE_MAP);
            let outputResults = Object.assign(Object.assign({ isVerified: true, isSuccess: responseData.vnp_ResponseCode === '00' || responseData.vnp_ResponseCode === 0, message }, responseData), { vnp_Message: message });
            const stringToCreateHashOfResponse = [
                responseData.vnp_ResponseId,
                responseData.vnp_Command,
                responseData.vnp_ResponseCode,
                responseData.vnp_Message,
                this.config.tmnCode,
                responseData.vnp_TxnRef,
                responseData.vnp_Amount,
                responseData.vnp_BankCode,
                responseData.vnp_PayDate,
                responseData.vnp_TransactionNo,
                responseData.vnp_TransactionType,
                responseData.vnp_TransactionStatus,
                responseData.vnp_OrderInfo,
                responseData.vnp_PromotionCode,
                responseData.vnp_PromotionAmount,
            ]
                .map(String)
                .join('|')
                .replace(/undefined/g, '');
            const responseHashed = (0, common_1.hash)(this.config.secureSecret, Buffer.from(stringToCreateHashOfResponse, this.bufferEncode), this.hashAlgorithm);
            if ((responseData === null || responseData === void 0 ? void 0 : responseData.vnp_SecureHash) && responseHashed !== responseData.vnp_SecureHash) {
                outputResults = Object.assign(Object.assign({}, outputResults), { isVerified: false, message: (0, common_1.getResponseByStatusCode)(constants_1.WRONG_CHECKSUM_KEY, this.config.vnp_Locale, constants_1.QUERY_DR_RESPONSE_MAP) });
            }
            const data2Log = Object.assign({ createdAt: new Date(), method: 'queryDr' }, outputResults);
            this.logger.log(data2Log, options, 'queryDr');
            return outputResults;
        });
    }
    /**
     * Đây là API để hệ thống merchant gửi yêu cầu hoàn tiền cho giao dịch qua hệ thống Cổng thanh toán VNPAY.
     * @en This is the API for the merchant system to refund the transaction at the VNPAY system.
     *
     * @param {Refund} data - Dữ liệu yêu cầu hoàn tiền
     * @en @param {Refund} data - The data to request refund
     *
     * @param {RefundOptions<LoggerFields>} options - Tùy chọn
     * @en @param {RefundOptions<LoggerFields>} options - Options
     *
     * @returns {Promise<RefundResponse>} Kết quả hoàn tiền
     * @en @returns {Promise<RefundResponse>} The refund result
     */
    refund(data, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const vnp_Command = 'refund';
            const DEFAULT_TRANSACTION_NO_IF_NOT_EXIST = '0';
            const dataQuery = Object.assign(Object.assign({}, data), { vnp_Command, vnp_Version: (_a = this.config.vnp_Version) !== null && _a !== void 0 ? _a : constants_1.VNP_VERSION, vnp_TmnCode: this.config.tmnCode, vnp_Amount: data.vnp_Amount * 100 });
            const { vnp_Version, vnp_TmnCode, vnp_RequestId, vnp_TransactionType, vnp_TxnRef, vnp_TransactionNo = DEFAULT_TRANSACTION_NO_IF_NOT_EXIST, vnp_TransactionDate, vnp_CreateBy, vnp_CreateDate, vnp_IpAddr, vnp_OrderInfo, } = dataQuery;
            // Use custom endpoint if configured
            const refundEndpoint = this.config.endpoints.queryDrRefundEndpoint || constants_1.QUERY_DR_REFUND_ENDPOINT;
            const url = new URL((0, common_1.resolveUrlString)(this.config.vnpayHost, refundEndpoint));
            const stringToHashOfRequest = [
                vnp_RequestId,
                vnp_Version,
                vnp_Command,
                vnp_TmnCode,
                vnp_TransactionType,
                vnp_TxnRef,
                dataQuery.vnp_Amount,
                vnp_TransactionNo,
                vnp_TransactionDate,
                vnp_CreateBy,
                vnp_CreateDate,
                vnp_IpAddr,
                vnp_OrderInfo,
            ]
                .map(String)
                .join('|')
                .replace(/undefined/g, '');
            const requestHashed = (0, common_1.hash)(this.config.secureSecret, Buffer.from(stringToHashOfRequest, this.bufferEncode), this.hashAlgorithm);
            const body = Object.assign(Object.assign({}, dataQuery), { vnp_SecureHash: requestHashed });
            const response = yield fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const responseData = (yield response.json());
            if (responseData === null || responseData === void 0 ? void 0 : responseData.vnp_Amount) {
                responseData.vnp_Amount = responseData.vnp_Amount / 100;
            }
            const message = (0, common_1.getResponseByStatusCode)((_c = (_b = responseData.vnp_ResponseCode) === null || _b === void 0 ? void 0 : _b.toString()) !== null && _c !== void 0 ? _c : '', (_d = data === null || data === void 0 ? void 0 : data.vnp_Locale) !== null && _d !== void 0 ? _d : this.config.vnp_Locale, constants_1.REFUND_RESPONSE_MAP);
            let outputResults = Object.assign(Object.assign({ isVerified: true, isSuccess: responseData.vnp_ResponseCode === '00' || responseData.vnp_ResponseCode === 0, message }, responseData), { vnp_Message: message });
            // Only check signed hash when request is not error
            if (Number(responseData.vnp_ResponseCode) <= 90 &&
                Number(responseData.vnp_ResponseCode) >= 99) {
                const stringToCreateHashOfResponse = [
                    responseData.vnp_ResponseId,
                    responseData.vnp_Command,
                    responseData.vnp_ResponseCode,
                    responseData.vnp_Message,
                    responseData.vnp_TmnCode,
                    responseData.vnp_TxnRef,
                    responseData.vnp_Amount,
                    responseData.vnp_BankCode,
                    responseData.vnp_PayDate,
                    responseData.vnp_TransactionNo,
                    responseData.vnp_TransactionType,
                    responseData.vnp_TransactionStatus,
                    responseData.vnp_OrderInfo,
                ]
                    .map(String)
                    .join('|')
                    .replace(/undefined/g, '');
                const responseHashed = (0, common_1.hash)(this.config.secureSecret, Buffer.from(stringToCreateHashOfResponse, this.bufferEncode), this.hashAlgorithm);
                if ((responseData === null || responseData === void 0 ? void 0 : responseData.vnp_SecureHash) && responseHashed !== responseData.vnp_SecureHash) {
                    outputResults = Object.assign(Object.assign({}, outputResults), { isVerified: false, message: (0, common_1.getResponseByStatusCode)(constants_1.WRONG_CHECKSUM_KEY, this.config.vnp_Locale, constants_1.REFUND_RESPONSE_MAP) });
                }
            }
            const data2Log = Object.assign({ createdAt: new Date(), method: 'refund' }, outputResults);
            this.logger.log(data2Log, options, 'refund');
            return outputResults;
        });
    }
}
exports.QueryService = QueryService;
