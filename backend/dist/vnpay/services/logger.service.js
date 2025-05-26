"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const utils_1 = require("../utils");
/**
 * Lớp dịch vụ xử lý log cho VNPay
 * @en Logger service class for VNPay
 */
class LoggerService {
    /**
     * Khởi tạo dịch vụ logger
     * @en Initialize logger service
     *
     * @param isEnabled - Cho phép log hay không
     * @en @param isEnabled - Enable logging or not
     *
     * @param customLoggerFn - Hàm logger tùy chỉnh
     * @en @param customLoggerFn - Custom logger function
     */
    constructor(isEnabled = false, customLoggerFn) {
        this.isEnabled = false;
        this.loggerFn = utils_1.ignoreLogger;
        this.isEnabled = isEnabled;
        this.loggerFn = customLoggerFn || (isEnabled ? utils_1.consoleLogger : utils_1.ignoreLogger);
    }
    /**
     * Ghi log dữ liệu
     * @en Log data
     *
     * @param data - Dữ liệu cần log
     * @en @param data - Data to log
     *
     * @param options - Tùy chọn log
     * @en @param options - Logging options
     *
     * @param methodName - Tên phương thức gọi log
     * @en @param methodName - Method name that calls the log
     */
    log(data, options, methodName) {
        var _a;
        if (!this.isEnabled)
            return;
        const logData = Object.assign({}, data);
        if (methodName) {
            Object.assign(logData, { method: methodName, createdAt: new Date() });
        }
        if ((options === null || options === void 0 ? void 0 : options.logger) && 'fields' in options.logger) {
            const { type, fields } = options.logger;
            for (const key of Object.keys(logData)) {
                const keyAssert = key;
                if ((type === 'omit' && fields.includes(keyAssert)) ||
                    (type === 'pick' && !fields.includes(keyAssert))) {
                    delete logData[keyAssert];
                }
            }
        }
        // Execute logger function
        (((_a = options === null || options === void 0 ? void 0 : options.logger) === null || _a === void 0 ? void 0 : _a.loggerFn) || this.loggerFn)(logData);
    }
}
exports.LoggerService = LoggerService;
