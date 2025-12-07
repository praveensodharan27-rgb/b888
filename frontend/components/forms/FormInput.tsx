import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import { getInputClassName, showValidationError } from '@/lib/validation';

interface FormInputProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  icon?: React.ReactNode;
  helpText?: string;
  className?: string;
}

export default function FormInput({
  name,
  label,
  type = 'text',
  placeholder,
  register,
  error,
  required = false,
  disabled = false,
  autoComplete,
  icon,
  helpText,
  className
}: FormInputProps) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          id={name}
          type={type}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          {...register(name)}
          className={getInputClassName(!!error, icon ? 'pl-10' : '')}
        />
      </div>
      {error && showValidationError(error.message)}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
}

