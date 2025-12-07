# ✅ Validation System - Complete Guide

## 🎯 Overview

A comprehensive, centralized validation system has been implemented across the entire SellIt platform. All forms now use standardized validation with consistent error messages and user feedback.

## 📁 Files Created

### Core Validation Library
- **`frontend/lib/validation.ts`** - Central validation utilities, rules, and helpers

### Reusable Form Components
- **`frontend/components/forms/FormInput.tsx`** - Input field with built-in validation
- **`frontend/components/forms/FormTextarea.tsx`** - Textarea with character count & validation
- **`frontend/components/forms/FormSelect.tsx`** - Select dropdown with validation
- **`frontend/components/forms/index.ts`** - Components export

## 🚀 Features

### ✅ Validation Functions
-  Email validation (RFC-compliant regex)
- ✅ Phone validation (Indian 10-digit format)
- ✅ Password validation (strength requirements)
- ✅ Name validation (2-100 characters, letters only)
- ✅ Price validation (positive, max 10 crore)
- ✅ Title validation (5-200 characters)
- ✅ Description validation (20-5000 characters)
- ✅ OTP validation (6 digits)
- ✅ URL validation
- ✅ Image file validation (type & size)

### ✅ React Hook Form Integration
- Pre-configured validation rules for all field types
- Custom validators for complex scenarios
- Error message constants
- Input class names based on validation state

### ✅ Security Features
- XSS protection (script tag removal)
- Input sanitization
- Event handler stripping
- Form data sanitization

### ✅ UI Components
- Automatic error message display
- Visual error indicators (red borders, icons)
- Character counters for text fields
- Help text support
- Required field indicators
- Icon support for inputs

## 📖 Usage Examples

### Basic Input with Validation

```typescript
import { useForm } from 'react-hook-form';
import { FormInput } from '@/components/forms';
import { validationRules } from '@/lib/validation';

export default function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormInput
        name="email"
        label="Email Address"
        type="email"
        register={register}
        error={errors.email}
        required
        placeholder="you@example.com"
      />
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

### Textarea with Character Count

```typescript
<FormTextarea
  name="description"
  label="Description"
  register={register}
  error={errors.description}
  required
  rows={6}
  maxLength={5000}
  showCharCount
  watch={() => watch('description')}
  helpText="Provide detailed information about your product"
/>
```

### Select Dropdown

```typescript
<FormSelect
  name="category"
  label="Category"
  options={[
    { value: 'electronics', label: 'Electronics' },
    { value: 'furniture', label: 'Furniture' }
  ]}
  register={register}
  error={errors.category}
  required
  placeholder="Select a category"
/>
```

### Using Validation Rules

```typescript
import { validationRules } from '@/lib/validation';

const { register } = useForm();

// Email field
<input {...register('email', validationRules.email)} />

// Password field
<input {...register('password', validationRules.password)} />

// Title field
<input {...register('title', validationRules.title)} />

// Price field
<input {...register('price', validationRules.price)} />
```

### Custom Validation

```typescript
import { validators } from '@/lib/validation';

<input 
  {...register('confirmPassword', {
    validate: (value) => validators.confirmPassword(
      watch('password'),
      value
    )
  })}
/>
```

### Manual Validation

```typescript
import { validateEmail, validatePhone, validatePassword } from '@/lib/validation';

// Validate email
if (!validateEmail(email)) {
  setError('Invalid email format');
}

// Validate phone
if (!validatePhone(phone)) {
  setError('Invalid phone number');
}

// Validate password (returns errors array)
const result = validatePassword(password);
if (!result.isValid) {
  setErrors(result.errors);
}
```

### Sanitizing User Input

```typescript
import { sanitizeInput, sanitizeFormData } from '@/lib/validation';

// Sanitize single input
const cleanInput = sanitizeInput(userInput);

// Sanitize entire form
const cleanData = sanitizeFormData(formData);
```

### Custom Input Styling

```typescript
import { getInputClassName } from '@/lib/validation';

<input 
  className={getInputClassName(!!errors.email)}
  {...register('email')}
/>
```

## 🎨 Validation Rules Reference

### Name Validation
- **Min Length**: 2 characters
- **Max Length**: 100 characters
- **Pattern**: Letters and spaces only
- **Message**: "Name must be at least 2 characters"

### Email Validation
- **Pattern**: RFC-compliant email regex
- **Message**: "Please enter a valid email address"

### Phone Validation
- **Pattern**: Indian 10-digit format starting with 6-9
- **Message**: "Please enter a valid 10-digit phone number"

### Password Validation
- **Min Length**: 8 characters
- **Requirements**:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- **Message**: Specific requirement that failed

### Title Validation
- **Min Length**: 5 characters
- **Max Length**: 200 characters
- **Message**: "Title must be at least 5 characters"

### Description Validation
- **Min Length**: 20 characters
- **Max Length**: 5000 characters
- **Message**: "Description must be at least 20 characters"

### Price Validation
- **Min**: 1
- **Max**: 100,000,000 (10 crore)
- **Message**: "Price must be greater than 0"

### OTP Validation
- **Pattern**: Exactly 6 digits
- **Message**: "OTP must be 6 digits"

### Image Validation
- **Types**: JPEG, JPG, PNG, WebP
- **Max Size**: 10MB per file
- **Max Count**: 12 images
- **Message**: Type or size specific error

## 🛡️ Security Features

### XSS Protection
```typescript
// Automatically removes:
- <script> tags
- javascript: protocol
- Event handlers (onclick, onload, etc.)
```

### Input Sanitization
```typescript
// All inputs are:
- Trimmed
- XSS filtered
- Special characters escaped
```

## 📝 Error Messages

All error messages are centralized in `validationMessages` object:

```typescript
import { validationMessages } from '@/lib/validation';

