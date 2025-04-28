import { useState, useEffect } from 'react';

/**
 * Custom hook để trì hoãn việc cập nhật một giá trị (debounce).
 * Hữu ích cho việc xử lý input tìm kiếm, tránh gọi API liên tục khi người dùng đang gõ.
 * @param {any} value - Giá trị cần debounce.
 * @param {number} delay - Thời gian trì hoãn (milliseconds).
 * @returns {any} Giá trị đã được debounce.
 */
export function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
