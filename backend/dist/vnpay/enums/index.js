"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundTransactionType = exports.VnpTransactionType = exports.VnpCardType = exports.VnpLocale = exports.VnpCurrCode = exports.HashAlgorithm = exports.UrlService = void 0;
__exportStar(require("./product-code.enum"), exports);
var UrlService;
(function (UrlService) {
    UrlService["sandbox"] = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
})(UrlService || (exports.UrlService = UrlService = {}));
var HashAlgorithm;
(function (HashAlgorithm) {
    HashAlgorithm["SHA256"] = "SHA256";
    HashAlgorithm["SHA512"] = "SHA512";
    HashAlgorithm["MD5"] = "MD5";
})(HashAlgorithm || (exports.HashAlgorithm = HashAlgorithm = {}));
var VnpCurrCode;
(function (VnpCurrCode) {
    VnpCurrCode["VND"] = "VND";
})(VnpCurrCode || (exports.VnpCurrCode = VnpCurrCode = {}));
var VnpLocale;
(function (VnpLocale) {
    VnpLocale["VN"] = "vn";
    VnpLocale["EN"] = "en";
})(VnpLocale || (exports.VnpLocale = VnpLocale = {}));
var VnpCardType;
(function (VnpCardType) {
    VnpCardType["ATM"] = "ATM";
    VnpCardType["QRCODE"] = "QRCODE";
})(VnpCardType || (exports.VnpCardType = VnpCardType = {}));
var VnpTransactionType;
(function (VnpTransactionType) {
    VnpTransactionType["PAYMENT"] = "01";
    VnpTransactionType["FULL_REFUND"] = "02";
    VnpTransactionType["PARTIAL_REFUND"] = "03";
})(VnpTransactionType || (exports.VnpTransactionType = VnpTransactionType = {}));
var RefundTransactionType;
(function (RefundTransactionType) {
    RefundTransactionType["FULL_REFUND"] = "02";
    RefundTransactionType["PARTIAL_REFUND"] = "03";
})(RefundTransactionType || (exports.RefundTransactionType = RefundTransactionType = {}));
