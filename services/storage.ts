import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface StorageKeys {
  AUTH_TOKEN: 'auth_token';
  USER_DATA: 'user_data';
  MERCHANT_DATA: 'merchant_data';
  DASHBOARD_CACHE: 'dashboard_cache';
  SETTINGS: 'app_settings';
  ACTIVE_STORE_ID: 'active_store_id';
}

const STORAGE_KEYS: StorageKeys = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  MERCHANT_DATA: 'merchant_data',
  DASHBOARD_CACHE: 'dashboard_cache',
  SETTINGS: 'app_settings',
  ACTIVE_STORE_ID: 'active_store_id',
};

class StorageService {
  private isSensitiveStorageKey(key: keyof StorageKeys): boolean {
    return key === 'AUTH_TOKEN';
  }

  private async secureSetItem(key: string, value: string): Promise<void> {
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  }

  private async secureGetItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }

    const secureValue = await SecureStore.getItemAsync(key);
    if (secureValue !== null) {
      return secureValue;
    }

    // Migration path from AsyncStorage token to SecureStore.
    const legacyValue = await AsyncStorage.getItem(key);
    if (legacyValue !== null) {
      await SecureStore.setItemAsync(key, legacyValue);
      await AsyncStorage.removeItem(key);
    }
    return legacyValue;
  }

  private async secureRemoveItem(key: string): Promise<void> {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(key);
    }
    await AsyncStorage.removeItem(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (value === null || value === undefined) {
      await this.remove(key);
      return;
    }

    const stringValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const stringValue = await AsyncStorage.getItem(key);
      if (stringValue === null) return null;
      return JSON.parse(stringValue) as T;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async setItem<T>(key: keyof StorageKeys, value: T): Promise<void> {
    if (value === null || value === undefined) {
      await this.removeItem(key);
      return;
    }

    const stringValue = JSON.stringify(value);

    if (this.isSensitiveStorageKey(key)) {
      await this.secureSetItem(STORAGE_KEYS[key], stringValue);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEYS[key], stringValue);
  }

  async getItem<T>(key: keyof StorageKeys): Promise<T | null> {
    try {
      const stringValue = this.isSensitiveStorageKey(key)
        ? await this.secureGetItem(STORAGE_KEYS[key])
        : await AsyncStorage.getItem(STORAGE_KEYS[key]);

      if (stringValue === null) return null;
      return JSON.parse(stringValue) as T;
    } catch {
      return null;
    }
  }

  async removeItem(key: keyof StorageKeys): Promise<void> {
    if (this.isSensitiveStorageKey(key)) {
      await this.secureRemoveItem(STORAGE_KEYS[key]);
      return;
    }

    await AsyncStorage.removeItem(STORAGE_KEYS[key]);
  }

  async clear(): Promise<void> {
    await this.secureRemoveItem(STORAGE_KEYS.AUTH_TOKEN);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.MERCHANT_DATA,
      STORAGE_KEYS.DASHBOARD_CACHE,
      STORAGE_KEYS.SETTINGS,
    ]);
  }

  async setAuthToken(token: string): Promise<void> {
    await this.secureSetItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async getAuthToken(): Promise<string | null> {
    return this.secureGetItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  async removeAuthToken(): Promise<void> {
    await this.removeItem('AUTH_TOKEN');
  }

  async setUserData(userData: any): Promise<void> {
    await this.setItem('USER_DATA', userData);
  }

  async getUserData<T>(): Promise<T | null> {
    return await this.getItem<T>('USER_DATA');
  }

  async removeUserData(): Promise<void> {
    await this.removeItem('USER_DATA');
  }

  async setMerchantData(merchantData: any): Promise<void> {
    await this.setItem('MERCHANT_DATA', merchantData);
  }

  async getMerchantData<T>(): Promise<T | null> {
    return await this.getItem<T>('MERCHANT_DATA');
  }

  async removeMerchantData(): Promise<void> {
    await this.removeItem('MERCHANT_DATA');
  }

  async setDashboardCache(data: any): Promise<void> {
    await this.setItem('DASHBOARD_CACHE', {
      data,
      timestamp: Date.now(),
    });
  }

  async getDashboardCache<T>(): Promise<{ data: T; timestamp: number } | null> {
    return await this.getItem<{ data: T; timestamp: number }>('DASHBOARD_CACHE');
  }

  async removeDashboardCache(): Promise<void> {
    await this.removeItem('DASHBOARD_CACHE');
  }

  async setSettings(settings: any): Promise<void> {
    await this.setItem('SETTINGS', settings);
  }

  async getSettings<T>(): Promise<T | null> {
    return await this.getItem<T>('SETTINGS');
  }

  async logout(): Promise<void> {
    await this.removeAuthToken();
    await this.removeUserData();
    await this.removeMerchantData();
    await this.removeDashboardCache();
  }

  async forceClearAll(): Promise<void> {
    await this.clear();
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getAuthToken();
    return token !== null;
  }
}

export const storageService = new StorageService();
export default storageService;
