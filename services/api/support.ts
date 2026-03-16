import { apiClient } from './index';

export interface MerchantTicket {
  _id: string;
  ticketNumber: string;
  user: { _id: string; fullName?: string; phoneNumber?: string; email?: string };
  merchant?: { _id: string; name?: string };
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: { _id: string; fullName?: string };
  messages: Array<{
    sender: string;
    senderType: 'user' | 'agent' | 'system';
    message: string;
    attachments?: string[];
    timestamp: string;
    isRead: boolean;
  }>;
  resolution?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MerchantTicketStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  openCount: number;
  inProgressCount: number;
}

class MerchantSupportService {
  async listTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
  }): Promise<{ tickets: MerchantTicket[]; pagination: { page: number; limit: number; total: number; pages: number } }> {
    try {
      const queryParams: Record<string, string> = {};
      if (params?.page) queryParams.page = String(params.page);
      if (params?.limit) queryParams.limit = String(params.limit);
      if (params?.status && params.status !== 'all') queryParams.status = params.status;
      if (params?.category && params.category !== 'all') queryParams.category = params.category;
      if (params?.search) queryParams.search = params.search;

      const qs = Object.entries(queryParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      const url = qs ? `/support/tickets?${qs}` : '/support/tickets';
      const response = await apiClient.get(url);
      return response.data || { tickets: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    } catch (error) {
      console.error('[Merchant Support] Error listing tickets:', error);
      return { tickets: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
  }

  async getTicket(id: string): Promise<MerchantTicket | null> {
    try {
      const response = await apiClient.get(`/support/tickets/${id}`);
      return response.data?.ticket || null;
    } catch (error) {
      console.error('[Merchant Support] Error fetching ticket:', error);
      return null;
    }
  }

  async replyToTicket(id: string, message: string, attachments?: string[]): Promise<boolean> {
    try {
      const response = await apiClient.post(`/support/tickets/${id}/messages`, { message, attachments });
      return response.data?.success !== false;
    } catch (error) {
      console.error('[Merchant Support] Error replying to ticket:', error);
      return false;
    }
  }

  async getStatistics(): Promise<MerchantTicketStats | null> {
    try {
      const response = await apiClient.get('/support/statistics');
      return response.data || null;
    } catch (error) {
      console.error('[Merchant Support] Error fetching statistics:', error);
      return null;
    }
  }
}

export const merchantSupportService = new MerchantSupportService();
export default merchantSupportService;
