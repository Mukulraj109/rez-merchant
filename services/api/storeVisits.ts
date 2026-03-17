import { getApiUrl } from '../../config/api';
import { storageService } from '../storage';

export interface StoreVisitSearchParams {
  storeId: string;
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface StoreVisit {
  _id: string;
  id?: string;
  storeId: string;
  userId?: {
    _id: string;
    name?: string;
    phoneNumber?: string;
    email?: string;
  };
  visitType: 'scheduled' | 'queue';
  status: 'pending' | 'checked_in' | 'completed' | 'cancelled';
  visitDate: string;
  visitTime?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  queueNumber?: number;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreVisitStats {
  totalToday: number;
  upcoming: number;
  checkedIn: number;
  completed: number;
  cancelled: number;
}

export interface StoreVisitListResponse {
  visits: StoreVisit[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateVisitStatusRequest {
  status: string;
  notes?: string;
}

class StoreVisitsService {
  private get baseUrl() {
    return getApiUrl('merchant/store-visits');
  }

  // Get visits with filtering and pagination
  async getVisits(params: StoreVisitSearchParams): Promise<StoreVisitListResponse> {
    try {
      const searchParams = new URLSearchParams();

      // Filter out empty strings and null/undefined values
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      const url = `${this.baseUrl}?${searchParams.toString()}`;
      if (__DEV__) console.log('[VISITS] Fetching visits from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          if (__DEV__) console.error('[VISITS] API Error Response:', errorData);
        } catch (e) {
          const errorText = await response.text();
          if (__DEV__) console.error('[VISITS] API Error Text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (__DEV__) console.log('[VISITS] Raw API response:', JSON.stringify(data, null, 2));

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get visits');
      }
    } catch (error: any) {
      if (__DEV__) console.error('[VISITS] Get visits error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get visits');
    }
  }

  // Get visit statistics for a store
  async getVisitStats(storeId: string): Promise<StoreVisitStats> {
    try {
      const url = `${this.baseUrl}/stats?storeId=${storeId}`;
      if (__DEV__) console.log('[VISITS] Fetching visit stats from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          if (__DEV__) console.error('[VISITS] Stats API Error Response:', errorData);
        } catch (e) {
          const errorText = await response.text();
          if (__DEV__) console.error('[VISITS] Stats API Error Text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to get visit stats');
      }
    } catch (error: any) {
      if (__DEV__) console.error('[VISITS] Get visit stats error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get visit stats');
    }
  }

  // Update visit status
  async updateVisitStatus(
    visitId: string,
    status: string,
    notes?: string
  ): Promise<StoreVisit> {
    try {
      const body: UpdateVisitStatusRequest = { status };
      if (notes) {
        body.notes = notes;
      }

      const response = await fetch(
        `${this.baseUrl}/${visitId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAuthToken()}`
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          if (__DEV__) console.error('[VISITS] Update status API Error Response:', errorData);
        } catch (e) {
          const errorText = await response.text();
          if (__DEV__) console.error('[VISITS] Update status API Error Text:', errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update visit status');
      }
    } catch (error: any) {
      if (__DEV__) console.error('[VISITS] Update visit status error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to update visit status');
    }
  }

  // Helper method to get auth token
  private async getAuthToken(): Promise<string> {
    return (await storageService.getAuthToken()) || '';
  }
}

// Create and export singleton instance
export const storeVisitsService = new StoreVisitsService();
export default storeVisitsService;
