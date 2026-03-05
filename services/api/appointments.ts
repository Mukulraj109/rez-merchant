import { apiClient } from './index';

export interface ServiceAppointment {
  _id: string;
  appointmentNumber: string;
  store: string;
  user: {
    _id: string;
    fullName?: string;
    phoneNumber?: string;
  };
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  specialInstructions?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  staffMember?: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  todayCount: number;
}

class AppointmentService {
  async getStoreAppointments(
    storeId: string,
    params?: { date?: string; status?: string; page?: number; limit?: number }
  ): Promise<{ appointments: ServiceAppointment[]; pagination: any }> {
    const queryParams: any = { ...params };
    if (queryParams.status === 'all') delete queryParams.status;
    const response = await apiClient.get(`/service-appointments/store/${storeId}`, { params: queryParams });
    return response.data;
  }

  async getAppointment(appointmentId: string): Promise<ServiceAppointment> {
    const response = await apiClient.get(`/service-appointments/${appointmentId}`);
    return response.data;
  }

  async updateStatus(
    appointmentId: string,
    status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
    reason?: string
  ): Promise<ServiceAppointment> {
    if (status === 'cancelled') {
      const response = await apiClient.put(`/service-appointments/${appointmentId}/cancel`, {
        reason: reason || 'Cancelled by merchant',
      });
      return response.data;
    }
    // For confirm/in_progress/completed — use the appointment's own method
    const response = await apiClient.put(`/service-appointments/${appointmentId}/status`, { status });
    return response.data;
  }

  async getAvailableSlots(
    storeId: string,
    date: string
  ): Promise<Array<{ time: string; available: boolean }>> {
    const response = await apiClient.get(`/service-appointments/slots/${storeId}`, { params: { date } });
    return response.data;
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;
