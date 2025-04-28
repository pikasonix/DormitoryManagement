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

      <input
        id={name}
        name={name}
        type={type}
        value={value}
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
    </div>
  );
};

export default Input;