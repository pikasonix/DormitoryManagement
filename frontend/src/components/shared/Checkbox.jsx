import React from 'react';

const Checkbox = ({
  label,
  name,
  checked = false,
  onChange,
  disabled = false,
  className = '',
  error = null,
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
      />
      {label && (
        <label
          htmlFor={name}
          className="ml-2 block text-sm font-medium leading-6 text-gray-900 cursor-pointer"
        >
          {label}
        </label>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default Checkbox;
