import React from 'react';
import { format, parseISO } from 'date-fns';

const DatePicker = ({
    label,
    id,
    name,
    selected, // Nhận Date object hoặc null
    onChange, // Callback trả về Date object hoặc null: onChange(newDate)
    required = false,
    disabled = false,
    error = null,
    className = '',
    min, // string YYYY-MM-DD
    max, // string YYYY-MM-DD
    ...props
}) => {

    const handleChange = (event) => {
        const dateString = event.target.value;
        if (onChange) {
            // Trả về Date object nếu hợp lệ, nếu không trả về null
            try {
                // Cần thêm timezone offset nếu cần chính xác tuyệt đối, nhưng thường không cần cho date input
                onChange(dateString ? parseISO(dateString) : null);
            } catch (e) {
                onChange(null); // Trả về null nếu không parse được
            }
        }
    };

    // Format Date object thành YYYY-MM-DD cho input value
    const formattedValue = selected instanceof Date && !isNaN(selected)
        ? format(selected, 'yyyy-MM-dd')
        : '';

    return (
        <div className={className}>
            {label && (
                <label htmlFor={id || name} className="block text-sm font-medium leading-6 text-gray-900 mb-1">
                    {label} {required && <span className="text-red-600">*</span>}
                </label>
            )}
            <input
                type="date"
                id={id || name}
                name={name}
                value={formattedValue}
                onChange={handleChange}
                required={required}
                disabled={disabled}
                min={min}
                max={max}
                className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'ring-red-500 focus:ring-red-600' : 'ring-gray-300 focus:ring-indigo-600'}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};

export default DatePicker;