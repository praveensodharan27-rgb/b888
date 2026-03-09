# Login Modal Background Images

This folder contains background images used in the login modal.

## Current Images

- `login-ecommerce-illustration.png` - E-commerce shopping illustration with mobile device

## How to Add More Images

1. **Add your image files** to this folder (`frontend/public/images/`)
   - Supported formats: PNG, JPG, JPEG, WebP
   - Recommended size: 1920x1080 or similar aspect ratio
   - File size: Keep under 200KB for fast loading

2. **Update the LoginModal component** (`frontend/components/LoginModal.tsx`)
   - Find the `BACKGROUND_IMAGES` array
   - Add your new image path like: `'/images/your-image-name.png'`

3. **Example:**
   ```typescript
   const BACKGROUND_IMAGES = [
     '/images/login-ecommerce-illustration.png',
     '/images/login-bg-2.png',
     '/images/login-bg-3.png',
     // Add more images here
   ];
   ```

## Image Requirements

- **Theme**: E-commerce, marketplace, shopping, online store
- **Style**: Vector illustrations work best
- **Colors**: Any colors work - a dark overlay is applied automatically
- **Orientation**: Landscape (horizontal) format preferred

## Random Selection

The login modal will randomly select one image from the array each time it opens, providing variety for returning users.

## Free Image Resources

- Unsplash: https://unsplash.com/s/photos/e-commerce
- Pexels: https://www.pexels.com/search/online-shopping/
- Iconscout: https://iconscout.com/illustrations/e-commerce
- Freepik: https://www.freepik.com/search?format=search&query=e-commerce+illustration
