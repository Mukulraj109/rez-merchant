# Variant Image Picker - Quick Reference

## 📸 Overview
Image picker and upload functionality for product variant forms.

---

## 🚀 Quick Start

### For Developers Using VariantForm Component

```tsx
import VariantForm from '@/components/products/VariantForm';

<VariantForm
  variant={existingVariant}  // Optional
  baseProductSku="PROD-123"
  onSubmit={(data) => {
    console.log('Uploaded image URL:', data.image);
    // data.image contains the Cloudinary URL
  }}
/>
```

---

## 🔧 Implementation Details

### Image Upload Flow
```
User Taps → Permission Check → Image Picker → Upload → Success
                    ↓                              ↓
              Permission Denied               Upload Failed
                    ↓                              ↓
                 Alert                         Alert + Reset
```

### Key Functions

#### VariantForm.tsx
```typescript
handleImageSelect()      // Opens image picker
uploadImage()           // Uploads to Cloudinary
handleRemoveImage()     // Removes with confirmation
```

#### Add/Edit Variant Pages
```typescript
handlePickImage()       // Opens picker + uploads
uploadVariantImage()    // Handles upload
```

---

## 📦 Service Integration

### Upload Service Usage
```typescript
import { uploadsService } from '@/services';

// Basic upload
const result = await uploadsService.uploadImage(
  imageUri,
  'variant_123.jpg'
);
console.log(result.url); // Cloudinary URL

// Upload with progress
const result = await uploadsService.uploadImageWithProgress(
  imageUri,
  'variant_123.jpg',
  (progress) => console.log(progress + '%')
);
```

---

## 🎨 UI States

### Loading State
```tsx
{uploadingImage && (
  <View style={styles.uploadOverlay}>
    <ActivityIndicator />
    <Text>{uploadProgress}%</Text>
  </View>
)}
```

### Success State
```tsx
{uploadedImageUrl && (
  <View style={styles.uploadSuccessBadge}>
    <Icon name="checkmark-circle" />
    <Text>Uploaded</Text>
  </View>
)}
```

### Error State
```typescript
Alert.alert(
  'Upload Failed',
  error.message || 'Failed to upload image'
);
// Image automatically reset
```

---

## 🔐 Permissions

### Request Permissions
```typescript
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

if (status !== 'granted') {
  Alert.alert('Permission Required', 'Please grant camera roll permissions');
  return;
}
```

### iOS Configuration
Add to `app.json`:
```json
{
  "ios": {
    "infoPlist": {
      "NSPhotoLibraryUsageDescription": "We need access to your photo library to upload variant images"
    }
  }
}
```

### Android Configuration
Add to `app.json`:
```json
{
  "android": {
    "permissions": [
      "READ_EXTERNAL_STORAGE"
    ]
  }
}
```

---

## 🐛 Troubleshooting

### Image Not Uploading
1. Check network connection
2. Verify auth token in AsyncStorage
3. Check backend endpoint status
4. Review console logs for errors

### Permission Denied
1. Check app.json configuration
2. Reinstall app after config changes
3. Check device settings

### Upload Fails Silently
1. Check console for error logs
2. Verify uploadsService is imported
3. Check backend upload endpoint
4. Verify Cloudinary configuration

---

## 📊 Backend Endpoint

### POST /api/merchant/uploads/image

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
```
image: <file>
type: 'general' (optional)
```

**Response:**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "filename": "variant_123.jpg",
    "size": 12345,
    "mimeType": "image/jpeg"
  }
}
```

---

## ✅ Testing Checklist

- [ ] Image picker opens
- [ ] Permissions requested
- [ ] Image preview shown
- [ ] Upload starts automatically
- [ ] Progress indicator visible
- [ ] Success badge appears
- [ ] Remove button works
- [ ] Form includes uploaded URL
- [ ] Error handling works
- [ ] Network error handled

---

## 🔗 Related Files

**Components:**
- `components/products/VariantForm.tsx`
- `components/products/ImageUploader.tsx`

**Pages:**
- `app/products/variants/add/[productId].tsx`
- `app/products/variants/edit/[variantId].tsx`

**Services:**
- `services/api/uploads.ts`
- `services/index.ts`

---

## 💡 Tips

1. **Always await uploads** - Don't submit form until upload completes
2. **Handle errors gracefully** - Show user-friendly messages
3. **Test on real devices** - Permissions work differently on simulators
4. **Use proper image sizes** - Keep under 5MB for best performance
5. **Provide feedback** - Users should know upload is happening

---

## 📝 Code Snippets

### Basic Implementation
```tsx
const [variantImage, setVariantImage] = useState<string | null>(null);
const [uploadingImage, setUploadingImage] = useState(false);

const handlePickImage = async () => {
  // Request permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please grant permissions');
    return;
  }

  // Pick image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) return;

  // Upload image
  setUploadingImage(true);
  try {
    const uploaded = await uploadsService.uploadImage(
      result.assets[0].uri,
      `variant_${Date.now()}.jpg`
    );
    setVariantImage(uploaded.url);
    Alert.alert('Success', 'Image uploaded');
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setUploadingImage(false);
  }
};
```

---

## 🚨 Common Issues

### Issue: "Permission denied"
**Solution:** Check app.json permissions, reinstall app

### Issue: "Upload timeout"
**Solution:** Check network, increase timeout in uploadsService

### Issue: "Invalid token"
**Solution:** Verify auth token in AsyncStorage

### Issue: "Image too large"
**Solution:** Reduce quality or compress before upload

---

## 📚 Additional Resources

- [Expo ImagePicker Docs](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [React Native Image Upload Guide](https://reactnative.dev/docs/images)
- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_images)

---

**Last Updated:** December 1, 2025
**Version:** 1.0
**Status:** Production Ready ✅
