import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getApiUrl } from '../../config/api';

// Use environment-aware API URL
const API_BASE_URL = getApiUrl();
const API_TIMEOUT = API_CONFIG.TIMEOUT;

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  private isTokenInvalid: boolean = false;

  constructor() {
    // Ensure baseURL doesn't end with slash for proper URL joining
    const baseURL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;


    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: API_TIMEOUT,
      headers: {
        // Don't set default Content-Type here - let interceptor handle it per request
        // This allows FormData to be sent with proper multipart/form-data boundary
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Skip auth requests if token is known to be invalid
        // Allow logout requests even when token is invalid
        if (this.isTokenInvalid && !config.url?.includes('/auth/')) {
          return Promise.reject(new Error('Token is invalid, please login again'));
        }

        // Add small delay to ensure AsyncStorage operations complete
        // This helps prevent race conditions with token storage
        await new Promise(resolve => setTimeout(resolve, 50));

        const token = await AsyncStorage.getItem('auth_token');

        if (token && !this.isTokenInvalid) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Set Content-Type based on data type
        config.headers = config.headers || {};

        // Check if data is FormData
        const isFormData = config.data instanceof FormData ||
            (typeof FormData !== 'undefined' && config.data instanceof FormData) ||
            (config.data && typeof config.data === 'object' && config.data.constructor?.name === 'FormData');

        if (isFormData) {
          // For FormData, remove Content-Type to let browser/axios set it with boundary
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
          delete config.headers['content-Type'];
          delete config.headers['Content-type'];
          console.log('🔵 [API Client] FormData detected, Content-Type headers removed');
        } else if (config.data && !config.headers['Content-Type']) {
          // For JSON data, set Content-Type to application/json
          config.headers['Content-Type'] = 'application/json';
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle common responses
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response;
      },
      async (error) => {
        // Handle token expiration/invalidation
        if (error.response?.status === 401) {
          this.isTokenInvalid = true;

          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
          await AsyncStorage.removeItem('merchant_data');
        }

        return Promise.reject(error);
      }
    );
  }

  // Generic GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.get<ApiResponse<T>>(cleanUrl, config);
    return response.data;
  }

  // Generic POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;

    // Check if data is FormData (works for both web and React Native)
    const isFormData = data instanceof FormData ||
                      (typeof FormData !== 'undefined' && data instanceof FormData) ||
                      (data && typeof data === 'object' && data.constructor?.name === 'FormData');

    // If data is FormData, configure request to send as multipart/form-data
    let requestConfig: AxiosRequestConfig = { ...config };

    if (isFormData) {
      // For FormData, explicitly prevent transformation and let axios handle it natively
      // Setting transformRequest to a passthrough function prevents default transformers
      requestConfig = {
        ...config,
        headers: {
          ...config?.headers,
          // Explicitly remove Content-Type so axios sets it with proper multipart boundary
          'Content-Type': undefined,
        },
        // Prevent axios default transformers from converting FormData
        transformRequest: [(data) => data],
      };
    }

    try {
      const response = await this.axiosInstance.post<ApiResponse<T>>(cleanUrl, data, requestConfig);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // Generic PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const baseURL = this.axiosInstance.defaults.baseURL || '';
    const fullUrl = `${baseURL}/${cleanUrl}`;
    
    console.log('🔵 [API Client] PUT Request:', fullUrl);
    console.log('🔵 [API Client] PUT Data:', JSON.stringify(data, null, 2));
    
    try {
      const response = await this.axiosInstance.put<ApiResponse<T>>(cleanUrl, data, config);
      console.log('🟢 [API Client] PUT Response:', {
        status: response.status,
        url: cleanUrl,
        hasData: !!response.data,
        success: response.data?.success
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [API Client] PUT Error:', {
        url: cleanUrl,
        status: error.response?.status,
        message: error.message,
        responseData: error.response?.data
      });
      throw error;
    }
  }

  // Generic DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.delete<ApiResponse<T>>(cleanUrl, config);
    return response.data;
  }

  // Generic PATCH request
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    // Ensure URL doesn't start with slash to properly join with baseURL
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.patch<ApiResponse<T>>(cleanUrl, data, config);
    return response.data;
  }

  // Paginated GET request
  async getPaginated<T = any>(url: string, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> {
    const response = await this.axiosInstance.get<PaginatedResponse<T>>(url, config);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await this.axiosInstance.get('/health');
    return response.data;
  }

  // Reset token invalid flag (called after successful login/register)
  resetTokenStatus(): void {
    this.isTokenInvalid = false;
  }

  // Get the axios instance for custom requests
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export type { ApiResponse, PaginatedResponse };
export default apiClient;

// Export all API services
export * from './auth';
export * from './products';
export * from './orders';
export * from './cashback';
export * from './uploads';
export * from './onboarding';
export * from './dashboard';
export * from './analytics';
export * from './audit';
export * from './notifications';
export * from './documents';
export * from './sync';
export * from './profile';
export * from './reviews';
export * from './stores';
export * from './offers';
export * from './discounts';
export * from './storeVouchers';
export * from './outlets';
export * from './promotionalVideos';
export * from './socialMedia';