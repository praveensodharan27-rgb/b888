# 🖼️ How to Add Login Background Images

## Quick Steps (English)

### Step 1: Add Images to Folder
1. Copy your image files to this folder: `E:\marketplace\sellit\frontend\public\images\`
2. Supported formats: PNG, JPG, JPEG, WebP
3. Recommended size: 1920x1080 pixels or similar

### Step 2: Auto-Update (Easy Way)
Run this command in PowerShell from this folder:
```powershell
.\update-login-images.ps1
```

This will automatically:
- Scan all images in the folder
- Update `LoginModal.tsx` with all image paths
- Enable random selection

### Step 3: Manual Update (If needed)
If the script doesn't work, manually edit `frontend/components/LoginModal.tsx`:

Find this section:
```typescript
const BACKGROUND_IMAGES = [
  '/images/login-ecommerce-illustration.png',
];
```

Add your new images:
```typescript
const BACKGROUND_IMAGES = [
  '/images/login-ecommerce-illustration.png',
  '/images/your-new-image-1.png',
  '/images/your-new-image-2.jpg',
  '/images/your-new-image-3.webp',
];
```

---

## ചുരുക്കം (Malayalam)

### Step 1: Images ഇവിടെ Add ചെയ്യുക
1. നിങ്ങളുടെ image files ഈ folder-ൽ copy ചെയ്യുക: `E:\marketplace\sellit\frontend\public\images\`
2. PNG, JPG, JPEG, WebP formats support ചെയ്യും
3. Size: 1920x1080 pixels recommended

### Step 2: Auto-Update (എളുപ്പമുള്ള വഴി)
ഈ folder-ൽ നിന്ന് PowerShell-ൽ ഈ command run ചെയ്യുക:
```powershell
.\update-login-images.ps1
```

ഇത് automatically:
- Folder-ലെ എല്ലാ images scan ചെയ്യും
- `LoginModal.tsx` update ചെയ്യും
- Random selection enable ചെയ്യും

### Step 3: Manual Update (വേണമെങ്കിൽ)
Script work ചെയ്യുന്നില്ലെങ്കിൽ, manually `frontend/components/LoginModal.tsx` edit ചെയ്യുക:

ഈ section കണ്ടെത്തുക:
```typescript
const BACKGROUND_IMAGES = [
  '/images/login-ecommerce-illustration.png',
];
```

നിങ്ങളുടെ പുതിയ images add ചെയ്യുക:
```typescript
const BACKGROUND_IMAGES = [
  '/images/login-ecommerce-illustration.png',
  '/images/your-new-image-1.png',
  '/images/your-new-image-2.jpg',
];
```

---

## 📂 Current Folder Location
```
E:\marketplace\sellit\frontend\public\images\
```

## 🎨 Where to Find Free Images?

1. **Unsplash** - https://unsplash.com/s/photos/e-commerce
   - High quality, free to use
   - Search: "online shopping", "e-commerce", "marketplace"

2. **Pexels** - https://www.pexels.com/search/online-shopping/
   - Free stock photos
   - No attribution required

3. **Pixabay** - https://pixabay.com/
   - Free images and vectors
   - Search: "shopping illustration", "e-commerce vector"

4. **Freepik** - https://www.freepik.com/
   - Free vectors (attribution required)
   - Great for illustrations

5. **Iconscout** - https://iconscout.com/illustrations/e-commerce
   - Free and premium illustrations
   - Vector graphics

## 🔍 Good Search Terms
- "e-commerce illustration"
- "online shopping vector"
- "marketplace graphic"
- "digital shopping"
- "mobile commerce"
- "online store illustration"
- "shopping cart illustration"
- "delivery service illustration"

## ✅ Image Requirements
- **Format**: PNG, JPG, JPEG, or WebP
- **Size**: 1920x1080 or 1600x900 pixels (landscape)
- **File Size**: Under 200KB for fast loading
- **Theme**: E-commerce, shopping, marketplace, online store
- **Style**: Vector illustrations, modern graphics, or photos

## 🚀 After Adding Images
1. Restart your development server if it's running
2. Open the login modal to see random images
3. Each time the modal opens, a different image will show

---

**Need Help?** Check the README.md file in this folder for more details.
