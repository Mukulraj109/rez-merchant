import { apiClient } from './client';

export interface MerchantConversation {
  _id: string;
  customerId: {
    _id: string;
    fullName?: string;
    phoneNumber?: string;
    avatar?: string;
  };
  storeId: string;
  status: 'active' | 'archived' | 'blocked';
  unreadCount: number;
  totalMessages: number;
  lastMessage?: {
    content: string;
    sentAt: string;
    senderType: 'customer' | 'store' | 'system';
  };
  lastActivityAt: string;
  createdAt: string;
}

export interface MerchantMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  senderType: 'customer' | 'store' | 'system';
  type: 'text' | 'image' | 'video' | 'file' | 'location' | 'product' | 'order' | 'system';
  content: string;
  attachments?: Array<{
    url: string;
    type: string;
    size?: number;
    thumbnail?: string;
  }>;
  product?: {
    productId: string;
    name: string;
    price: number;
    image?: string;
  };
  order?: {
    orderId: string;
    orderNumber: string;
  };
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: string;
  createdAt: string;
}

export interface ConversationListResponse {
  conversations: MerchantConversation[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  summary: {
    totalConversations: number;
    unreadCount: number;
    activeConversations: number;
  };
}

export interface MessagesListResponse {
  messages: MerchantMessage[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
  conversation: MerchantConversation;
}

class MerchantMessagingService {
  async getConversations(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ConversationListResponse> {
    const response = await apiClient.get('/messages/conversations', { params });
    return response.data;
  }

  async getConversation(conversationId: string): Promise<MerchantConversation> {
    const response = await apiClient.get(`/messages/conversations/${conversationId}`);
    return response.data;
  }

  async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<MessagesListResponse> {
    const response = await apiClient.get(
      `/messages/conversations/${conversationId}/messages`,
      { params: { page, limit } }
    );
    return response.data;
  }

  async sendMessage(
    conversationId: string,
    content: string,
    type: string = 'text'
  ): Promise<MerchantMessage> {
    const response = await apiClient.post(
      `/messages/conversations/${conversationId}/messages`,
      { content, type }
    );
    return response.data;
  }

  async markAsRead(conversationId: string): Promise<void> {
    await apiClient.patch(`/messages/conversations/${conversationId}/read`);
  }

  async archiveConversation(conversationId: string): Promise<void> {
    await apiClient.patch(`/messages/conversations/${conversationId}/archive`);
  }

  async unarchiveConversation(conversationId: string): Promise<void> {
    await apiClient.patch(`/messages/conversations/${conversationId}/unarchive`);
  }

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    const response = await apiClient.get('/messages/unread/count');
    return response.data;
  }
}

export const messagingService = new MerchantMessagingService();
export default messagingService;
