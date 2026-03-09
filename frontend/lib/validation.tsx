// Centralized Validation Utilities for SellIt Platform

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (Indian format)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

// Password validation
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Name validation
export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

// Price validation
export const validatePrice = (price: number | string): boolean => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return !isNaN(numPrice) && numPrice > 0 && numPrice <= 100000000;
};

// Title validation
export const validateTitle = (title: string): boolean => {
  return title.trim().length >= 5 && title.trim().length <= 200;
};

// Description validation
export const validateDescription = (description: string): boolean => {
  return description.trim().length >= 20 && description.trim().length <= 5000;
};

// OTP validation
export const validateOTP = (otp: string): boolean => {
  return /^\d{6}$/.test(otp);
};

// URL validation
export const validateURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Image file validation
export const validateImageFile = (file: File): {
  isValid: boolean;
  error?: string;
} => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPEG, PNG, and WebP images are allowed'
    };
  }
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 10MB'
    };
  }
  
  return { isValid: true };
};

// Validation error messages
export const validationMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid 10-digit phone number',
  password: {
    required: 'Password is required',
    minLength: 'Password must be at least 8 characters',
    strong: 'Password must contain uppercase, lowercase, number, and special character'
  },
  name: {
    required: 'Name is required',
    minLength: 'Name must be at least 2 characters',
    maxLength: 'Name must not exceed 100 characters'
  },
  title: {
    required: 'Title is required',
    minLength: 'Title must be at least 5 characters',
    maxLength: 'Title must not exceed 200 characters'
  },
  description: {
    required: 'Description is required',
    minLength: 'Description must be at least 20 characters',
    maxLength: 'Description must not exceed 5000 characters'
  },
  price: {
    required: 'Price is required',
    positive: 'Price must be greater than 0',
    max: 'Price must not exceed ₹10,00,00,000'
  },
  category: 'Please select a category',
  subcategory: 'Please select a subcategory',
  location: 'Please select a location',
  images: {
    required: 'At least one image is required',
    maxCount: 'Maximum 12 images allowed',
    maxSize: 'Image size must be less than 10MB',
    type: 'Only JPEG, PNG, and WebP images are allowed'
  },
  otp: {
    required: 'OTP is required',
    length: 'OTP must be 6 digits'
  },
  terms: 'You must accept the terms and conditions',
  matchPassword: 'Passwords must match'
};

// React Hook Form validation rules
export const validationRules = {
  name: {
    required: validationMessages.name.required,
    minLength: {
      value: 2,
      message: validationMessages.name.minLength
    },
    maxLength: {
      value: 100,
      message: validationMessages.name.maxLength
    },
    pattern: {
      value: /^[a-zA-Z\s]+$/,
      message: 'Name can only contain letters and spaces'
    }
  },
  email: {
    required: validationMessages.required,
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: validationMessages.email
    }
  },
  phone: {
    required: validationMessages.required,
    pattern: {
      value: /^[6-9]\d{9}$/,
      message: validationMessages.phone
    }
  },
  password: {
    required: validationMessages.password.required,
    minLength: {
      value: 8,
      message: validationMessages.password.minLength
    },
    validate: (value: string) => {
      const result = validatePassword(value);
      return result.isValid || result.errors[0];
    }
  },
  title: {
    required: validationMessages.title.required,
    minLength: {
      value: 5,
      message: validationMessages.title.minLength
    },
    maxLength: {
      value: 200,
      message: validationMessages.title.maxLength
    }
  },
  description: {
    required: validationMessages.description.required,
    minLength: {
      value: 20,
      message: validationMessages.description.minLength
    },
    maxLength: {
      value: 5000,
      message: validationMessages.description.maxLength
    }
  },
  price: {
    required: validationMessages.price.required,
    min: {
      value: 1,
      message: validationMessages.price.positive
    },
    max: {
      value: 100000000,
      message: validationMessages.price.max
    }
  },
  category: {
    required: validationMessages.category
  },
  subcategory: {
    required: 'Please select a subcategory'
  },
  otp: {
    required: validationMessages.otp.required,
    pattern: {
      value: /^\d{6}$/,
      message: validationMessages.otp.length
    }
  }
};

// Custom validation helpers
export const validators = {
  // Either email or phone required
  emailOrPhone: (email?: string, phone?: string) => {
    if (!email && !phone) {
      return 'Either email or phone number is required';
    }
    if (email && !validateEmail(email)) {
      return validationMessages.email;
    }
    if (phone && !validatePhone(phone)) {
      return validationMessages.phone;
    }
    return true;
  },
  
  // Confirm password
  confirmPassword: (password: string, confirmPassword: string) => {
    return password === confirmPassword || validationMessages.matchPassword;
  },
  
  // Image files validation
  imageFiles: (files: File[]) => {
    if (files.length === 0) {
      return validationMessages.images.required;
    }
    if (files.length > 12) {
      return validationMessages.images.maxCount;
    }
    for (const file of files) {
      const result = validateImageFile(file);
      if (!result.isValid) {
        return result.error;
      }
    }
    return true;
  }
};

// Form validation helpers
export const showValidationError = (error: string | undefined) => {
  if (!error) return null;
  return (
    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {error}
    </p>
  );
};

// Input class names with validation state
export const getInputClassName = (hasError: boolean, baseClassName?: string) => {
  const base = baseClassName || 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2';
  const errorClass = hasError 
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500';
  return `${base} ${errorClass}`;
};

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

// Validate and sanitize form data
export const sanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...data } as Record<string, unknown>;
  
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key] as string);
    }
  });
  
  return sanitized as T;
};

export default {
  validateEmail,
  validatePhone,
  validatePassword,
  validateName,
  validatePrice,
  validateTitle,
  validateDescription,
  validateOTP,
  validateURL,
  validateImageFile,
  validationMessages,
  validationRules,
  validators,
  showValidationError,
  getInputClassName,
  sanitizeInput,
  sanitizeFormData
};

