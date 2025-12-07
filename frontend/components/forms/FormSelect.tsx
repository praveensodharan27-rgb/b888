import React from 'react';
import { UseFormRegister, FieldError } from 'react-hook-form';
import { getInputClassName, showValidationError } from '@/lib/validation';

interface FormSelectProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  register: UseFormRegister<any>;
  error?: FieldError;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
  className?: string;
}

export default function FormSelect({
  name,
  label,
  options,
  register,
  error,
  required = false,
  disabled = false,
  placeholder = 'Select...',
  helpText,
  className
}: FormSelectProps) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={name}
        disabled={disabled}
        {...register(name)}
        className={getInputClassName(!!error)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && showValidationError(error.message)}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
    </div>
  );
}

