const Button = ({ 
  children, 
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  onClick,
  className = ''
}) => {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2
        ${styles[variant]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}

export default Button 