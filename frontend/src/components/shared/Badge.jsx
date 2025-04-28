import React from 'react';

const Badge = ({ children, color = 'gray', className = '', ...props }) => {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-600 ring-gray-500/10',
    red: 'bg-red-100 text-red-700 ring-red-600/10',
    yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
    green: 'bg-green-100 text-green-700 ring-green-600/20',
    blue: 'bg-blue-100 text-blue-700 ring-blue-700/10',
    indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-700/10',
    purple: 'bg-purple-100 text-purple-700 ring-purple-700/10',
    pink: 'bg-pink-100 text-pink-700 ring-pink-700/10',
  };

  const badgeColor = colorClasses[color] || colorClasses.gray;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeColor} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;