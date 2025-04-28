import React from 'react';

const MultiSelectCheckbox = ({
    label,
    options = [], // Mảng [{ value, label }]
    selectedValues = [], // Mảng các value đã chọn
    onChange, // Callback trả về mảng value mới đã chọn: onChange([value1, value2])
    disabled = false,
    className = '',
    error = null,
}) => {

    const handleCheckboxChange = (event) => {
        const { value, checked } = event.target;
        const numValue = parseInt(value, 10); // Chuyển value về số (giả sử value là số)

        let newSelectedValues;
        if (checked) {
            // Thêm vào mảng nếu chưa có
            newSelectedValues = [...selectedValues, numValue];
        } else {
            // Loại bỏ khỏi mảng
            newSelectedValues = selectedValues.filter(val => val !== numValue);
        }
        onChange(newSelectedValues); // Gọi callback với mảng value mới
    };

    return (
        <fieldset className={className}>
            {label && <legend className="block text-sm font-medium leading-6 text-gray-900 mb-1">{label}</legend>}
            <div className="space-y-2">
                {options.length === 0 && <p className='text-sm text-gray-500 italic'>Không có lựa chọn nào.</p>}
                {options.map((option) => (
                    <div key={option.value} className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input
                                id={`multiselect-${label}-${option.value}`}
                                name={label} // Có thể cần name khác nếu dùng trong form phức tạp
                                type="checkbox"
                                value={option.value}
                                checked={selectedValues.includes(option.value)}
                                onChange={handleCheckboxChange}
                                disabled={disabled}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 disabled:opacity-50"
                            />
                        </div>
                        <div className="ml-3 text-sm leading-6">
                            <label htmlFor={`multiselect-${label}-${option.value}`} className={`font-medium text-gray-900 ${disabled ? 'text-gray-500' : ''}`}>
                                {option.label}
                            </label>
                            {/* Có thể thêm description nếu option có */}
                            {/* {option.description && <p className="text-gray-500">{option.description}</p>} */}
                        </div>
                    </div>
                ))}
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </fieldset>
    );
};

export default MultiSelectCheckbox;