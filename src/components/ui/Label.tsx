import React from 'react';

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label: React.FC<LabelProps> = ({ children, ...props }) => {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1" {...props}>
      {children}
    </label>
  );
}; 