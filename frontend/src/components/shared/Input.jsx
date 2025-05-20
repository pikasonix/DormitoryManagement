import React from 'react';

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = '',
  error = '',
  className = '',
  hint = '',
  ...props
}) => {
  // Xử lý giá trị cho input, đặc biệt quan trọng với input type="number"
  const processedValue = () => {
    // Với input loại number, cần đảm bảo value là số hoặc chuỗi rỗng
    if (type === 'number') {
      // Nếu value là null, undefined hoặc NaN, trả về chuỗi rỗng
      if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
        return '';
      }
      // Nếu là số 0, vẫn giữ nguyên
      if (value === 0) {
        return 0;
      }
      // Với các giá trị khác, nếu giá trị tính toán thành false (0, '', null, undefined), trả về chuỗi rỗng
      return value || '';
    }

    // Với các loại input khác, null hoặc undefined sẽ trả về chuỗi rỗng
    return value === null || value === undefined ? '' : value;
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <input
        id={name}
        name={name}
        type={type}
        value={processedValue()}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`
          w-full rounded-md border px-3 py-2 text-sm shadow-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
        `}
        {...props}
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {hint && (
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      )}
    </div>
  );
};

export default Input;