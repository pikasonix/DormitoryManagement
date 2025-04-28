const Skeleton = ({ 
  width = 'w-full',
  height = 'h-4',
  className = ''
}) => {
  return (
    <div 
      className={`
        animate-pulse bg-gray-200 rounded
        ${width}
        ${height}
        ${className}
      `}
    />
  )
}

export default Skeleton 