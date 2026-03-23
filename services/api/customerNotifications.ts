/**
 * Customer Notifications API Service
 * Handles sending push notifications to store customers
 */

import { apiClient, ApiResponse } from './client';

export interface SendNotificationRequest {
  title: string;
  body: string;
  targetType: 'all' | 'recent' | 'loyal';
  storeId: string;
}

export interface SendNotificationResponse {
  sent: number;
  targetCount: number;
  title: string;
  targetType: string;
}

export interface SentNotification {
  title: string;
  body: string;
  sentAt: string;
}

export interface SentNotificationsResponse {
  notifications: SentNotification[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class CustomerNotificationsService {
  /**
   * Send push notification to store customers
   */
  async sendNotification(data: SendNotificationRequest): Promise<ApiResponse<SendNotificationResponse>> {
    return apiClient.post('/merchant/customer-notifications/send', data);
  }

  /**
   * Get history of sent notifications (paginated)
   */
  async getSentNotifications(
    storeId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<SentNotificationsResponse>> {
    return apiClient.get('/merchant/customer-notifications/sent', {
      params: { storeId, page, limit },
    });
  }
}

export const customerNotificationsService = new CustomerNotificationsService();
export default customerNotificationsService;
