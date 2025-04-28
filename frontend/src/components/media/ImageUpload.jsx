import { useRef, useState } from 'react'

const FileUpload = ({
  label,
  name,
  accept,
  multiple = false,
  required = false,
  maxSize = 10, // MB
  onChange,
  help,
  error
}) => {
  const fileInputRef = useRef(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [fileError, setFileError] = useState(null)

  const validateFile = (file) => {
    const sizeInMB = file.size / (1024 * 1024)
    if (sizeInMB > maxSize) {
      return `Tệp ${file.name} quá lớn. Tối đa ${maxSize}MB`;
    }
    return null;
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleChange = (e) => {
    const files = Array.from(e.target.files || [])
    let hasError = false;

    // Xác thực từng tệp
    for (const file of files) {
      const error = validateFile(file)
      if (error) {
        setFileError(error)
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      setFileError(null)
      setSelectedFiles(files)
      onChange(e)
    } else {
      // Đặt lại input nếu có lỗi
      e.target.value = ''
      setSelectedFiles([])
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)

    // Xác thực tệp được kéo thả
    let hasError = false;
    for (const file of droppedFiles) {
      const error = validateFile(file)
      if (error) {
        setFileError(error)
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      setFileError(null)

      // Cập nhật giá trị input tệp
      const dataTransfer = new DataTransfer()
      droppedFiles.forEach(file => dataTransfer.items.add(file))
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files
      }

      setSelectedFiles(droppedFiles)

      // Kích hoạt onChange
      const event = {
        target: {
          name,
          files: droppedFiles
        }
      }
      onChange(event)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 
          hover:border-indigo-500 transition-colors cursor-pointer
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          name={name}
          accept={accept}
          multiple={multiple}
          required={required && selectedFiles.length === 0}
          onChange={handleChange}
          className="sr-only" // Sử dụng sr-only thay vì hidden
          aria-label={label}
        />

        <div className="text-center">
          {selectedFiles.length > 0 ? (
            <div className="space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="text-sm text-gray-600">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-indigo-600 hover:text-indigo-500">
                  Tải lên tệp
                </span>
                {" hoặc kéo và thả"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {accept?.split(',').join(', ')} tối đa 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {help && !error && (
        <p className="text-sm text-gray-500">{help}</p>
      )}

      {(error || fileError) && (
        <p className="text-sm text-red-600">{error || fileError}</p>
      )}
    </div>
  )
}

export default FileUpload 