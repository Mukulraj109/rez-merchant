import { storageService } from '../storage';
import { buildApiUrl } from '../../config/api';
import {
  Product,
  ProductCategory,
  ProductSearchRequest as ProductFilters
} from '@/shared/types';

export interface ProductListResponse {
  products: Product[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  category: string;
  storeId?: string; // Store assignment for multi-store support
  sku?: string;
  inventory: {
    stock: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
    allowBackorders?: boolean;
  };
  cashback: {
    percentage: number;
    maxAmount?: number;
    isActive?: boolean;
  };
  images?: Array<{
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    sortOrder?: number;
    isMain?: boolean;
  }>;
  status?: 'active' | 'inactive' | 'draft' | 'archived';
  visibility?: 'public' | 'hidden' | 'featured';
  tags?: string[];
  currency?: string;
  shortDescription?: string;
  brand?: string;
  barcode?: string;
  subcategory?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  storeId?: string; // Store assignment for multi-store support
  subcategory?: string;
  brand?: string;
  price?: number;
  costPrice?: number;
  compareAtPrice?: number;
  inventory?: {
    stock?: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
    allowBackorders?: boolean;
  };
  images?: Array<{
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    sortOrder?: number;
    isMain?: boolean;
  }>;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  searchKeywords?: string[];
  status?: 'active' | 'inactive' | 'draft' | 'archived';
  visibility?: 'public' | 'hidden' | 'featured';
  cashback?: {
    percentage: number;
    maxAmount?: number;
    isActive: boolean;
  };
}

export interface BulkProductAction {
  productIds: string[];
  action: 'activate' | 'deactivate' | 'delete' | 'update_category';
  category?: string;
  price?: number;
}

class ProductsService {
  // Token cache for performance optimization
  private tokenCache: { token: string; expiresAt: number } | null = null;
  private readonly TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  // Get products with filtering and pagination
  async getProducts(filters?: ProductFilters): Promise<ProductListResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
        if (filters.query) params.append('search', filters.query);
        if (filters.category) params.append('category', filters.category);
        if (filters.status) params.append('status', filters.status);
        // Backend does not support minPrice/maxPrice in basic search
        if (filters.stockLevel) params.append('stockLevel', filters.stockLevel);
        if (filters.visibility) params.append('visibility', filters.visibility);
        if (filters.storeId) params.append('storeId', filters.storeId); // Add storeId filter
      }

