import React, { useEffect } from 'react';

const Toast = ({ message, type = 'error', onClose, duration = 5000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className={`fixed top-4 right-4 ${getToastStyles()} px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm transition-all duration-300 ease-in-out`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-white hover:text-gray-200 transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast; 