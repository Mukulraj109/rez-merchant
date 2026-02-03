import { getApiUrl } from '../../config/api';

// Types
export interface DealSnapshot {
  store?: string;
  storeId?: string;
  cashback?: string;
  discount?: string;
  coins?: string;
  bonus?: string;
}

export interface CampaignSnapshot {
  title: string;
  badge?: string;
  terms?: string[];
  minOrderValue?: number;
  maxBenefit?: number;
}

export interface DealRedemption {
  id: string;
  code: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  redeemedAt: string;
  usedAt?: string;
  expiresAt: string;
  dealSnapshot: DealSnapshot;
  campaignSnapshot: CampaignSnapshot;
  isPaid: boolean;
  benefitApplied?: number;
  orderAmount?: number;
  user: {
    name: string;
  };
}

export interface VerifyCodeResponse {
  valid: boolean;
  reason?: string;
  usedAt?: string;
  redemption?: {
    id: string;
    code: string;
    status: string;
    expiresAt: string;
    dealSnapshot: DealSnapshot;
    campaignSnapshot: CampaignSnapshot;
    isPaid: boolean;
    user: { name: string };
  };
}

export interface UseCodeRequest {
  storeId: string;
  benefitApplied?: number;
  orderAmount?: number;
  notes?: string;
}

export interface UseCodeResponse {
  code: string;
  status: string;
  usedAt: string;
  benefitApplied?: number;
}

export interface RedemptionListResponse {
  redemptions: DealRedemption[];
  stats: {
    total: number;
    active: number;
    used: number;
    expired: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RedemptionStats {
  today: { total: number; used: number; pending: number };
  thisWeek: { total: number; used: number; pending: number };
  thisMonth: { total: number; used: number; pending: number };
  totalRevenue: number;
  topDeals: Array<{ campaign: string; redemptions: number }>;
}

export interface RedemptionFilters {
  storeId?: string;
  status?: 'active' | 'used' | 'expired' | 'pending';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

class DealRedemptionsService {
  /**
   * Verify a redemption code
   */
  async verifyCode(code: string): Promise<VerifyCodeResponse> {
    try {
      const response = await fetch(getApiUrl(`merchant/deal-redemptions/verify/${encodeURIComponent(code)}`), {
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
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to verify code');
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      throw new Error(error.message || 'Failed to verify code');
    }
  }

  /**
   * Mark a redemption code as used
   */
  async useCode(code: string, useData: UseCodeRequest): Promise<UseCodeResponse> {
    try {
      const response = await fetch(getApiUrl(`merchant/deal-redemptions/${encodeURIComponent(code)}/use`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(useData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to use code');
      }
    } catch (error: any) {
      console.error('Use code error:', error);
      throw new Error(error.message || 'Failed to use code');
    }
  }

  /**
   * Get list of redemptions for merchant's stores
   */
  async getRedemptions(filters?: RedemptionFilters): Promise<RedemptionListResponse> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.storeId) params.append('storeId', filters.storeId);
        if (filters.status) params.append('status', filters.status);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
      }

      const response = await fetch(getApiUrl(`merchant/deal-redemptions?${params}`), {
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
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get redemptions');
      }
    } catch (error: any) {
      console.error('Get redemptions error:', error);
      throw new Error(error.message || 'Failed to get redemptions');
    }
  }

  /**
   * Get redemption statistics
   */
  async getStats(): Promise<RedemptionStats> {
    try {
      const response = await fetch(getApiUrl('merchant/deal-redemptions/stats'), {
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
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get stats');
      }
    } catch (error: any) {
      console.error('Get stats error:', error);
      // Return fallback stats
      return {
        today: { total: 0, used: 0, pending: 0 },
        thisWeek: { total: 0, used: 0, pending: 0 },
        thisMonth: { total: 0, used: 0, pending: 0 },
        totalRevenue: 0,
        topDeals: []
      };
    }
  }

  /**
   * Get status display info
   */
  getStatusInfo(status: string): { label: string; color: string; bgColor: string } {
    switch (status) {
      case 'active':
        return { label: 'Active', color: '#10b981', bgColor: '#d1fae5' };
      case 'used':
        return { label: 'Used', color: '#6366f1', bgColor: '#e0e7ff' };
      case 'expired':
        return { label: 'Expired', color: '#6b7280', bgColor: '#f3f4f6' };
      case 'cancelled':
        return { label: 'Cancelled', color: '#ef4444', bgColor: '#fee2e2' };
      default:
        return { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    }
  }

  /**
   * Helper method to get auth token
   */
  private async getAuthToken(): Promise<string> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('auth_token') || '';
  }
}

// Create and export singleton instance
export const dealRedemptionsService = new DealRedemptionsService();
export default dealRedemptionsService;
