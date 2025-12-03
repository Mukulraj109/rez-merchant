# Variant Image Picker - Visual Guide

## 📱 UI States Overview

```
┌─────────────────────────────────────────────────┐
│  VARIANT IMAGE PICKER - UI FLOW                 │
└─────────────────────────────────────────────────┘

STATE 1: EMPTY (No Image Selected)
┌──────────────────┐
│                  │
│    📷 image      │
│                  │
│  "Add Image"     │
│                  │
└──────────────────┘
   [Dashed Border]
   [Tap to Select]


STATE 2: UPLOADING (Image Selected, Upload in Progress)
┌──────────────────┐
│   ┌──────────┐   │
│   │          │   │  ← Image Preview
│   │  IMAGE   │   │
│   │          │   │
│   └──────────┘   │
│                  │
│  [Dark Overlay]  │
│      ⟳           │  ← Spinner
│    75%           │  ← Progress
│                  │
└──────────────────┘
   [Upload Active]
   [No Interaction]


STATE 3: UPLOADED (Upload Complete)
┌──────────────────┐
│   ┌──────────┐ ✕ │ ← Remove Button
│   │          │   │
│   │  IMAGE   │   │
│   │          │   │
│   └──────────┘   │
│   ✓ Uploaded     │ ← Success Badge
└──────────────────┘
   [Can Remove]
   [Can Tap to Change]
```

---

## 🎨 Component Breakdown

### VariantForm Component

```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Variant Image (Optional)</Text>
  <Text style={styles.sectionDescription}>
    Upload a specific image for this variant
  </Text>

  <TouchableOpacity
    style={styles.imageUploadContainer}
    onPress={handleImageSelect}
    disabled={uploadingImage}
  >
    {selectedImage ? (
      // IMAGE PREVIEW
      <View style={styles.imagePreview}>
        <Image source={{ uri: selectedImage }} />

        // UPLOAD OVERLAY (when uploading)
        {uploadingImage && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.uploadProgressText}>
              {uploadProgress}%
            </Text>
          </View>
        )}

        // REMOVE BUTTON (when not uploading)
        {!uploadingImage && (
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={handleRemoveImage}
          >
            <Ionicons name="close-circle" size={24} color="#EF4444" />
          </TouchableOpacity>
        )}

        // SUCCESS BADGE (when uploaded)
        {uploadedImageUrl && !uploadingImage && (
          <View style={styles.uploadSuccessBadge}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.uploadSuccessText}>Uploaded</Text>
          </View>
        )}
      </View>
    ) : (
      // EMPTY PLACEHOLDER
      <View style={styles.uploadPlaceholder}>
        <Ionicons name="image-outline" size={40} color="#9CA3AF" />
        <Text style={styles.uploadText}>
          {uploadingImage ? 'Uploading...' : 'Tap to upload image'}
        </Text>
      </View>
    )}
  </TouchableOpacity>
</View>
```

---

## 🔄 User Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER FLOW                            │
└─────────────────────────────────────────────────────────┘

START
  │
  ├─> Tap "Add Image" Button
  │
  ├─> System Checks Permissions
  │     │
  │     ├─> ✅ Granted → Continue
  │     │
  │     └─> ❌ Denied → Alert
  │                       │
  │                       └─> End (User must grant in settings)
  │
  ├─> Image Picker Opens
  │     │
  │     ├─> User Selects Image → Continue
  │     │
  │     └─> User Cancels → End
  │
  ├─> Image Preview Shown
  │
  ├─> Upload Starts Automatically
  │     │
  │     ├─> Show Loading Overlay
  │     │
  │     ├─> Show Progress %
  │     │
  │     └─> Disable Interaction
  │
  ├─> Upload Result
  │     │
  │     ├─> ✅ Success
  │     │     │
  │     │     ├─> Hide Loading
  │     │     │
  │     │     ├─> Show Success Badge
  │     │     │
  │     │     ├─> Show Alert "Success"
  │     │     │
  │     │     └─> Enable Remove Button
  │     │
  │     └─> ❌ Failure
  │           │
  │           ├─> Hide Loading
  │           │
  │           ├─> Show Alert "Upload Failed"
  │           │
  │           └─> Reset Image to Empty
  │
  └─> END
