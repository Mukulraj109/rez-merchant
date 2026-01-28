import { buildApiUrl } from '../../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WalletBalance {
  total: number;
  available: number;
  pending: number;
  withdrawn: number;
  held: number;
}

export interface WalletStatistics {
  totalSales: number;
  totalPlatformFees: number;
  netSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalRefunds: number;
  totalWithdrawals: number;
}

export interface BankDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
  branchName?: string;
  upiId?: string;
  isVerified: boolean;
  verifiedAt?: string;
}

export interface WalletTransaction {
  _id: string;
  type: 'credit' | 'debit' | 'withdrawal' | 'refund' | 'adjustment';
  amount: number;
  platformFee?: number;
  netAmount?: number;
  orderId?: string;
  orderNumber?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
}

export interface WalletSummary {
  balance: WalletBalance;
  statistics: WalletStatistics;
  bankDetails?: BankDetails;
  settlementCycle: 'instant' | 'daily' | 'weekly' | 'monthly';
  minWithdrawalAmount: number;
  isActive: boolean;
}

export interface TransactionHistoryResponse {
  transactions: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class WalletService {
  // Get wallet summary
  async getWalletSummary(): Promise<WalletSummary> {
    try {
      const response = await fetch(buildApiUrl('merchant/wallet'), {
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
        throw new Error(data.message || 'Failed to get wallet summary');
      }
    } catch (error: any) {
      console.error('Get wallet summary error:', error);
      throw new Error(error.message || 'Failed to get wallet summary');
    }
  }

  // Get transaction history
  async getTransactions(
    page: number = 1,
    limit: number = 20,
    type?: 'credit' | 'debit' | 'withdrawal' | 'refund' | 'adjustment'
  ): Promise<TransactionHistoryResponse> {
    try {
      let url = `merchant/wallet/transactions?page=${page}&limit=${limit}`;
      if (type) {
        url += `&type=${type}`;
      }

      const response = await fetch(buildApiUrl(url), {
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

      if (data.success) {
        return {
          transactions: data.data || [],
          pagination: data.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      } else {
        throw new Error(data.message || 'Failed to get transactions');
      }
    } catch (error: any) {
      console.error('Get transactions error:', error);
      throw new Error(error.message || 'Failed to get transactions');
    }
  }

  // Request withdrawal
  async requestWithdrawal(amount: number): Promise<{ success: boolean; message: string; transactionId?: string }> {
    try {
      const response = await fetch(buildApiUrl('merchant/wallet/withdraw'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: data.success,
        message: data.message || 'Withdrawal requested successfully',
        transactionId: data.data?.transactionId
      };
    } catch (error: any) {
      console.error('Request withdrawal error:', error);
      throw new Error(error.message || 'Failed to request withdrawal');
    }
  }

  // Update bank details
  async updateBankDetails(bankDetails: Omit<BankDetails, 'isVerified' | 'verifiedAt'>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(buildApiUrl('merchant/wallet/bank-details'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(bankDetails),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: data.success,
        message: data.message || 'Bank details updated successfully'
      };
    } catch (error: any) {
      console.error('Update bank details error:', error);
      throw new Error(error.message || 'Failed to update bank details');
    }
  }

  // Get wallet stats
  async getStats(): Promise<WalletStatistics> {
    try {
      const response = await fetch(buildApiUrl('merchant/wallet/stats'), {
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
        throw new Error(data.message || 'Failed to get wallet stats');
      }
    } catch (error: any) {
      console.error('Get wallet stats error:', error);
      throw new Error(error.message || 'Failed to get wallet stats');
    }
  }

  // Helper method to get auth token
  private async getAuthToken(): Promise<string> {
    return await AsyncStorage.getItem('auth_token') || '';
  }
}

// Create and export singleton instance
export const walletService = new WalletService();
export default walletService;
