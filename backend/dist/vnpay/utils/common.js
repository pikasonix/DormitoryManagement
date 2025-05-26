"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateInGMT7 = getDateInGMT7;
exports.dateFormat = dateFormat;
exports.parseDate = parseDate;
exports.isValidVnpayDateFormat = isValidVnpayDateFormat;
exports.generateRandomString = generateRandomString;
exports.getResponseByStatusCode = getResponseByStatusCode;
exports.resolveUrlString = resolveUrlString;
exports.hash = hash;
const crypto_1 = __importDefault(require("crypto"));
const dayjs_1 = __importDefault(require("dayjs"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const response_map_constant_1 = require("../constants/response-map.constant");
const enums_1 = require("../enums");
// Setup plugins
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
function getDateInGMT7(date) {
    const inputDate = date !== null && date !== void 0 ? date : new Date();
    const utcDate = dayjs_1.default.utc(inputDate);
    return new Date(utcDate.add(7, 'hour').valueOf());
}
/**
 * Định dạng lại ngày theo định dạng của VNPay, mặc định là yyyyMMddHHmmss
 * @en Format date to VNPay format, default is yyyyMMddHHmmss
 *
 * @param date date to format
 * @param format format of date
 * @returns formatted date
 */
function dateFormat(date, format = 'yyyyMMddHHmmss') {
    const pad = (n) => (n < 10 ? `0${n}` : n).toString();
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());
    return Number(format
        .replace('yyyy', year.toString())
        .replace('MM', month)
        .replace('dd', day)
        .replace('HH', hour)
        .replace('mm', minute)
        .replace('ss', second));
}
/**
 * Parse a vnpay date format number to date
 * @param dateNumber An vnpay date format number
 * @returns Date
 */
function parseDate(dateNumber, tz = 'local') {
    const dateString = dateNumber.toString();
    const _parseInt = Number.parseInt;
    const year = _parseInt(dateString.slice(0, 4));
    const month = _parseInt(dateString.slice(4, 6)) - 1; // months are 0-indexed in JavaScript
    const day = _parseInt(dateString.slice(6, 8));
    const hour = _parseInt(dateString.slice(8, 10));
    const minute = _parseInt(dateString.slice(10, 12));
    const second = _parseInt(dateString.slice(12, 14));
    // Create a formatted date string
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
    switch (tz) {
        case 'utc': {
            // Create a UTC date
            return dayjs_1.default.utc(formattedDate).toDate();
        }
        case 'gmt7': {
            // For GMT+7, create a date in Asia/Ho_Chi_Minh timezone
            const localDate = new Date(year, month, day, hour, minute, second);
            // Clone the date as UTC, then add 7 hours to simulate GMT+7
            const utcTime = dayjs_1.default.utc(localDate);
            return utcTime.add(7, 'hour').toDate();
        }
        // biome-ignore lint/complexity/noUselessSwitchCase: still good to readable
        case 'local':
        default:
            return new Date(year, month, day, hour, minute, second);
    }
}
/**
 * Validate if the date is match with format `yyyyMMddHHmmss` or not
 * @param date The date to be validated
 * @returns True if the date is valid, false otherwise
 */
function isValidVnpayDateFormat(date) {
    const dateString = date.toString();
    const regex = /^\d{4}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]$/;
    return regex.test(dateString);
}
function generateRandomString(length, options) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    if (options === null || options === void 0 ? void 0 : options.onlyNumber) {
        characters = '0123456789';
    }
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += `${characters[(Math.random() * charactersLength) | 0]}`;
    }
    return result;
}
/**
 * Lấy thông tin response theo mã response
 * @en Get response message by response code
 *
 * @param responseCode response code from VNPay
 * @param locale locale of response text
 * @param responseMap map of response code and response text if you want to custom
 * @returns message of response code
 */
function getResponseByStatusCode(responseCode = '', locale = enums_1.VnpLocale.VN, responseMap = response_map_constant_1.RESPONSE_MAP) {
    var _a;
    const respondText = (_a = responseMap.get(responseCode)) !== null && _a !== void 0 ? _a : responseMap.get('default');
    return respondText[locale];
}
function resolveUrlString(host, path) {
    let trimmedHost = host.trim();
    let trimmedPath = path.trim();
    while (trimmedHost.endsWith('/') || trimmedHost.endsWith('\\')) {
        trimmedHost = trimmedHost.slice(0, -1);
    }
    while (trimmedPath.startsWith('/') || trimmedPath.startsWith('\\')) {
        trimmedPath = trimmedPath.slice(1);
    }
    return `${trimmedHost}/${trimmedPath}`;
}
function hash(secret, data, algorithm) {
    return crypto_1.default.createHmac(algorithm, secret).update(data.toString()).digest('hex');
}
