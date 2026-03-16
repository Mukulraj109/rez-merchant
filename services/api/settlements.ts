import { buildApiUrl } from '../../config/api';
import { storageService } from '../storage';

export interface SettlementRecord {
  _id: string;
  merchant: string;
  store: { _id: string; name?: string; logo?: string } | string;
  campaign: { _id: string; title?: string; slug?: string } | null;
  campaignType: string;
  cycleId: string;
  rewardIssued: number;
  rewardRedeemed: number;
  pendingAmount: number;
  settledAmount: number;
  issuanceCount: number;
  redemptionCount: number;
  status: 'active' | 'pending_settlement' | 'settled' | 'disputed' | 'void';
  settlementDate: string | null;
  settlementTransactionId: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementSummary {
  totalIssued: number;
  totalRedeemed: number;
  totalPending: number;
  totalSettled: number;
  activeCount: number;
  pendingCount: number;
  settledCount: number;
  disputedCount: number;
  gst: {
    platformFee: number;
    cgst: number;
    sgst: number;
    totalGst: number;
  };
  recentCycles: Array<{
    _id: string;
    totalSettled: number;
    totalPending: number;
    status: string;
    lastSettlementDate: string | null;
  }>;
}

export interface SettlementListResponse {
  records: SettlementRecord[];
  totals: {
    totalIssued: number;
    totalRedeemed: number;
    totalPending: number;
    totalSettled: number;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class SettlementService {
  private async getAuthToken(): Promise<string> {
    return (await storageService.getAuthToken()) || '';
  }

  /** GET /api/merchant/liability — paginated settlement records */
  async getSettlements(params?: {
    page?: number;
    limit?: number;
    status?: string;
    cycleId?: string;
  }): Promise<SettlementListResponse> {
    try {
      const qs: string[] = [];
      if (params?.page) qs.push(`page=${params.page}`);
      if (params?.limit) qs.push(`limit=${params.limit}`);
      if (params?.status && params.status !== 'all') qs.push(`status=${encodeURIComponent(params.status)}`);
      if (params?.cycleId) qs.push(`cycleId=${encodeURIComponent(params.cycleId)}`);

      const url = qs.length ? `merchant/liability?${qs.join('&')}` : 'merchant/liability';
      const response = await fetch(buildApiUrl(url), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      const data = await response.json();
      if (data.success && data.data) return data.data;
      return {
        records: [],
        totals: { totalIssued: 0, totalRedeemed: 0, totalPending: 0, totalSettled: 0 },
        pagination: { currentPage: 1, totalPages: 0, totalItems: 0, hasNextPage: false, hasPrevPage: false },
      };
    } catch (error) {
      console.error('[Settlement] Error fetching settlements:', error);
      throw error;
    }
  }

  /** GET /api/merchant/liability/summary — aggregated stats */
  async getSummary(): Promise<SettlementSummary | null> {
    try {
      const response = await fetch(buildApiUrl('merchant/liability/summary'), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`,
        },
      });

      const data = await response.json();
      if (data.success && data.data) return data.data;
      return null;
    } catch (error) {
      console.error('[Settlement] Error fetching summary:', error);
      return null;
    }
  }

  /** Returns the download URL for a payout statement PDF */
  getPayoutStatementUrl(cycleId: string): string {
    return buildApiUrl(`merchant/liability/payout-statement/${encodeURIComponent(cycleId)}`);
  }

  /** Returns the download URL for a liability statement PDF */
  getLiabilityStatementUrl(cycleId: string): string {
    return buildApiUrl(`merchant/liability/statement/${encodeURIComponent(cycleId)}`);
  }

  /** Download payout statement as blob (for native share/save) */
  async downloadPayoutStatement(cycleId: string): Promise<Blob> {
    const response = await fetch(this.getPayoutStatementUrl(cycleId), {
      headers: { 'Authorization': `Bearer ${await this.getAuthToken()}` },
    });
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    return response.blob();
  }
}

export const settlementService = new SettlementService();
export default settlementService;
