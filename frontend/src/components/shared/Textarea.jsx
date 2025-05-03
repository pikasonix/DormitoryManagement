const Textarea = ({
  label,
  value,
  onChange,
  rows = 3,
  required = false,
  className = '',
  name,
  id,
  placeholder = '',
  disabled = false,
  readOnly = false,
  error = null
}) => {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value || ''}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`
          block w-full rounded-md border-gray-300 shadow-sm
          focus:border-indigo-500 focus:ring-indigo-500
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

export default Textarea