import React from 'react';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select: React.FC<SelectProps> = ({ children, ...props }) => {
  return (
    <select
      className="w-full p-2 border rounded-md shadow-sm bg-white focus:border-indigo-500 focus:ring-indigo-500"
      {...props}
    >
      {children}
    </select>
  );
}; 