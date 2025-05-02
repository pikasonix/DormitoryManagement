const Card = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      {title && (
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-800">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;