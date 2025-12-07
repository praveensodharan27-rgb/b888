import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import { getInputClassName, showValidationError } from '@/lib/validation';

interface FormTextareaProps {
  name: string;
  label: string;
  placeholder?: string;
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  helpText?: string;
  className?: string;
  showCharCount?: boolean;
  watch?: () => string;
}

export default function FormTextarea({
  name,
  label,
  placeholder,
  register,
  error,
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
  helpText,
  className,
  showCharCount = false,
  watch
}: FormTextareaProps) {
  const value = watch?.() || '';
  const charCount = value.length;
  
  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-1">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {showCharCount && maxLength && (
          <span className={`text-xs ${charCount > maxLength ? 'text-red-600' : 'text-gray-500'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={name}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        {...register(name)}
        className={getInputClassName(!!error)}
      />
      {error && showValidationError(error.message)}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
}

