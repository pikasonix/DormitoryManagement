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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocationFromIP = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Lấy thông tin vị trí từ IP address
 * Sử dụng IP-API.com (dịch vụ miễn phí)
 */
const getLocationFromIP = (ip) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!ip) {
            return undefined;
        }
        // Bỏ qua localhost và địa chỉ mạng nội bộ
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return 'Mạng nội bộ';
        }
        // Loại bỏ IPv6 prefix nếu có
        if (ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }
        // Sử dụng IP-API (free service)
        const response = yield axios_1.default.get(`http://ip-api.com/json/${ip}`, {
            timeout: 3000, // Timeout 3 giây để tránh làm chậm đăng nhập
            params: {
                fields: 'status,country,regionName,city',
                lang: 'vi'
            }
        });
        if (response.data.status === 'success') {
            const { country, regionName, city } = response.data;
            return `${city}, ${regionName}, ${country}`;
        }
        return undefined;
    }
    catch (error) {
        console.error('Error getting location from IP:', error);
        return undefined;
    }
});
exports.getLocationFromIP = getLocationFromIP;
