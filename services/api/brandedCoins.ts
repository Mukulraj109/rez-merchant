import api from './client';

export interface BrandedCoinAnalytics {
  totalInCirculation: number;
  totalAwarded: number;
  totalRedeemed: number;
  uniqueCustomers: number;
}

export interface BrandedCoinCustomer {
  userId: string;
  userName?: string;
  phoneNumber?: string;
  amount: number;
  earnedDate?: string;
  lastUsed?: string;
}

export interface BrandedCoinCustomerListResponse {
  customers: BrandedCoinCustomer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class BrandedCoinService {
  async getAnalytics(storeId: string) {
    const response = await api.get(`/merchant/stores/${storeId}/branded-campaigns`);
    return response;
  }

  async getCustomers(storeId: string, page = 1, limit = 20) {
    const response = await api.get(`/merchant/stores/${storeId}/branded-campaigns/customers?page=${page}&limit=${limit}`);
    return response;
  }

  async awardCoins(storeId: string, userId: string, amount: number, reason?: string) {
    const response = await api.post(`/merchant/stores/${storeId}/branded-campaigns/award`, {
      userId,
      amount,
      reason,
    });
    return response;
  }
}

export const brandedCoinService = new BrandedCoinService();
export default brandedCoinService;
