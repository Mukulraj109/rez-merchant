import { apiClient } from './index';

export interface ProductGalleryItem {
  id: string;
  url: string;
  type: 'image'; // Images only (no videos)
  category: 'main' | 'variant' | 'lifestyle' | 'details' | 'packaging' | 'general';
  title?: string;
  description?: string;
  variantId?: string; // Optional link to product variant
  tags?: string[];
  order: number;
  isVisible: boolean;
  isCover: boolean;
  views: number;
  likes: number;
  shares: number;
  uploadedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductGalleryCategory {
  name: string;
  count: number;
  coverImage?: string;
}

export interface ProductGalleryResponse {
  items: ProductGalleryItem[];
  categories?: ProductGalleryCategory[];
  total: number;
  limit: number;
  offset: number;
}

export interface UploadProductGalleryItemData {
  category: 'main' | 'variant' | 'lifestyle' | 'details' | 'packaging' | 'general';
  title?: string;
  description?: string;
  variantId?: string;
  tags?: string[];
  order?: number;
  isVisible?: boolean;
  isCover?: boolean;
}

export interface BulkUploadProductData {
  category: 'main' | 'variant' | 'lifestyle' | 'details' | 'packaging' | 'general';
  title?: string; // Single title to apply to all items
  titles?: string[]; // Per-item titles (optional, overrides title if provided)
  description?: string;
  variantId?: string;
  tags?: string[];
  isVisible?: boolean;
  isCover?: boolean;
}

export interface UpdateProductGalleryItemData {
  title?: string;
  description?: string;
  category?: 'main' | 'variant' | 'lifestyle' | 'details' | 'packaging' | 'general';
  variantId?: string;
  tags?: string[];
  order?: number;
  isVisible?: boolean;
  isCover?: boolean;
}

export interface ReorderItem {
  id: string;
  order: number;
}

class ProductGalleryService {
  /**
   * Upload a single product image
   */
  async uploadItem(
    productId: string,
    file: File | Blob | any,
    data: UploadProductGalleryItemData
  ): Promise<ProductGalleryItem> {
    console.log('📤 [Upload] Received file:', {
      isFile: file instanceof File,
      isBlob: file instanceof Blob,
      hasUri: !!file.uri,
      uri: file.uri,
      type: file.type,
      mimeType: file.mimeType,
      fileName: file.fileName,
      name: file.name,
    });

    const formData = new FormData();

    // Append file
    if (file instanceof File || file instanceof Blob) {
      console.log('📤 [Upload] Direct File/Blob append');
      formData.append('file', file);
    } else if (file.uri) {
      // For web: Convert URI to Blob/File
      if (typeof window !== 'undefined') {
        if (file.uri.startsWith('blob:')) {
          console.log('📤 [Upload] Converting blob URI to File...');
          try {
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const fileName = file.fileName || file.name || `product-${Date.now()}.jpg`;
            const mimeType = blob.type || file.mimeType || file.type || 'image/jpeg';
            const fileObj = new File([blob], fileName, { type: mimeType });

            console.log('📤 [Upload] Converted to File:', {
              name: fileObj.name,
              type: fileObj.type,
              size: fileObj.size,
            });

            formData.append('file', fileObj);
          } catch (error) {
            console.error('❌ Failed to convert blob URI to File:', error);
            throw new Error('Failed to process image file');
          }
        } else if (file.uri.startsWith('data:')) {
          console.log('📤 [Upload] Converting data URI to File...');
          try {
            // Convert data URI to blob
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const fileName = file.fileName || file.name || `product-${Date.now()}.jpg`;
            const mimeType = blob.type || file.mimeType || file.type || 'image/jpeg';
            const fileObj = new File([blob], fileName, { type: mimeType });

            console.log('📤 [Upload] Converted data URI to File:', {
              name: fileObj.name,
              type: fileObj.type,
              size: fileObj.size,
            });

            formData.append('file', fileObj);
          } catch (error) {
            console.error('❌ Failed to convert data URI to File:', error);
            throw new Error('Failed to process image file');
          }
        } else {
          console.error('❌ Unknown URI format on web:', file.uri);
          throw new Error('Unsupported file URI format');
        }
      } else {
        // React Native format (non-web)
        console.log('📤 [Upload] React Native file format');
        const fileData = {
          uri: file.uri,
          type: file.mimeType || file.type || 'image/jpeg',
          name: file.fileName || file.name || `product-${Date.now()}.jpg`,
        };
        formData.append('file', fileData as any);
      }
    } else {
      console.error('❌ Invalid file format:', file);
      throw new Error('Invalid file format');
    }

    // Append metadata
    formData.append('category', data.category);
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.variantId) formData.append('variantId', data.variantId);
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        formData.append('tags', JSON.stringify(data.tags));
      } else {
        formData.append('tags', data.tags);
      }
    }
    if (data.order !== undefined) formData.append('order', data.order.toString());
    if (data.isVisible !== undefined) formData.append('isVisible', data.isVisible.toString());
    if (data.isCover !== undefined) formData.append('isCover', data.isCover.toString());

    console.log('📤 [Upload] Sending FormData with metadata:', {
      category: data.category,
      title: data.title,
      description: data.description,
      isVisible: data.isVisible,
    });

    const response = await apiClient.post<ProductGalleryItem>(
      `merchant/products/${productId}/gallery`,
      formData
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Upload multiple product images at once
   */
  async bulkUpload(
    productId: string,
    files: (File | Blob | any)[],
    data: BulkUploadProductData
  ): Promise<{ uploaded: any[]; failed: any[]; totalUploaded: number; totalFailed: number }> {
    console.log('📤 [Bulk Upload] Processing', files.length, 'files');

    const formData = new FormData();

    // Append files - Convert data URIs to File objects on web
    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      if (file instanceof File || file instanceof Blob) {
        formData.append('files', file);
      } else if (file.uri) {
        // For web: Convert URI to File
        if (typeof window !== 'undefined') {
          if (file.uri.startsWith('blob:') || file.uri.startsWith('data:')) {
            try {
              const response = await fetch(file.uri);
              const blob = await response.blob();
              const fileName = file.fileName || file.name || `product-${Date.now()}-${index}.jpg`;
              const mimeType = blob.type || file.mimeType || file.type || 'image/jpeg';
              const fileObj = new File([blob], fileName, { type: mimeType });
              formData.append('files', fileObj);
              console.log(`📤 [Bulk Upload] Converted file ${index + 1}:`, {
                name: fileObj.name,
                type: fileObj.type,
                size: fileObj.size,
              });
            } catch (error) {
              console.error(`❌ Failed to convert file ${index + 1}:`, error);
              throw new Error(`Failed to process image file ${index + 1}`);
            }
          } else {
            console.error('❌ Unknown URI format:', file.uri);
            throw new Error('Unsupported file URI format');
          }
        } else {
          // React Native format (non-web)
          formData.append('files', {
            uri: file.uri,
            type: file.mimeType || file.type || 'image/jpeg',
            name: file.fileName || file.name || `product-${Date.now()}-${index}.jpg`,
          } as any);
        }
      } else {
        console.error('❌ Invalid file format at index', index);
        throw new Error(`Invalid file format at index ${index}`);
      }
    }

    // Append metadata
    formData.append('category', data.category);
    // If single title is provided, use it for all items
    if (data.title) {
      formData.append('title', data.title);
    }
    // If per-item titles array is provided, use that instead
    if (data.titles && Array.isArray(data.titles)) {
      formData.append('titles', JSON.stringify(data.titles));
    }
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.variantId) {
      formData.append('variantId', data.variantId);
    }
    if (data.tags) {
      if (Array.isArray(data.tags)) {
        formData.append('tags', JSON.stringify(data.tags));
      } else {
        formData.append('tags', data.tags);
      }
    }
    if (data.isVisible !== undefined) {
      formData.append('isVisible', data.isVisible.toString());
    }
    if (data.isCover !== undefined) {
      formData.append('isCover', data.isCover.toString());
    }

    console.log('📤 [Bulk Upload] Sending FormData with', files.length, 'files and metadata:', {
      category: data.category,
      title: data.title,
      description: data.description,
    });

    const response = await apiClient.post<{ uploaded: any[]; failed: any[]; totalUploaded: number; totalFailed: number }>(
      `merchant/products/${productId}/gallery/bulk`,
      formData
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Get gallery items for a product
   */
  async getGallery(
    productId: string,
    options: {
      category?: 'main' | 'variant' | 'lifestyle' | 'details' | 'packaging' | 'general' | 'all';
      variantId?: string;
      limit?: number;
      offset?: number;
      includeDeleted?: boolean;
    } = {}
  ): Promise<ProductGalleryResponse> {
    const params = new URLSearchParams();
    if (options.category) params.append('category', options.category);
    if (options.variantId) params.append('variantId', options.variantId);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.includeDeleted) params.append('includeDeleted', 'true');

    const queryString = params.toString();
    const url = `merchant/products/${productId}/gallery${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<ProductGalleryResponse>(url);

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Get a single gallery item
   */
  async getItem(productId: string, itemId: string): Promise<ProductGalleryItem> {
    const response = await apiClient.get<ProductGalleryItem>(
      `merchant/products/${productId}/gallery/${itemId}`
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Update a gallery item
   */
  async updateItem(
    productId: string,
    itemId: string,
    data: UpdateProductGalleryItemData
  ): Promise<ProductGalleryItem> {
    const response = await apiClient.put<ProductGalleryItem>(
      `merchant/products/${productId}/gallery/${itemId}`,
      data
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Delete a gallery item
   */
  async deleteItem(productId: string, itemId: string): Promise<void> {
    await apiClient.delete(`merchant/products/${productId}/gallery/${itemId}`);
  }

  /**
   * Bulk delete gallery items
   */
  async bulkDelete(productId: string, itemIds: string[]): Promise<{ deletedCount: number }> {
    const response = await apiClient.delete<{ deletedCount: number }>(
      `merchant/products/${productId}/gallery/bulk`,
      { data: { itemIds } }
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Reorder gallery items
   */
  async reorder(productId: string, items: ReorderItem[]): Promise<void> {
    await apiClient.put(`merchant/products/${productId}/gallery/reorder`, { items });
  }

  /**
   * Set a gallery item as cover/main product image
   */
  async setCover(productId: string, itemId: string): Promise<ProductGalleryItem> {
    const response = await apiClient.put<ProductGalleryItem>(
      `merchant/products/${productId}/gallery/${itemId}/set-cover`,
      {}
    );

    if (response.data) {
      return response.data;
    }
    throw new Error('Invalid response from server');
  }

  /**
   * Get gallery categories for a product
   */
  async getCategories(productId: string): Promise<ProductGalleryCategory[]> {
    const response = await apiClient.get<ProductGalleryCategory[]>(
      `merchant/products/${productId}/gallery/categories`
    );

    if (response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // Handle wrapped response
      if ((response.data as any).categories && Array.isArray((response.data as any).categories)) {
        return (response.data as any).categories;
      }
    }
    return [];
  }
}

export const productGalleryService = new ProductGalleryService();
export default productGalleryService;
