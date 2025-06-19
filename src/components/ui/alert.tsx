import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({ 
  children, 
  variant = 'default', 
  className = '' 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'default':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      case 'success':
        return 'bg-green-50 text-green-900 border-green-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-900 border-yellow-200';
      case 'error':
        return 'bg-red-50 text-red-900 border-red-200';
      default:
        return 'bg-blue-50 text-blue-900 border-blue-200';
    }
  };

  return (
    <div 
      className={`border rounded-lg p-4 ${getVariantClasses()} ${className}`}
      role="alert"
    >
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  );
}; 