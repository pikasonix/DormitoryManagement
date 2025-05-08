import axios from 'axios';

/**
 * Lấy thông tin vị trí từ IP address
 * Sử dụng IP-API.com (dịch vụ miễn phí)
 */
export const getLocationFromIP = async (ip: string | undefined): Promise<string | undefined> => {
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
        const response = await axios.get(`http://ip-api.com/json/${ip}`, {
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
    } catch (error) {
        console.error('Error getting location from IP:', error);
        return undefined;
    }
};