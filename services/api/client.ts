/**
 * API Client — Singleton Axios instance for all backend API calls.
 *
 * Separated from index.ts to break circular imports.
 * Service files import from here, index.ts re-exports from here.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG, getApiUrl } from '../../config/api';
import { storageService } from '../storage';

const API_BASE_URL = getApiUrl();
const API_TIMEOUT = API_CONFIG.TIMEOUT;

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> {
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
  private cachedToken: string | null = null;
  private tokenInitPromise: Promise<void> | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    const baseURL = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

    this.axiosInstance = axios.create({
      baseURL,
      timeout: API_TIMEOUT,
      headers: {},
    });

    this.tokenInitPromise = this.initializeToken();
    this.setupInterceptors();
  }

  private async initializeToken(): Promise<void> {
    try {
      this.cachedToken = await storageService.getAuthToken();
    } catch {
      this.cachedToken = null;
    }
  }

  setToken(token: string | null): void {
    this.cachedToken = token;
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        if (this.isTokenInvalid && !config.url?.includes('/auth/')) {
          return Promise.reject(new Error('Token is invalid, please login again'));
        }

        if (this.tokenInitPromise) {
          await this.tokenInitPromise;
          this.tokenInitPromise = null;
        }

        const token = this.cachedToken;
        if (token && !this.isTokenInvalid) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        config.headers = config.headers || {};
        const isFormData = config.data instanceof FormData ||
          (typeof FormData !== 'undefined' && config.data instanceof FormData) ||
          (config.data && typeof config.data === 'object' && config.data.constructor?.name === 'FormData');

        if (isFormData) {
          delete config.headers['Content-Type'];
          delete config.headers['content-type'];
        } else if (config.data && !config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => response,
      async (error) => {
        const originalRequest = error.config;

        // Only attempt refresh on 401, not on auth endpoints, and not already retried
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/')
        ) {
          originalRequest._retry = true;

          // If already refreshing, queue this request to retry after refresh completes
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((newToken: string) => {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }

          this.isRefreshing = true;

          try {
            // Attempt token refresh — the backend accepts the expired token
            // from the Authorization header and returns a new one
            const currentToken = this.cachedToken || await storageService.getAuthToken();
            if (currentToken) {
              const baseURL = this.axiosInstance.defaults.baseURL || '';
              const refreshResponse = await axios.post(
                `${baseURL}/merchant/auth/refresh`,
                {},
                { headers: { Authorization: `Bearer ${currentToken}` } }
              );

              if (refreshResponse.data?.success && refreshResponse.data?.data?.token) {
                const newToken = refreshResponse.data.data.token;

                // Update stored token
                this.cachedToken = newToken;
                this.isTokenInvalid = false;
                await storageService.setAuthToken(newToken);

                if (__DEV__) console.log('[Merchant API] Token refreshed successfully');

                // Retry all queued requests with the new token
                this.refreshSubscribers.forEach((cb) => cb(newToken));
                this.refreshSubscribers = [];

                // Retry the original request
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.axiosInstance(originalRequest);
              }
            }
          } catch (refreshError) {
            if (__DEV__) console.error('[Merchant API] Token refresh failed:', refreshError);
          } finally {
            this.isRefreshing = false;
          }

          // Refresh failed — clear auth and reject
          this.isTokenInvalid = true;
          this.cachedToken = null;
          this.refreshSubscribers = [];
          await storageService.removeAuthToken();
          await storageService.removeUserData();
          await storageService.removeMerchantData();
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.get<ApiResponse<T>>(cleanUrl, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const isFormData = data instanceof FormData ||
      (typeof FormData !== 'undefined' && data instanceof FormData) ||
      (data && typeof data === 'object' && data.constructor?.name === 'FormData');

    let requestConfig: AxiosRequestConfig = { ...config };
    if (isFormData) {
      requestConfig = {
        ...config,
        headers: { ...config?.headers, 'Content-Type': undefined },
        transformRequest: [(d: any) => d],
      };
    }

    const response = await this.axiosInstance.post<ApiResponse<T>>(cleanUrl, data, requestConfig);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.put<ApiResponse<T>>(cleanUrl, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.delete<ApiResponse<T>>(cleanUrl, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    const response = await this.axiosInstance.patch<ApiResponse<T>>(cleanUrl, data, config);
    return response.data;
  }

  async getPaginated<T = any>(url: string, config?: AxiosRequestConfig): Promise<PaginatedResponse<T>> {
    const response = await this.axiosInstance.get<PaginatedResponse<T>>(url, config);
    return response.data;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; uptime: number }> {
    const response = await this.axiosInstance.get('/health');
    return response.data;
  }

  resetTokenStatus(): void {
    this.isTokenInvalid = false;
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