      const response = await fetch(buildApiUrl(`merchant/products?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get products');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Get products error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to get products');
    }
  }

  // Get single product by ID
  async getProduct(productId: string): Promise<Product> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/products/${productId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get product');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Get product error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to get product');
    }
  }

  // Create new product
  async createProduct(productData: CreateProductRequest): Promise<Product> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl('merchant/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(productData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create product');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Create product error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to create product');
    }
  }

  // Update product
  async updateProduct(productId: string, updates: UpdateProductRequest): Promise<Product> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/products/${productId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(updates),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update product');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Update product error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to update product');
    }
  }

  // Delete product
  async deleteProduct(productId: string): Promise<void> {
    try {
      const url = buildApiUrl(`merchant/products/${productId}`);
      console.log('🗑️ Deleting product:', productId, 'URL:', url);
      
      const token = await this.getAuthToken();
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error(`Server returned invalid JSON: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to delete product');
      }

      console.log('✅ Product deleted successfully:', productId);
    } catch (error: any) {
      console.error('❌ Delete product error:', error);
      throw new Error(error.message || 'Failed to delete product');
    }
  }

  // Get product categories
  async getCategories(): Promise<Array<{ label: string; value: string; id?: string }>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl('merchant/products/categories'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.categories) {
        return data.data.categories;
      } else {
        throw new Error(data.message || 'Failed to get categories');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Get categories error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to get categories');
    }
  }

  // Get subcategories for a parent category
  async getSubcategories(parentCategoryId: string): Promise<Array<{ label: string; value: string; id?: string }>> {
    try {
      // Fetch categories that have this category as their parent
      const response = await fetch(buildApiUrl(`categories?parent=${parentCategoryId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Transform to dropdown format
        const subcategories = Array.isArray(data.data) ? data.data : [];
        return subcategories.map((cat: any) => ({
          label: cat.name,
          value: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
          id: cat._id || cat.id
        }));
      } else {
        return [];
      }
    } catch (error: any) {
      console.error('Get subcategories error:', error);
      return []; // Return empty array on error, don't throw
    }
  }

  // Bulk action on products
  async bulkProductAction(bulkAction: BulkProductAction): Promise<{ successful: number; failed: number; errors: any[] }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl('merchant/products/bulk-action'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(bulkAction),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to perform bulk product action');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Bulk product action error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to perform bulk product action');
    }
  }

  // Export products
  async exportProducts(filters?: ProductFilters, format: 'csv' | 'excel' = 'csv'): Promise<{ url: string; filename: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const params = new URLSearchParams();
      params.append('format', format);

      if (filters) {
        if (filters.category) params.append('category', filters.category);
        if (filters.status) params.append('status', filters.status);
      }

      // Updated to point to the correct bulk export endpoint
      const response = await fetch(buildApiUrl(`merchant/bulk/products/export?${params}`), {
        method: 'GET', // Changed to GET as per backend route
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // The backend returns the file directly as a download
      // We need to handle the blob response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = `products-export-${Date.now()}.${format === 'excel' ? 'xlsx' : 'csv'}`;

      return { url, filename };
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Export products error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to export products');
    }
  }

  // Get product status options
  getProductStatusOptions(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: 'Active', value: 'active', color: '#10b981' },
      { label: 'Inactive', value: 'inactive', color: '#f59e0b' }
    ];
  }

  // Get products by category
  async getProductsByCategory(category: string, limit: number = 20): Promise<Product[]> {
    try {
      const result = await this.getProducts({
        category,
        status: 'active',
        limit,
        page: 1,
        sortBy: 'name',
        sortOrder: 'asc'
      });

      return result.products || [];
    } catch (error) {
      console.error('Get products by category error:', error);
      return [];
    }
  }

  // Get low stock products
  async getLowStockProducts(limit: number = 20): Promise<Product[]> {
    try {
      const result = await this.getProducts({
        stockLevel: 'low_stock',
        status: 'active',
        limit,
        page: 1,
        sortBy: 'stock',
        sortOrder: 'asc'
      });

      return result.products || [];
    } catch (error) {
      console.error('Get low stock products error:', error);
      return [];
    }
  }

  // Toggle product active status
  async toggleProductStatus(productId: string): Promise<Product> {
    try {
      const product = await this.getProduct(productId);
      const newStatus = product.status === 'active' ? 'inactive' : 'active';
      return await this.updateProduct(productId, {
        status: newStatus
      });
    } catch (error) {
      throw error;
    }
  }

  // ==================== VARIANT MANAGEMENT ====================

  // Get all variants for a product
  async getProductVariants(productId: string): Promise<import('../../types/variants').GetVariantsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/products/${productId}/variants`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get product variants');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Get product variants error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to get product variants');
    }
  }

  // Get single variant
  async getVariant(productId: string, variantId: string): Promise<import('../../types/variants').ProductVariant> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/products/${productId}/variants/${variantId}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get variant');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Get variant error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to get variant');
    }
  }

  // Create new variant
  async createVariant(
    productId: string,
    variantData: import('../../types/variants').CreateVariantRequest
  ): Promise<import('../../types/variants').ProductVariant> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/products/${productId}/variants`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(variantData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create variant');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Create variant error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to create variant');
    }
  }

  // Update variant
  async updateVariant(
    productId: string,
    variantId: string,
    updates: import('../../types/variants').UpdateVariantRequest
  ): Promise<import('../../types/variants').ProductVariant> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/products/${productId}/variants/${variantId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(updates),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update variant');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Update variant error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to update variant');
    }
  }

  // Delete variant
  async deleteVariant(productId: string, variantId: string): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/products/${productId}/variants/${variantId}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to delete variant');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Delete variant error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to delete variant');
    }
  }

  // Generate variant combinations from attributes
  async generateVariantCombinations(
    productId: string,
    request: import('../../types/variants').GenerateVariantsRequest
  ): Promise<import('../../types/variants').GenerateVariantsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/products/${productId}/variants/generate`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to generate variant combinations');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Generate variant combinations error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to generate variant combinations');
    }
  }

  // ==================== BULK IMPORT/EXPORT METHODS ====================

  // Bulk import products from CSV/Excel file
  async bulkImportProducts(
    request: import('../../types/variants').BulkImportRequest
  ): Promise<import('../../types/variants').BulkImportResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const formData = new FormData();

      // Handle file differently based on platform
      if ('uri' in request.file) {
        // React Native file
        formData.append('file', {
          uri: request.file.uri,
          name: request.file.name,
          type: request.file.type,
        } as any);
      } else {
        // Web File object
        formData.append('file', request.file);
      }

      formData.append('format', request.format);

      if (request.options) {
        formData.append('options', JSON.stringify(request.options));
      }

      const response = await fetch(buildApiUrl('merchant/bulk/products/import'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
          // Don't set Content-Type, let browser/RN set it with boundary
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || 'Failed to start bulk import');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Bulk import error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to import products');
    }
  }

  // Export products with optional filters and format (enhanced version)
  async exportProductsAdvanced(
    config: import('../../types/variants').ExportConfig
  ): Promise<import('../../types/variants').ExportProductsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl('merchant/bulk/products/export/advanced'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(config),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle blob download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = `products-advanced-export-${Date.now()}.${config.format === 'excel' ? 'xlsx' : 'csv'}`;

      return {
        url,
        fileName: filename,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour expiry mock
        recordCount: 0 // Unknown count from blob response
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Export products advanced error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to export products');
    }
  }

  // Bulk update multiple products
  async bulkUpdateProducts(
    request: import('../../types/variants').BulkUpdateProductsRequest
  ): Promise<import('../../types/variants').BulkUpdateProductsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl('merchant/bulk/products/bulk-update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to bulk update products');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Bulk update products error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to bulk update products');
    }
  }

  // Download import template
  async downloadImportTemplate(
    format: 'csv' | 'excel' = 'csv'
  ): Promise<{ url: string; filename: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(buildApiUrl(`merchant/bulk/products/template?format=${format}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle blob download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const filename = `product-import-template.${format === 'excel' ? 'xlsx' : 'csv'}`;

      return { url, filename };
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Download template error:', error);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      throw new Error(error.message || 'Failed to download template');
    }
  }

  // ==================== SKU VALIDATION ====================

  /**
   * Validate if SKU is unique (not already used by another product)
   * @param sku - The SKU to validate
   * @param excludeProductId - Optional product ID to exclude (for edit mode)
   * @returns Object with isAvailable boolean and optional suggestion
   */
  async validateSku(sku: string, excludeProductId?: string): Promise<{
    isAvailable: boolean;
    message?: string;
    suggestion?: string;
  }> {
    if (!sku || !sku.trim()) {
      return {
        isAvailable: false,
        message: 'SKU is required'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const params = new URLSearchParams();
      params.append('sku', sku.trim());
      if (excludeProductId) {
        params.append('excludeProductId', excludeProductId);
      }

      const response = await fetch(buildApiUrl(`merchant/products/validate-sku?${params}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If endpoint doesn't exist (404), fall back to client-side check
        if (response.status === 404) {
          return await this.validateSkuFallback(sku, excludeProductId);
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        return {
          isAvailable: data.data.isAvailable,
          message: data.data.message,
          suggestion: data.data.suggestion
        };
      } else {
        throw new Error(data.message || 'Failed to validate SKU');
      }
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }

      // If network error or endpoint not available, use fallback
      console.warn('SKU validation error, using fallback:', error.message);
      return await this.validateSkuFallback(sku, excludeProductId);
    }
  }

  /**
   * Fallback SKU validation by searching existing products
   * Used when backend endpoint is not available
   */
  private async validateSkuFallback(sku: string, excludeProductId?: string): Promise<{
    isAvailable: boolean;
    message?: string;
    suggestion?: string;
  }> {
    try {
      // Search for products with this SKU
      const response = await this.getProducts({
        query: sku,
        page: 1,
        limit: 10
      });

      // Check if any product has exact SKU match
      const existingProduct = response.products.find(p =>
        p.sku?.toUpperCase() === sku.toUpperCase() &&
        p._id !== excludeProductId
      );

      if (existingProduct) {
        // Generate a unique suggestion
        const timestamp = Date.now().toString().slice(-4);
        const suggestion = `${sku}-${timestamp}`;

        return {
          isAvailable: false,
          message: `SKU "${sku}" is already used by product "${existingProduct.name}"`,
          suggestion
        };
      }

      return {
        isAvailable: true,
        message: 'SKU is available'
      };
    } catch (error) {
      console.error('SKU fallback validation error:', error);
      // If we can't validate, assume it's available to avoid blocking
      return {
        isAvailable: true,
        message: 'Could not validate SKU uniqueness'
      };
    }
  }

  private async getAuthToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    // Fetch fresh token from storage
    const token = await storageService.getAuthToken();
    if (!token) {
      throw new Error('No auth token found');
    }

    // Cache the token for 5 minutes
    this.tokenCache = {
      token,
      expiresAt: Date.now() + this.TOKEN_CACHE_DURATION
    };

    return token;
  }
}

export const productsService = new ProductsService();
