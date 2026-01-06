import { apiClient } from './index';

// ============ TYPES ============

export interface Sponsor {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  brandCoinName: string;
  brandCoinLogo?: string;
  description?: string;
  website?: string;
  contactPerson?: {
    name: string;
    email: string;
    phone?: string;
  };
  totalEventsSponsored: number;
  totalParticipants: number;
  totalCoinsDistributed: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSponsorData {
  name: string;
  logo: string;
  brandCoinName: string;
  brandCoinLogo?: string;
  description?: string;
  website?: string;
  contactPerson?: {
    name: string;
    email: string;
    phone?: string;
  };
}

export interface UpdateSponsorData extends Partial<CreateSponsorData> {
  isActive?: boolean;
}

export interface SocialImpactEvent {
  _id: string;
  name: string;
  type: 'social_impact';
  description: string;
  status: string;
  eventType: string;
  sponsor?: Sponsor;
  organizer?: {
    name: string;
    logo?: string;
  };
  location?: {
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  eventDate?: string;
  eventTime?: {
    start: string;
    end: string;
  };
  rewards?: {
    rezCoins: number;
    brandCoins: number;
  };
  capacity?: {
    goal: number;
    enrolled: number;
  };
  impact?: {
    description: string;
    metric: string;
    targetValue: number;
    currentValue?: number;
  };
  eventRequirements?: Array<{
    text: string;
    isMandatory: boolean;
  }>;
  benefits?: string[];
  schedule?: Array<{
    time: string;
    activity: string;
  }>;
  contact?: {
    phone?: string;
    email?: string;
  };
  eventStatus?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isCsrActivity?: boolean;
  featured?: boolean;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventData {
  name: string;
  description: string;
  eventType: string;
  sponsorId?: string;
  organizer?: {
    name: string;
    logo?: string;
  };
  location?: {
    address: string;
    city: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  eventDate?: string;
  eventTime?: {
    start: string;
    end: string;
  };
  rewards?: {
    rezCoins: number;
    brandCoins: number;
  };
  capacity?: {
    goal: number;
  };
  impact?: {
    description: string;
    metric: string;
    targetValue: number;
  };
  eventRequirements?: Array<{
    text: string;
    isMandatory: boolean;
  }>;
  benefits?: string[];
  schedule?: Array<{
    time: string;
    activity: string;
  }>;
  contact?: {
    phone?: string;
    email?: string;
  };
  eventStatus?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  isCsrActivity?: boolean;
  featured?: boolean;
  image?: string;
}

export interface UpdateEventData extends Partial<CreateEventData> {}

export interface Participant {
  enrollmentId: string;
  user: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    profile?: {
      avatar?: string;
    };
  };
  status: 'registered' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  registeredAt: string;
  checkedInAt?: string;
  completedAt?: string;
  coinsAwarded?: {
    rez: number;
    brand: number;
  };
}

export interface SponsorAnalytics {
  totalEventsSponsored: number;
  totalParticipants: number;
  totalCoinsDistributed: number;
  activeEvents: number;
  completedEvents: number;
  events: SocialImpactEvent[];
}

export interface EventFilters {
  eventStatus?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  eventType?: string;
  sponsorId?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============ API SERVICE ============

class SocialImpactAdminService {
  // ======== SPONSOR MANAGEMENT ========

  /**
   * Get all sponsors
   */
  async getSponsors(params?: { page?: number; limit?: number; search?: string }) {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);

      const queryString = queryParams.toString();
      const url = queryString ? `sponsors?${queryString}` : 'sponsors';

      const response = await apiClient.get<any>(url);

      if (response.data) {
        return {
          sponsors: response.data.sponsors || response.data || [],
          pagination: response.data.pagination || null,
        };
      }

      return { sponsors: [], pagination: null };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get sponsors');
    }
  }

  /**
   * Get sponsor by ID
   */
  async getSponsorById(sponsorId: string): Promise<Sponsor> {
    try {
      const response = await apiClient.get<any>(`sponsors/${sponsorId}`);
      if (!response.data) {
        throw new Error('Sponsor not found');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get sponsor');
    }
  }

  /**
   * Create a new sponsor
   */
  async createSponsor(data: CreateSponsorData): Promise<Sponsor> {
    try {
      const response = await apiClient.post<any>('sponsors', data);
      if (!response.data) {
        throw new Error('Failed to create sponsor');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to create sponsor');
    }
  }

  /**
   * Update sponsor
   */
  async updateSponsor(sponsorId: string, data: UpdateSponsorData): Promise<Sponsor> {
    try {
      const response = await apiClient.put<any>(`sponsors/${sponsorId}`, data);
      if (!response.data) {
        throw new Error('Failed to update sponsor');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update sponsor');
    }
  }

  /**
   * Deactivate sponsor
   */
  async deactivateSponsor(sponsorId: string): Promise<void> {
    try {
      await apiClient.delete(`sponsors/${sponsorId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to deactivate sponsor');
    }
  }

  /**
   * Get sponsor analytics
   */
  async getSponsorAnalytics(sponsorId: string): Promise<SponsorAnalytics> {
    try {
      const response = await apiClient.get<any>(`sponsors/${sponsorId}/analytics`);
      return response.data || {
        totalEventsSponsored: 0,
        totalParticipants: 0,
        totalCoinsDistributed: 0,
        activeEvents: 0,
        completedEvents: 0,
        events: [],
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get sponsor analytics');
    }
  }

  // ======== EVENT MANAGEMENT ========

  /**
   * Get all social impact events
   */
  async getEvents(filters: EventFilters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.eventStatus) params.append('eventStatus', filters.eventStatus);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.sponsorId) params.append('sponsorId', filters.sponsorId);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = queryString ? `programs/social-impact?${queryString}` : 'programs/social-impact';

      const response = await apiClient.get<any>(url);

      return {
        events: response.data || [],
        pagination: response.pagination || null,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get events');
    }
  }

  /**
   * Get event by ID
   */
  async getEventById(eventId: string): Promise<SocialImpactEvent> {
    try {
      const response = await apiClient.get<any>(`programs/social-impact/${eventId}`);
      if (!response.data) {
        throw new Error('Event not found');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get event');
    }
  }

  /**
   * Create a new social impact event
   */
  async createEvent(data: CreateEventData): Promise<SocialImpactEvent> {
    try {
      const response = await apiClient.post<any>('programs/social-impact', data);
      if (!response.data) {
        throw new Error('Failed to create event');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to create event');
    }
  }

  /**
   * Update event
   */
  async updateEvent(eventId: string, data: UpdateEventData): Promise<SocialImpactEvent> {
    try {
      const response = await apiClient.put<any>(`programs/social-impact/${eventId}`, data);
      if (!response.data) {
        throw new Error('Failed to update event');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update event');
    }
  }

  // ======== PARTICIPANT MANAGEMENT ========

  /**
   * Get event participants
   */
  async getEventParticipants(
    eventId: string,
    params?: { status?: string; page?: number; limit?: number }
  ): Promise<{ participants: Participant[]; pagination?: Pagination }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const queryString = queryParams.toString();
      const url = queryString
        ? `programs/social-impact/${eventId}/participants?${queryString}`
        : `programs/social-impact/${eventId}/participants`;

      const response = await apiClient.get<any>(url);

      return {
        participants: response.data || [],
        pagination: response.pagination,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to get participants');
    }
  }

  /**
   * Check in a participant
   */
  async checkInParticipant(eventId: string, userId: string): Promise<Participant> {
    try {
      const response = await apiClient.post<any>(`programs/social-impact/${eventId}/check-in`, { userId });
      if (!response.data) {
        throw new Error('Failed to check in participant');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to check in participant');
    }
  }

  /**
   * Complete a participant's participation and award coins
   */
  async completeParticipant(eventId: string, userId: string, impactValue?: number): Promise<Participant> {
    try {
      const response = await apiClient.post<any>(`programs/social-impact/${eventId}/complete`, {
        userId,
        impactValue,
      });
      if (!response.data) {
        throw new Error('Failed to complete participant');
      }
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to complete participant');
    }
  }

  /**
   * Bulk complete participants
   */
  async bulkCompleteParticipants(
    eventId: string,
    userIds: string[]
  ): Promise<{ success: number; failed: number; errors: any[] }> {
    try {
      const response = await apiClient.post<any>(`programs/social-impact/${eventId}/bulk-complete`, { userIds });
      return response.data || { success: 0, failed: 0, errors: [] };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to bulk complete participants');
    }
  }

  // ======== UTILITY METHODS ========

  /**
   * Get event type options
   */
  getEventTypes(): { value: string; label: string }[] {
    return [
      { value: 'blood-donation', label: 'Blood Donation' },
      { value: 'tree-plantation', label: 'Tree Plantation' },
      { value: 'beach-cleanup', label: 'Beach Cleanup' },
      { value: 'digital-literacy', label: 'Digital Literacy' },
      { value: 'food-drive', label: 'Food Drive' },
      { value: 'health-camp', label: 'Health Camp' },
      { value: 'skill-training', label: 'Skill Training' },
      { value: 'women-empowerment', label: 'Women Empowerment' },
      { value: 'education', label: 'Education' },
      { value: 'environment', label: 'Environment' },
      { value: 'other', label: 'Other' },
    ];
  }

  /**
   * Get event status options
   */
  getEventStatuses(): { value: string; label: string; color: string }[] {
    return [
      { value: 'upcoming', label: 'Upcoming', color: '#3B82F6' },
      { value: 'ongoing', label: 'Ongoing', color: '#10B981' },
      { value: 'completed', label: 'Completed', color: '#6B7280' },
      { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
    ];
  }

  /**
   * Get participant status options
   */
  getParticipantStatuses(): { value: string; label: string; color: string }[] {
    return [
      { value: 'registered', label: 'Registered', color: '#3B82F6' },
      { value: 'checked_in', label: 'Checked In', color: '#F59E0B' },
      { value: 'completed', label: 'Completed', color: '#10B981' },
      { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
      { value: 'no_show', label: 'No Show', color: '#6B7280' },
    ];
  }

  /**
   * Get event type emoji
   */
  getEventTypeEmoji(eventType?: string): string {
    const emojiMap: Record<string, string> = {
      'blood-donation': '🩸',
      'tree-plantation': '🌳',
      'beach-cleanup': '🏖️',
      'digital-literacy': '💻',
      'food-drive': '🍛',
      'health-camp': '🏥',
      'skill-training': '👩‍💼',
      'women-empowerment': '👩‍💼',
      'education': '📚',
      'environment': '🌍',
      'other': '✨',
    };
    return emojiMap[eventType || 'other'] || '✨';
  }

  /**
   * Format event date
   */
  formatEventDate(dateString?: string): string {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}

export const socialImpactAdminService = new SocialImpactAdminService();
export default socialImpactAdminService;
