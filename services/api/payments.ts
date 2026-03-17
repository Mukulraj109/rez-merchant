import { getApiUrl } from '../../config/api';
import { storageService } from '../storage';

export interface StorePaymentRecord {
  paymentId: string;
  storeId: string;
  storeName: string;
  amount: number;
  coinsUsed: number;
  paymentMethod: string;
  status: string;
  rewards?: {
    cashbackEarned: number;
    coinsEarned: number;
    bonusCoins: number;
  };
  createdAt: string;
  completedAt: string;
}

export interface PaymentsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaymentsResponse {
  success: boolean;
  data: {
    transactions: StorePaymentRecord[];
    pagination: PaymentsPagination;
  };
}

export interface PaymentStatsResponse {
  success: boolean;
  data: {
    today: {
      paymentCount: number;
      revenue: number;
    };
    thisMonth: {
      paymentCount: number;
      revenue: number;
      averageTransactionValue: number;
    };
    paymentMethods: Array<{
      method: string;
      count: number;
      total: number;
    }>;
  };
}

export interface PaymentSearchParams {
  page?: number;
  limit?: number;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
}

class PaymentsService {
  private async getAuthToken(): Promise<string> {
    return (await storageService.getAuthToken()) || '';
  }

  async getPayments(storeId: string, params: PaymentSearchParams = {}): Promise<PaymentsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.dateStart) queryParams.append('dateStart', params.dateStart);
      if (params.dateEnd) queryParams.append('dateEnd', params.dateEnd);

      const url = getApiUrl(`store-payment/history/${storeId}?${queryParams.toString()}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch payments');
      }

      return data;
    } catch (error: any) {
      if (__DEV__) console.error('[PaymentsService] getPayments error:', error);
      throw error;
    }
  }

  async getPaymentStats(storeId: string): Promise<PaymentStatsResponse> {
    try {
      const url = getApiUrl(`store-payment/stats/${storeId}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch payment stats');
      }

      return data;
    } catch (error: any) {
      if (__DEV__) console.error('[PaymentsService] getPaymentStats error:', error);
      throw error;
    }
  }

  async getRecentPayments(storeId: string, limit: number = 5): Promise<PaymentsResponse> {
    return this.getPayments(storeId, { page: 1, limit });
  }
}

export const paymentsService = new PaymentsService();
export default paymentsService;
