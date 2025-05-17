const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  tooltip,
  className = ''
}) => {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    success: 'bg-green-600 text-white hover:bg-green-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
    info: 'bg-blue-500 text-white hover:bg-blue-600',
    icon: 'bg-transparent hover:bg-gray-100 p-1 rounded-full'
  };

  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  // Default to md size if not using icon variant
  const sizeClass = variant === 'icon' ? '' : (sizes[size] || sizes.md);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip}
      className={`
        ${variant !== 'icon' ? 'rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2' : ''}
        ${styles[variant] || styles.primary}
        ${sizeClass}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}

export default Button 