```

---

## 🎯 Interactive Elements

### 1. Image Upload Container
```
┌─────────────────────────────────────┐
│  TouchableOpacity                   │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   [Image or Placeholder]      │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│  Tap → handleImageSelect()          │
│  Disabled when uploading            │
└─────────────────────────────────────┘
```

### 2. Remove Button
```
┌─────────────────────┐
│  TouchableOpacity   │
│  ┌────────────────┐ │
│  │  ✕  (Icon)     │ │
│  └────────────────┘ │
│                     │
│  Tap → Confirmation │
│  Then → Remove      │
└─────────────────────┘

Confirmation Dialog:
┌──────────────────────────────┐
│  Remove Image                │
│                              │
│  Are you sure you want to    │
│  remove this image?          │
│                              │
│  [Cancel]  [Remove]          │
└──────────────────────────────┘
```

---

## 🎨 Style Hierarchy

```
Container (ScrollView)
│
└─> Form (View)
    │
    └─> Section (View)
        │
        ├─> Section Title (Text)
        │
        ├─> Section Description (Text)
        │
        └─> Image Upload Container (TouchableOpacity)
            │
            ├─> Image Preview (View) [if image selected]
            │   │
            │   ├─> Image (Image)
            │   │
            │   ├─> Upload Overlay (View) [if uploading]
            │   │   │
            │   │   ├─> Activity Indicator
            │   │   │
            │   │   └─> Progress Text
            │   │
            │   ├─> Remove Button (TouchableOpacity) [if not uploading]
            │   │   │
            │   │   └─> Close Icon
            │   │
            │   └─> Success Badge (View) [if uploaded]
            │       │
            │       ├─> Checkmark Icon
            │       │
            │       └─> "Uploaded" Text
            │
            └─> Upload Placeholder (View) [if no image]
                │
                ├─> Image Icon
                │
                └─> Placeholder Text
```

---

## 📊 State Management

```typescript
// State Variables
const [selectedImage, setSelectedImage] = useState<string | undefined>();
  // Local file URI from image picker

const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>();
  // Cloudinary URL after upload

const [uploadingImage, setUploadingImage] = useState(false);
  // Upload in progress flag

const [uploadProgress, setUploadProgress] = useState(0);
  // Upload progress percentage (0-100)


// State Transitions

Initial State:
  selectedImage = undefined
  uploadedImageUrl = undefined
  uploadingImage = false
  uploadProgress = 0

After Image Selection:
  selectedImage = "file://local/path"
  uploadingImage = true
  uploadProgress = 0

During Upload:
  uploadProgress = 25, 50, 75, etc.

Upload Success:
  uploadedImageUrl = "https://cloudinary.com/..."
  uploadingImage = false
  uploadProgress = 100

Upload Failure:
  selectedImage = undefined
  uploadingImage = false
  uploadProgress = 0

After Remove:
  selectedImage = undefined
  uploadedImageUrl = undefined
  uploadingImage = false
  uploadProgress = 0
```

---

## 🎭 Animation Timeline

```
Time: 0s
┌──────────────┐
│              │
│  📷 image    │
│              │
│  Add Image   │
│              │
└──────────────┘

Time: 0.1s (User taps)
┌──────────────┐
│              │  [Image Picker Modal Opens]
│  📷 image    │
│              │
│  Add Image   │
│              │
└──────────────┘

Time: 1s (User selects image)
┌──────────────┐
│ ┌──────────┐ │
│ │          │ │
│ │  IMAGE   │ │  [Image appears instantly]
│ │          │ │
│ └──────────┘ │
└──────────────┘

Time: 1.1s (Upload starts)
┌──────────────┐
│ ┌──────────┐ │
│ │  ▓▓▓▓▓▓  │ │  [Dark overlay fades in]
│ │    ⟳     │ │  [Spinner appears]
│ │    0%    │ │  [Progress text appears]
│ └──────────┘ │
└──────────────┘

Time: 1-3s (Uploading)
┌──────────────┐
│ ┌──────────┐ │
│ │  ▓▓▓▓▓▓  │ │
│ │    ⟳     │ │  [Spinner rotates]
│ │   45%    │ │  [Progress updates]
│ └──────────┘ │
└──────────────┘

