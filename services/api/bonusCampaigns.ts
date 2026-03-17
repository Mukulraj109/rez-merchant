import { apiClient } from './client';

// ============================================
// TYPES
// ============================================

export type BonusCampaignType =
  | 'cashback_boost'
  | 'bank_offer'
  | 'bill_upload_bonus'
  | 'category_multiplier'
  | 'first_transaction_bonus'
  | 'festival_offer';

export interface BonusCampaignReward {
  type: 'percentage' | 'flat' | 'multiplier';
  value: number;
  capPerUser: number;
  coinType: 'rez' | 'branded';
}

export interface BonusCampaignDisplay {
  icon: string;
  bannerImage?: string;
  partnerLogo?: string;
  backgroundColor?: string;
  badgeText?: string;
  featured: boolean;
  priority: number;
}

export interface BonusCampaign {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description?: string;
  campaignType: BonusCampaignType;
  reward: BonusCampaignReward;
  display: BonusCampaignDisplay;
  schedule: {
    startTime: string;
    endTime: string;
  };
  deepLink?: {
    screen: string;
    params?: Record<string, any>;
  };
  maxClaimsPerUser: number;
  terms?: string[];
  fundingSource?: {
    partnerName?: string;
    partnerLogo?: string;
  };
  userState?: string;
  userClaimCount?: number;
  userTotalReward?: number;
}

// ============================================
// SERVICE
// ============================================

class BonusCampaignService {
  /**
   * Get all active bonus campaigns
   * Uses the public user-facing endpoint: GET /api/bonus-zone/campaigns
   */
  async getActiveCampaigns(): Promise<{ campaigns: BonusCampaign[]; total: number }> {
    try {
      const response = await apiClient.get<any>('bonus-zone/campaigns');

      if (response.data?.campaigns) {
        return {
          campaigns: response.data.campaigns,
          total: response.data.total || response.data.campaigns.length,
        };
      }

      return { campaigns: [], total: 0 };
    } catch (error: any) {
      console.error('[BonusCampaigns] Failed to fetch active campaigns:', error.message);
      return { campaigns: [], total: 0 };
    }
  }

  /**
   * Get a single campaign by slug
   * Uses: GET /api/bonus-zone/campaigns/:slug
   */
  async getCampaignBySlug(slug: string): Promise<BonusCampaign | null> {
    try {
      const response = await apiClient.get<any>(`bonus-zone/campaigns/${slug}`);
      return response.data?.campaign || null;
    } catch (error: any) {
      console.error('[BonusCampaigns] Failed to fetch campaign detail:', error.message);
      return null;
    }
  }
}

export const bonusCampaignService = new BonusCampaignService();
export default bonusCampaignService;
