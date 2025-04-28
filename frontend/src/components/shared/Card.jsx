const Card = ({ children, className = '' }) => {
  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      {children}
    </div>
  );
};

export default Card; 