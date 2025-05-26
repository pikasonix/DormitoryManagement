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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ignoreLogger = ignoreLogger;
exports.consoleLogger = consoleLogger;
exports.fileLogger = fileLogger;
const fs = __importStar(require("fs"));
/**
 * Truyền vào `loggerFn` để bỏ qua logger
 *
 * @en Pass to `loggerFn` for ignoring logger
 * @returns {void}
 */
function ignoreLogger() { }
/**
 * Ghi dữ liệu ra console
 *
 * @en Log data to console
 * @param data - Data to be logged
 */
function consoleLogger(data, symbol = 'log') {
    if (typeof console[symbol] === 'function') {
        console[symbol](data);
    }
}
/**
 * Ghi dữ liệu ra file
 *
 * @en Log data to file
 * @param data Data to be logged
 * @param filePath File path to be written
 * @param errorCallback Error callback function
 */
function fileLogger(data, filePath, errorCallback) {
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    fs.appendFile(filePath, `${dataString}\n`, (err) => {
        if (err && typeof errorCallback === 'function') {
            return errorCallback(err);
        }
        if (err) {
            console.error('Failed to write to file:', err);
            throw err;
        }
    });
}
