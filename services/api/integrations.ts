import { apiClient } from './client';

export interface MerchantIntegrationItem {
  _id: string;
  integrationType: string;
  provider: string;
  status: 'active' | 'paused' | 'error' | 'pending_setup';
  syncMode: 'realtime' | 'batch';
  lastSyncAt?: string;
  lastSyncStatus?: string;
  errorCount: number;
  createdAt: string;
}

export interface IntegrationStatus {
  integrations: MerchantIntegrationItem[];
  recentTransactions: number;
  pendingTransactions: number;
}

class IntegrationApiService {
  async getStatus(storeId: string): Promise<IntegrationStatus> {
    try {
      const response = await apiClient.get<IntegrationStatus>(
        `merchant/integrations/status?storeId=${storeId}`,
      );
      if (response.success && response.data) {
        return response.data;
      }
      return { integrations: [], recentTransactions: 0, pendingTransactions: 0 };
    } catch {
      return { integrations: [], recentTransactions: 0, pendingTransactions: 0 };
    }
  }

  async uploadBatch(storeId: string, csvData: string): Promise<{ processed: number; failed: number; duplicates: number }> {
    try {
      const response = await apiClient.post<{ processed: number; failed: number; duplicates: number }>(
        'merchant/integrations/batch-upload',
        { storeId, csvData },
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Batch upload failed');
    } catch (error: any) {
      throw new Error(error.message || 'Batch upload failed');
    }
  }
}

export const integrationApiService = new IntegrationApiService();
export default integrationApiService;
