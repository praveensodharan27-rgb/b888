# ⚡ Validation System - Quick Reference

## 🚀 Import

```typescript
// Form Components
import { FormInput, FormTextarea, FormSelect } from '@/components/forms';

// Validation Utilities
import { validationRules, sanitizeFormData, validators } from '@/lib/validation';
```

## 📝 Basic Usage

### Input Field
```typescript
<FormInput
  name="email"
  label="Email"
  type="email"
  register={register}
  error={errors.email}
  required
/>
```

### Textarea
```typescript
<FormTextarea
  name="description"
  label="Description"
  register={register}
  error={errors.description}
  rows={6}
  maxLength={5000}
  showCharCount
  watch={() => watch('description')}
/>
```

### Select
```typescript
<FormSelect
  name="category"
  label="Category"
  options={[
    { value: 'electronics', label: 'Electronics' }
  ]}
  register={register}
  error={errors.category}
/>
```

## 🛡️ Validation Rules

```typescript
// Apply validation rules
<input {...register('email', validationRules.email)} />
<input {...register('password', validationRules.password)} />
<input {...register('phone', validationRules.phone)} />
<input {...register('name', validationRules.name)} />
<input {...register('title', validationRules.title)} />
<input {...register('description', validationRules.description)} />
<input {...register('price', validationRules.price)} />
<input {...register('otp', validationRules.otp)} />
```

## 🔒 Sanitization

```typescript
// Sanitize form data before submission
const onSubmit = (data) => {
  const cleanData = sanitizeFormData(data);
  // Use cleanData
};
```

## ✅ Custom Validators

```typescript
// Email or Phone required
validators.emailOrPhone(email, phone)

// Confirm password
validators.confirmPassword(password, confirmPassword)

// Image files
validators.imageFiles(files)
```

## 📏 Validation Limits

| Field | Min | Max |
|-------|-----|-----|
| Name | 2 | 100 |
| Email | - | - |
| Phone | 10 | 10 |
| Password | 8 | - |
| Title | 5 | 200 |
| Description | 20 | 5000 |
| Price | 1 | 10cr |
| OTP | 6 | 6 |
| Images | 1 | 12 |

## 🎨 Props Reference

### FormInput
```typescript
name: string           // Field name
label: string          // Label text
type?: string          // Input type
register: Function     // React Hook Form register
error?: FieldError     // Error object
required?: boolean     // Required indicator
disabled?: boolean     // Disabled state
placeholder?: string   // Placeholder text
icon?: ReactNode       // Left icon
helpText?: string      // Help text below
```

### FormTextarea
```typescript
name: string
label: string
register: Function
error?: FieldError
rows?: number          // Number of rows
maxLength?: number     // Max characters
showCharCount?: boolean // Show counter
watch?: Function       // Watch function for counter
```

### FormSelect
```typescript
name: string
label: string
options: Array<{value, label}>
register: Function
error?: FieldError
placeholder?: string
```

## 🔥 Quick Examples

### Login Form
```typescript
<FormInput name="email" label="Email" type="email" register={register} error={errors.email} required />
<FormInput name="password" label="Password" type="password" register={register} error={errors.password} required />
```

### Register Form
```typescript
<FormInput name="name" label="Name" register={register} error={errors.name} required />
<FormInput name="email" label="Email" type="email" register={register} error={errors.email} />
<FormInput name="phone" label="Phone" type="tel" register={register} error={errors.phone} />
<FormInput name="password" label="Password" type="password" register={register} error={errors.password} required />
```

### Post Ad Form
```typescript
<FormInput name="title" label="Title" register={register} error={errors.title} required />
<FormTextarea name="description" label="Description" register={register} error={errors.description} required showCharCount maxLength={5000} />
<FormInput name="price" label="Price" type="number" register={register} error={errors.price} required />
<FormSelect name="category" label="Category" options={categories} register={register} error={errors.category} required />
```

---

**📚 Full Docs**: See `VALIDATION_SYSTEM.md`  
**✅ Status**: Ready to use!

