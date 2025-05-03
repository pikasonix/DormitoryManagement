import { useState, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const SearchInput = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  className = '',
  debounceTime = 500 // Default debounce time: 500ms
}) => {
  const [inputValue, setInputValue] = useState(value)
  const debounceTimerRef = useRef(null)

  // Update local state when prop value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      onChange(e) // Only call the parent's onChange after debounce time
    }, debounceTime)
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="relative">
      <div className="absolute left-3 top-2.5">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        className={`
          block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md
          leading-5 bg-white placeholder-gray-500 focus:outline-none
          focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500
          focus:border-indigo-500 sm:text-sm
          ${className}
        `}
        placeholder={placeholder}
      />
    </div>
  )
}

export default SearchInput