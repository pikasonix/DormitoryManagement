import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const SearchInput = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  className = ''
}) => {
  return (
    <div className="relative">
      <div className="absolute left-3 top-2.5">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
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