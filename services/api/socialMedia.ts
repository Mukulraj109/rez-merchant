// Social Media Verification API Service
// For merchant verification of user Instagram posts

import { storageService } from '../storage';
import { getApiUrl } from '../../config/api';

export interface SocialMediaUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
}

export interface SocialMediaOrder {
  _id: string;
  orderNumber: string;
  totals?: {
    total: number;
  };
  createdAt: string;
}

export interface SocialMediaStore {
  _id: string;
  name: string;
  logo?: string;
}

export interface SocialMediaPost {
  _id: string;
  user: SocialMediaUser;
  order: SocialMediaOrder;
  store: SocialMediaStore;
  platform: 'instagram' | 'facebook' | 'twitter' | 'tiktok';
  postUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  cashbackAmount: number;
  cashbackPercentage: number;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  metadata?: {
    orderNumber?: string;
    postId?: string;
  };
}

export interface SocialMediaStats {
  total: number;
  totalCashbackAmount: number;
  pending: number;
  pendingAmount: number;
  approved: number;
  approvedAmount: number;
  credited: number;
  creditedAmount: number;
  rejected: number;
  approvalRate: number;
}

export interface SocialMediaListResponse {
  posts: SocialMediaPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SocialMediaFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'credited' | 'all';
  page?: number;
  limit?: number;
  storeId?: string; // Filter by specific store
}

class SocialMediaService {
  /**
   * Get social media posts for merchant's store
   */
  async getSocialMediaPosts(filters?: SocialMediaFilters): Promise<SocialMediaListResponse> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.status && filters.status !== 'all') params.append('status', filters.status);
        if (filters.storeId) params.append('storeId', filters.storeId); // Filter by selected store
      }

      const response = await fetch(getApiUrl(`merchant/social-media-posts?${params}`), {
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
        throw new Error(data.message || 'Failed to get social media posts');
      }
    } catch (error: any) {
      console.error('Get social media posts error:', error);
      throw new Error(error.message || 'Failed to get social media posts');
    }
  }

  /**
   * Get single social media post details
   */
  async getSocialMediaPost(postId: string): Promise<SocialMediaPost> {
    try {
      const response = await fetch(getApiUrl(`merchant/social-media-posts/${postId}`), {
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
        return data.data.post;
      } else {
        throw new Error(data.message || 'Failed to get social media post');
      }
    } catch (error: any) {
      console.error('Get social media post error:', error);
      throw new Error(error.message || 'Failed to get social media post');
    }
  }

  /**
   * Approve a social media post and credit REZ coins to user
   */
  async approveSocialMediaPost(postId: string, notes?: string): Promise<{ post: any; walletUpdate: any }> {
    try {
      const response = await fetch(getApiUrl(`merchant/social-media-posts/${postId}/approve`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to approve social media post');
      }
    } catch (error: any) {
      console.error('Approve social media post error:', error);
      throw new Error(error.message || 'Failed to approve social media post');
    }
  }

  /**
   * Reject a social media post with reason
   */
  async rejectSocialMediaPost(postId: string, reason: string): Promise<{ post: any }> {
    try {
      const response = await fetch(getApiUrl(`merchant/social-media-posts/${postId}/reject`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to reject social media post');
      }
    } catch (error: any) {
      console.error('Reject social media post error:', error);
      throw new Error(error.message || 'Failed to reject social media post');
    }
  }

  /**
   * Get social media verification statistics
   */
  async getSocialMediaStats(): Promise<SocialMediaStats> {
    try {
      const response = await fetch(getApiUrl('merchant/social-media-posts/stats'), {
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
        return data.data.stats;
      } else {
        throw new Error(data.message || 'Failed to get social media stats');
      }
    } catch (error: any) {
      console.error('Get social media stats error:', error);
      // Return default stats on error
      return {
        total: 0,
        totalCashbackAmount: 0,
        pending: 0,
        pendingAmount: 0,
        approved: 0,
        approvedAmount: 0,
        credited: 0,
        creditedAmount: 0,
        rejected: 0,
        approvalRate: 0
      };
    }
  }

  /**
   * Get status options for filtering
   */
  getStatusOptions(): Array<{ label: string; value: string; color: string }> {
    return [
      { label: 'All', value: 'all', color: '#6b7280' },
      { label: 'Pending', value: 'pending', color: '#f59e0b' },
      { label: 'Approved', value: 'approved', color: '#10b981' },
      { label: 'Credited', value: 'credited', color: '#6366f1' },
      { label: 'Rejected', value: 'rejected', color: '#ef4444' }
    ];
  }

  /**
   * Get platform display info
   */
  getPlatformInfo(platform: string): { name: string; icon: string; color: string } {
    const platforms: { [key: string]: { name: string; icon: string; color: string } } = {
      instagram: { name: 'Instagram', icon: 'logo-instagram', color: '#E1306C' },
      facebook: { name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
      twitter: { name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
      tiktok: { name: 'TikTok', icon: 'musical-notes', color: '#000000' }
    };
    return platforms[platform] || { name: platform, icon: 'globe', color: '#6b7280' };
  }

  // Helper method to get auth token
  private async getAuthToken(): Promise<string> {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('auth_token') || '';
  }
}

// Create and export singleton instance
export const socialMediaService = new SocialMediaService();
export default socialMediaService;
