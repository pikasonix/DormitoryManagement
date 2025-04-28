import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

const Alert = ({
  type = 'info', // success, warning, error, info
  title,
  message,
  className = ''
}) => {
  const styles = {
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    success: 'bg-green-50 text-green-800 border-green-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200'
  }

  return (
    <div className={`p-4 rounded-md border ${styles[type]}`}>
      {title && <h3 className="text-sm font-medium mb-1">{title}</h3>}
      <p className="text-sm">{message}</p>
    </div>
  )
}

export default Alert 