// Access messages
validationMessages.required // "This field is required"
validationMessages.email // "Please enter a valid email address"
validationMessages.password.minLength // "Password must be at least 8 characters"
```

## 🎯 Best Practices

### 1. Always Use Validation Rules
```typescript
// ✅ Good
<input {...register('email', validationRules.email)} />

// ❌ Bad
<input {...register('email')} />
```

### 2. Show Clear Error Messages
```typescript
// ✅ Good
{errors.email && showValidationError(errors.email.message)}

// ❌ Bad
{errors.email && <span>Error</span>}
```

### 3. Sanitize User Input
```typescript
// ✅ Good
const onSubmit = (data) => {
  const cleanData = sanitizeFormData(data);
  // Process cleanData
};

// ❌ Bad
const onSubmit = (data) => {
  // Directly use data without sanitization
};
```

### 4. Use Form Components
```typescript
// ✅ Good
<FormInput
  name="email"
  label="Email"
  register={register}
  error={errors.email}
/>

// ❌ Bad (repetitive code)
<div>
  <label>Email</label>
  <input {...register('email')} />
  {errors.email && <span>{errors.email.message}</span>}
</div>
```

### 5. Provide Helpful Text
```typescript
<FormInput
  name="password"
  label="Password"
  helpText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
  register={register}
  error={errors.password}
/>
```

## 🔄 Migration Guide

### Before (Old Code)
```typescript
<input 
  type="email" 
  {...register('email', { required: true })}
/>
{errors.email && <span>This field is required</span>}
```

### After (New Code)
```typescript
<FormInput
  name="email"
  label="Email Address"
  type="email"
  register={register}
  error={errors.email}
  required
/>
```

## 📊 Forms Updated

The following forms have been updated with the new validation system:

- ✅ Login Page (`app/login/page.tsx`)
- ✅ Register Page (`app/register/page.tsx`)
- ✅ Profile Page (`app/profile/page.tsx`)
- ✅ Post Ad Page (`app/post-ad/page.tsx`)
- ✅ Edit Ad Page (`app/edit-ad/[id]/page.tsx`)
- ✅ Admin Panels (All admin forms)
- ✅ Search Alerts Admin (`app/admin/search-alerts/page.tsx`)

## 🧪 Testing Validation

### Test Cases

**Email Validation**
- ✅ Valid: "user@example.com"
- ❌ Invalid: "user@", "@example.com", "user.com"

**Phone Validation**
- ✅ Valid: "9876543210", "8765432109"
- ❌ Invalid: "1234567890", "98765", "abcdefghij"

**Password Validation**
- ✅ Valid: "MyPass123!", "Secure@2024"
- ❌ Invalid: "password", "12345678", "PASSWORD"

**Price Validation**
- ✅ Valid: 100, 50000, 1000000
- ❌ Invalid: 0, -100, 150000000

## 🐛 Troubleshooting

### Error Messages Not Showing

**Check:**
1. Form component is receiving `error` prop
2. `formState: { errors }` is destructured from `useForm`
3. Field name matches `register` name

**Solution:**
```typescript
const { register, formState: { errors } } = useForm();

<FormInput
  name="email"
  register={register}
  error={errors.email} // Make sure this matches
/>
```

### Validation Not Triggering

**Check:**
1. Validation rules are applied
2. Form submission uses `handleSubmit`
3. Mode is set (default: "onSubmit")

**Solution:**
```typescript
const { register, handleSubmit } = useForm({
  mode: 'onBlur' // Validate on blur
});

<form onSubmit={handleSubmit(onSubmit)}>
```

### Styled Inputs Not Working

**Check:**
1. Tailwind CSS is configured
2. Classes are not purged
3. Custom className is passed correctly

**Solution:**
```typescript
<FormInput
  className="mb-4" // Custom spacing
  name="email"
  ...
/>
```

## 📚 API Reference

### Validation Functions

```typescript
validateEmail(email: string): boolean
validatePhone(phone: string): boolean
validatePassword(password: string): { isValid: boolean; errors: string[] }
validateName(name: string): boolean
validatePrice(price: number | string): boolean
validateTitle(title: string): boolean
validateDescription(description: string): boolean
validateOTP(otp: string): boolean
validateURL(url: string): boolean
validateImageFile(file: File): { isValid: boolean; error?: string }
```

### Helper Functions

```typescript
sanitizeInput(input: string): string
sanitizeFormData<T>(data: T): T
getInputClassName(hasError: boolean, baseClassName?: string): string
showValidationError(error: string | undefined): JSX.Element | null
```

### Validators Object

```typescript
validators.emailOrPhone(email?: string, phone?: string): string | true
validators.confirmPassword(password: string, confirmPassword: string): string | true
validators.imageFiles(files: File[]): string | true
```

## 🎉 Benefits

1. **Consistency**: Same validation rules across all forms
2. **Reusability**: Form components reduce code duplication
3. **Security**: Built-in XSS protection and sanitization
4. **UX**: Clear error messages and visual feedback
5. **Maintainability**: Centralized validation logic
6. **Accessibility**: Proper labels and error associations
7. **Performance**: Optimized validation functions
8. **Type Safety**: Full TypeScript support

## 📞 Support

For issues or questions:
- Check this documentation
- Review example usage in existing forms
- Test with provided test cases

---

**Status**: ✅ **FULLY IMPLEMENTED**  
**Version**: 1.0.0  
**Last Updated**: December 3, 2024

