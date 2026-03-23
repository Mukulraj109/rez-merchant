import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Product, Order, CashbackRequest } from '../types/api';
import { apiClient } from './api';

export interface OfflineAction {
  id: string;
  idempotencyKey: string;
  type: 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'DELETE_PRODUCT' | 'UPDATE_ORDER' | 'APPROVE_CASHBACK' | 'REJECT_CASHBACK' | 'CREATE_BILL';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export interface DeadLetterAction extends OfflineAction {
  failedAt: number;
  lastError: string;
}

export interface CachedData {
  products: Product[];
  orders: Order[];
  cashbackRequests: CashbackRequest[];
  lastSync: number;
  expiresAt: number;
}

class OfflineService {
  private readonly CACHE_KEY = 'app_cache';
  private readonly OFFLINE_ACTIONS_KEY = 'offline_actions';
  private readonly DEAD_LETTER_KEY = 'offline_actions_dead_letter';
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;
  private readonly MAX_QUEUE_LENGTH = 500;
  private readonly MAX_DEAD_LETTER_LENGTH = 1000;
  private isOnline = true;
  private syncInProgress = false;
  private actionSequence = 0;

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        this.syncOfflineActions();
      }
    });
  }

  async isDeviceOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;
    return this.isOnline;
  }

  async cacheData(data: Partial<CachedData>): Promise<void> {
    try {
      const existingCache = await this.getCachedData();
      const now = Date.now();

      const updatedCache: CachedData = {
        ...existingCache,
        ...data,
        lastSync: now,
        expiresAt: now + this.CACHE_DURATION,
      };

      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(updatedCache));
    } catch {
      // best-effort cache
    }
  }

  async getCachedData(): Promise<CachedData> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!cached) {
        return this.getEmptyCache();
      }

      const data: CachedData = JSON.parse(cached);
      if (Date.now() > data.expiresAt) {
        return this.getEmptyCache();
      }

      return data;
    } catch {
      return this.getEmptyCache();
    }
  }

  async isCacheValid(): Promise<boolean> {
    try {
      const cache = await this.getCachedData();
      return Date.now() < cache.expiresAt && cache.lastSync > 0;
    } catch {
      return false;
    }
  }

  private getEmptyCache(): CachedData {
    return {
      products: [],
      orders: [],
      cashbackRequests: [],
      lastSync: 0,
      expiresAt: 0,
    };
  }

  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount' | 'idempotencyKey'>): Promise<void> {
    try {
      const now = Date.now();
      this.actionSequence += 1;
      const offlineAction: OfflineAction = {
        ...action,
        id: `offline_${now}_${this.actionSequence}`,
        idempotencyKey: `offline-${now}-${this.actionSequence}`,
        timestamp: now,
        retryCount: 0,
      };

      const existingActions = await this.getOfflineActions();
      existingActions.push(offlineAction);

      if (existingActions.length > this.MAX_QUEUE_LENGTH) {
        const overflowCount = existingActions.length - this.MAX_QUEUE_LENGTH;
        const dropped = existingActions.splice(0, overflowCount);
        await this.pushToDeadLetter(
          dropped.map((item) => ({
            ...item,
            failedAt: Date.now(),
            lastError: 'Queue capacity exceeded before sync',
          }))
        );
      }

      await AsyncStorage.setItem(this.OFFLINE_ACTIONS_KEY, JSON.stringify(existingActions));
    } catch {
      // best-effort queue
    }
  }

  async getOfflineActions(): Promise<OfflineAction[]> {
    try {
      const actions = await AsyncStorage.getItem(this.OFFLINE_ACTIONS_KEY);
      return actions ? JSON.parse(actions) : [];
    } catch {
      return [];
    }
  }

  async getDeadLetterActions(): Promise<DeadLetterAction[]> {
    try {
      const items = await AsyncStorage.getItem(this.DEAD_LETTER_KEY);
      return items ? JSON.parse(items) : [];
    } catch {
      return [];
    }
  }

  private async pushToDeadLetter(items: DeadLetterAction[]): Promise<void> {
    if (!items.length) return;
    const existing = await this.getDeadLetterActions();
    const combined = [...existing, ...items].slice(-this.MAX_DEAD_LETTER_LENGTH);
    await AsyncStorage.setItem(this.DEAD_LETTER_KEY, JSON.stringify(combined));
  }

  async syncOfflineActions(): Promise<{ successful: number; failed: number }> {
    if (this.syncInProgress) {
      return { successful: 0, failed: 0 };
    }

    this.syncInProgress = true;
    let successful = 0;
    let failed = 0;

    try {
      const actions = await this.getOfflineActions();
      const remainingActions: OfflineAction[] = [];
      const deadLetters: DeadLetterAction[] = [];

      for (const action of actions) {
        try {
          await this.executeOfflineAction(action);
          successful++;
        } catch (error: any) {
          action.retryCount++;
          const errMessage = error?.message || 'Unknown sync error';

          if (action.retryCount >= action.maxRetries) {
            failed++;
            deadLetters.push({
              ...action,
              failedAt: Date.now(),
              lastError: errMessage,
            });
          } else {
            remainingActions.push(action);
          }
        }
      }

      await AsyncStorage.setItem(this.OFFLINE_ACTIONS_KEY, JSON.stringify(remainingActions));
      await this.pushToDeadLetter(deadLetters);
    } catch {
      // best-effort sync
    } finally {
      this.syncInProgress = false;
    }

    return { successful, failed };
  }

  private normalizeEndpoint(endpoint: string): string {
    if (endpoint.startsWith('/api/')) {
      return endpoint.slice('/api/'.length);
    }
    if (endpoint.startsWith('/')) {
      return endpoint.slice(1);
    }
    return endpoint;
  }

  private async executeOfflineAction(action: OfflineAction): Promise<void> {
    const endpoint = this.normalizeEndpoint(action.endpoint);
    const config = {
      headers: {
        'X-Idempotency-Key': action.idempotencyKey,
      },
    };

    if (action.method === 'POST') {
      const response = await apiClient.post(endpoint, action.data, config);
      if (response?.success === false) {
        throw new Error(response.message || 'POST action rejected');
      }
      return;
    }

    if (action.method === 'PUT') {
      const response = await apiClient.put(endpoint, action.data, config);
      if (response?.success === false) {
        throw new Error(response.message || 'PUT action rejected');
      }
      return;
    }

    const response = await apiClient.delete(endpoint, config);
    if (response?.success === false) {
      throw new Error(response.message || 'DELETE action rejected');
    }
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.CACHE_KEY,
      this.OFFLINE_ACTIONS_KEY,
      this.DEAD_LETTER_KEY,
    ]);
  }

  async getCacheInfo(): Promise<{
    cacheSize: number;
    pendingActions: number;
    deadLetterActions: number;
    lastSync: Date | null;
    isExpired: boolean;
  }> {
    try {
      const cache = await this.getCachedData();
      const actions = await this.getOfflineActions();
      const deadLetter = await this.getDeadLetterActions();

      return {
        cacheSize: cache.products.length + cache.orders.length + cache.cashbackRequests.length,
        pendingActions: actions.length,
        deadLetterActions: deadLetter.length,
        lastSync: cache.lastSync > 0 ? new Date(cache.lastSync) : null,
        isExpired: Date.now() > cache.expiresAt,
      };
    } catch {
      return {
        cacheSize: 0,
        pendingActions: 0,
        deadLetterActions: 0,
        lastSync: null,
        isExpired: true,
      };
    }
  }

  async getCachedProducts(): Promise<Product[]> {
    const cache = await this.getCachedData();
    return cache.products || [];
  }

  async getCachedOrders(): Promise<Order[]> {
    const cache = await this.getCachedData();
    return cache.orders || [];
  }

  async getCachedCashbackRequests(): Promise<CashbackRequest[]> {
    const cache = await this.getCachedData();
    return cache.cashbackRequests || [];
  }

  async queueProductCreate(productData: any): Promise<void> {
    await this.queueOfflineAction({
      type: 'CREATE_PRODUCT',
      endpoint: '/api/products',
      method: 'POST',
      data: productData,
      maxRetries: 3,
    });
  }

  async queueProductUpdate(productId: string, productData: any): Promise<void> {
    await this.queueOfflineAction({
      type: 'UPDATE_PRODUCT',
      endpoint: `/api/products/${productId}`,
      method: 'PUT',
      data: productData,
      maxRetries: 3,
    });
  }

  async queueProductDelete(productId: string): Promise<void> {
    await this.queueOfflineAction({
      type: 'DELETE_PRODUCT',
      endpoint: `/api/products/${productId}`,
      method: 'DELETE',
      maxRetries: 3,
    });
  }

  async queueOrderUpdate(orderId: string, orderData: any): Promise<void> {
    await this.queueOfflineAction({
      type: 'UPDATE_ORDER',
      endpoint: `/api/orders/${orderId}`,
      method: 'PUT',
      data: orderData,
      maxRetries: 5,
    });
  }

  async queueCashbackApproval(cashbackId: string): Promise<void> {
    await this.queueOfflineAction({
      type: 'APPROVE_CASHBACK',
      endpoint: `/api/cashback/${cashbackId}/approve`,
      method: 'PUT',
      maxRetries: 5,
    });
  }

  async queueCashbackRejection(cashbackId: string, reason?: string): Promise<void> {
    await this.queueOfflineAction({
      type: 'REJECT_CASHBACK',
      endpoint: `/api/cashback/${cashbackId}/reject`,
      method: 'PUT',
      data: { reason },
      maxRetries: 5,
    });
  }

  async queueBillCreation(billData: any): Promise<void> {
    await this.queueOfflineAction({
      type: 'CREATE_BILL',
      endpoint: '/api/store-payment/create-bill',
      method: 'POST',
      data: billData,
      maxRetries: 5,
    });
  }
}

export const offlineService = new OfflineService();
export default offlineService;
