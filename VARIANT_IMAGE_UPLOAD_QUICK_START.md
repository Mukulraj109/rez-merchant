# Variant Image Upload - Quick Start Guide

## 🚀 For Developers

### How It Works

```
User selects image → Upload to Cloudinary → Get URL → Submit with variant
```

### Code Locations

**Upload Service:**
```
services/api/uploads.ts → uploadImage()
```

**Add Variant:**
```
app/products/variants/add/[productId].tsx
```

**Edit Variant:**
```
app/products/variants/edit/[variantId].tsx
```

---

## 📝 Usage Example

### Uploading Image

```typescript
// Call the upload service
const result = await uploadsService.uploadImage(
  imageUri,
  `variant_${Date.now()}.jpg`
);

// Store the URL
setVariantImage(result.url);

// Show success
Alert.alert('Success', 'Image uploaded successfully');
```

### Creating Variant with Image

```typescript
const variantData = {
  name: "Red Large",
  attributes: [...],
  inventory: {...},
  images: variantImage ? [{
    url: variantImage,
    isMain: true,
    sortOrder: 0,
  }] : undefined,
};

await productsService.createVariant(productId, variantData);
```

### Updating Variant with Image

```typescript
const updateData = {
  name: "Updated Name",
  images: variantImage ? [{
    url: variantImage,
    isMain: true,
    sortOrder: 0,
  }] : undefined,
};

await productsService.updateVariant(
  variant.productId,  // Required!
  variant.id,         // Required!
  updateData
);
```

---

## ⚠️ Common Mistakes

### ❌ WRONG: Single image field
```typescript
const data = {
  image: "https://cloudinary.com/image.jpg"
};
```

### ✅ CORRECT: Images array
```typescript
const data = {
  images: [{
    url: "https://cloudinary.com/image.jpg",
    isMain: true,
    sortOrder: 0,
  }]
};
```

### ❌ WRONG: Missing productId
```typescript
await productsService.updateVariant(variantId, data);
```

### ✅ CORRECT: Include productId
```typescript
await productsService.updateVariant(productId, variantId, data);
```

---

## 🔍 API Reference

### Upload Endpoint
```
POST /api/merchant/uploads/image
Content-Type: multipart/form-data
Authorization: Bearer {token}

Returns:
{
  success: true,
  data: {
    url: "https://cloudinary.com/...",
    filename: "variant_123.jpg",
    ...
  }
}
```

### Create Variant Endpoint
```
POST /api/merchant/products/{productId}/variants
Content-Type: application/json

Body:
{
  images: [{ url, isMain, sortOrder }],
  ...
}
```

### Update Variant Endpoint
```
PUT /api/merchant/products/{productId}/variants/{variantId}
Content-Type: application/json

Body:
{
  images: [{ url, isMain, sortOrder }],
  ...
}
```

---

## 🎨 UI States

### Loading
```typescript
{uploadingImage && (
  <View style={styles.uploadOverlay}>
    <ActivityIndicator />
    <Text>Uploading...</Text>
  </View>
)}
```

### Success
```typescript
Alert.alert('Success', 'Image uploaded successfully');
```

### Error
```typescript
Alert.alert('Upload Failed', error.message);
setVariantImage(null); // Reset on error
```

---

## 🧪 Testing Commands

### Test Upload
```typescript
const testUpload = async () => {
  const uri = "file:///path/to/test.jpg";
  const result = await uploadsService.uploadImage(uri, "test.jpg");
  console.log("Uploaded:", result.url);
};
```

### Test Create
```typescript
const testCreate = async () => {
  await productsService.createVariant(productId, {
    name: "Test Variant",
    images: [{
      url: "https://test.com/image.jpg",
      isMain: true,
      sortOrder: 0,
    }],
    attributes: [],
    inventory: { quantity: 10, trackQuantity: true },
  });
};
```

---

## 📚 Type Definitions

### Upload Response
```typescript
interface UploadedFile {
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
}
```

### Variant Image
```typescript
interface VariantImage {
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  sortOrder: number;
  isMain: boolean;
}
```

---

## 🐛 Debugging

### Check Upload
```typescript
console.log('📤 Uploading:', imageUri);
console.log('✅ Uploaded:', result.url);
```

### Check Payload
```typescript
console.log('📦 Variant payload:', JSON.stringify(variantData, null, 2));
```

### Check Response
```typescript
console.log('📥 API response:', JSON.stringify(response, null, 2));
```

---

## ✅ Checklist

- [ ] Import `uploadsService` from `@/services`
- [ ] Import `productsService` from `@/services`
- [ ] Use `images` array (not `image` string)
- [ ] Include `productId` in `updateVariant` calls
- [ ] Add success alert after upload
- [ ] Handle errors with try-catch
- [ ] Show loading state during upload
- [ ] Reset image on upload failure

---

**Ready to use!** 🎉
