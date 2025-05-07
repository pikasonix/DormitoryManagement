import React from 'react';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  placeholder = '-- Chọn --',
  error = '',
  className = '',
  ...props
}) => {
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

      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => {
          // Create a simulated event object that matches what handleFilterChange expects
          if (onChange) {
            onChange({
              target: {
                name: name,
                value: e.target.value
              }
            });
          }
        }}
        disabled={disabled}
        required={required}
        className={`
          w-full rounded-md border px-3 py-2 text-sm shadow-sm
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300'}
          appearance-none
        `}
        {...props}
      >
        <option value="" disabled hidden>{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Select;