Time: 3s (Upload complete)
┌──────────────┐
│ ┌──────────┐✕│  [Remove button fades in]
│ │          │ │
│ │  IMAGE   │ │  [Overlay fades out]
│ │          │ │
│ └──────────┘ │
│ ✓ Uploaded   │  [Success badge slides in]
└──────────────┘

Time: 3.2s (Alert shows)
┌──────────────┐
│ ┌──────────┐✕│
│ │          │ │
│ │  IMAGE   │ │
│ │          │ │
│ └──────────┘ │
│ ✓ Uploaded   │
└──────────────┘
     ↓
[Alert: Success]
```

---

## 🖼️ Layout Dimensions

### VariantForm Component
```
Image Preview:
  Width: 150px
  Height: 150px
  Border Radius: 8px

Upload Overlay:
  Position: Absolute
  Full container coverage
  Background: rgba(0, 0, 0, 0.6)

Remove Button:
  Position: Absolute
  Top: 8px
  Right: 8px
  Size: 24px

Success Badge:
  Position: Absolute
  Bottom: 8px
  Left: 8px
  Padding: 8px horizontal, 4px vertical
  Border Radius: 6px
  Background: #DCFCE7 (green-100)
```

### Add/Edit Variant Pages
```
Image Container:
  Width: 120px
  Height: 120px

Image Preview:
  Width: 120px
  Height: 120px
  Border Radius: 12px

Remove Button:
  Position: Absolute
  Top: -8px (outside image)
  Right: -8px (outside image)
  Background: White
  Border Radius: 14px
  Size: 28px
```

---

## 🎨 Color Palette

```css
/* Empty State */
Border: #E5E7EB (gray-200)
Icon: #9CA3AF (gray-400)
Text: #6B7280 (gray-500)
Background: #F9FAFB (gray-50)

/* Upload Overlay */
Background: rgba(0, 0, 0, 0.6)
Spinner: #FFFFFF
Progress Text: #FFFFFF

/* Success Badge */
Background: #DCFCE7 (green-100)
Icon: #10B981 (green-500)
Text: #16A34A (green-600)

/* Remove Button */
Background: #FFFFFF (white)
Icon: #EF4444 (red-500)
```

---

## 📏 Accessibility

```
┌────────────────────────────────────────┐
│  Accessibility Features                │
├────────────────────────────────────────┤
│  • Touch Target: 120x120 (> 44x44 min)│
│  • Visual Feedback: State changes      │
│  • Error Messages: User-friendly       │
│  • Loading Indicators: Always visible  │
│  • Confirmation Dialogs: Destructive   │
│  • Color Contrast: WCAG AA compliant   │
└────────────────────────────────────────┘
```

---

## 🔧 Debug View

### Console Logs During Upload
```
📤 Uploading variant image: file://local/path.jpg
⏱️ Upload progress: 25%
⏱️ Upload progress: 50%
⏱️ Upload progress: 75%
⏱️ Upload progress: 100%
✅ Variant image uploaded successfully: https://cloudinary.com/...
```

### State Inspector (Development)
```javascript
{
  selectedImage: "file://local/variant_123.jpg",
  uploadedImageUrl: "https://res.cloudinary.com/...",
  uploadingImage: false,
  uploadProgress: 100
}
```

---

## 📱 Platform Differences

### iOS
```
Permission Dialog:
┌────────────────────────────────┐
│  "App" Would Like to Access    │
│  Your Photos                   │
│                                │
│  We need access to upload      │
│  variant images                │
│                                │
│  [Don't Allow]  [OK]           │
└────────────────────────────────┘

Image Picker: Native iOS UI
Cropping: Native iOS crop tool
```

### Android
```
Permission Dialog:
┌────────────────────────────────┐
│  Allow "App" to access photos, │
│  media, and files on your      │
│  device?                       │
│                                │
│  [Deny]  [Allow]               │
└────────────────────────────────┘

Image Picker: Native Android UI
Cropping: Native Android crop tool
```

---

## 🎯 Touch Targets

```
Minimum Touch Target: 44x44 points (iOS HIG)

Our Implementation:
  Image Container: 120x120 ✅
  Remove Button: 28x28 (with 16px padding) = 44x44 ✅
  Upload Button: 120x120 ✅

All touch targets meet accessibility standards!
```

---

**Last Updated:** December 1, 2025
**Version:** 1.0
**Visual Guide Complete** ✅
