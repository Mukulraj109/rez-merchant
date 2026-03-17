import { buildApiUrl } from '../../config/api';
import { storageService } from '../storage';

export interface DashboardMetrics {
  revenue: {
    total: number;
    trend: number;
    change: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    trend: number;
  };
  products: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
  };
  customers: {
    total: number;
    newToday: number;
    trend: number;
  };
  cashback: {
    totalPending: number;
    totalPaid: number;
    requests: number;
  };
}

export interface RecentActivity {
  type: 'order' | 'product' | 'cashback' | 'review';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export interface TopProduct {
  productId: string;
  name: string;
  sales: number;
  revenue: number;
  image?: string;
}

export interface SalesData {
  date: string;
  amount: number;
  orders: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  recentActivity: RecentActivity[];
  topProducts: TopProduct[];
  salesData: SalesData[];
  lowStockAlerts: Array<{
    productId: string;
    name: string;
    currentStock: number;
    threshold: number;
  }>;
}

export interface StorePerformance {
  storeId: string;
  name: string;
  logo: string | null;
  slug: string;
  isActive: boolean;
  rating: number;
  ratingCount: number;
  category: string;
  location: string;
  cashbackPercent: number;
  monthlyOrders: number;
  monthlyRevenue: number;
  monthlyPayout: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgOrderValue: number;
  uniqueCustomers: number;
  todayOrders: number;
  todayRevenue: number;
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  pendingCashbackCount: number;
  pendingCashbackAmount: number;
}

export interface StorePerformanceResponse {
  stores: StorePerformance[];
  summary: {
    totalStores: number;
    activeStores: number;
    totalMonthlyRevenue: number;
    totalMonthlyOrders: number;
    totalPendingOrders: number;
  };
}

export interface ActionItem {
  id: string;
  type: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  storeName: string;
  storeId: string;
  count: number;
  deepLink: string;
  icon: string;
  color: string;
}

export interface ActionItemsResponse {
  actionItems: ActionItem[];
  summary: {
    total: number;
    urgent: number;
    high: number;
    medium: number;
  };
}

export interface CustomerPayment {
  type: 'order' | 'store_payment';
  id: string;
  orderNumber: string | null;
  customerName: string;
  customerPhone: string;
  customerImage: string | null;
  storeName: string;
  storeId: string;
  amount: number;
  merchantPayout: number;
  paymentMethod: string;
  coinsUsed: number;
  status: string;
  fulfillmentType: string;
  createdAt: string;
}

export interface CustomerPaymentsResponse {
  payments: CustomerPayment[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class DashboardService {
  // Get complete dashboard data
  async getDashboardData(storeId?: string): Promise<DashboardData> {
    try {
      const url = storeId 
        ? buildApiUrl(`merchant/dashboard?storeId=${storeId}`)
        : buildApiUrl('merchant/dashboard');
      const response = await fetch(url, {
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
        throw new Error(data.message || 'Failed to get dashboard data');
      }
    } catch (error: any) {
      if (__DEV__) console.error('Get dashboard data error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get dashboard data');
    }
  }

  // Get metrics only
  async getMetrics(storeId?: string): Promise<DashboardMetrics> {
    try {
      const url = storeId 
        ? buildApiUrl(`merchant/dashboard/metrics?storeId=${storeId}`)
        : buildApiUrl('merchant/dashboard/metrics');
      const response = await fetch(url, {
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
        throw new Error(data.message || 'Failed to get metrics');
      }
    } catch (error: any) {
      if (__DEV__) console.error('Get metrics error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get metrics');
    }
  }

  // Get recent activity
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const response = await fetch(buildApiUrl(`merchant/dashboard/activity?limit=${limit}`), {
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
        throw new Error(data.message || 'Failed to get recent activity');
      }
    } catch (error: any) {
      if (__DEV__) console.error('Get recent activity error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get recent activity');
    }
  }

  // Get top products
  async getTopProducts(limit: number = 10, period: '7d' | '30d' | '90d' = '30d'): Promise<TopProduct[]> {
    try {
      const response = await fetch(buildApiUrl(`merchant/dashboard/top-products?limit=${limit}&period=${period}`), {
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
        throw new Error(data.message || 'Failed to get top products');
      }
    } catch (error: any) {
      if (__DEV__) console.error('Get top products error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get top products');
    }
  }

  // Get sales data for chart
  async getSalesData(period: '7d' | '30d' | '90d' | '1y' = '30d'): Promise<SalesData[]> {
    try {
      const response = await fetch(buildApiUrl(`merchant/dashboard/sales-data?period=${period}`), {
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
        throw new Error(data.message || 'Failed to get sales data');
      }
    } catch (error: any) {
      if (__DEV__) console.error('Get sales data error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get sales data');
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(): Promise<Array<{ productId: string; name: string; currentStock: number; threshold: number }>> {
    try {
      const response = await fetch(buildApiUrl('merchant/dashboard/low-stock'), {
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
        throw new Error(data.message || 'Failed to get low stock alerts');
      }
    } catch (error: any) {
      if (__DEV__) console.error('Get low stock alerts error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get low stock alerts');
    }
  }

  // Get all dashboard data including overview - returns data in format expected by dashboard component
  async getAllDashboardData(storeId?: string): Promise<{
    metrics?: {
      totalRevenue: number;
      monthlyRevenue: number;
      revenueGrowth: number;
      averageOrderValue: number;
      totalOrders: number;
      monthlyOrders: number;
      ordersGrowth: number;
      pendingOrders: number;
      completedOrders: number;
      totalProducts: number;
      activeProducts: number;
      lowStockProducts: number;
      totalCustomers: number;
      monthlyCustomers: number;
      customerGrowth: number;
      totalCashbackPaid: number;
      pendingCashback: number;
      profitMargin: number;
    };
    overview?: {
      quickStats?: {
        totalProducts: number;
        totalOrders: number;
        pendingOrders: number;
        pendingCashback: number;
      };
      recentActivity?: {
        orders?: any[];
        products?: any[];
      };
    };
  }> {
    try {
      // Build URLs with optional storeId
      const dashboardUrl = storeId 
        ? buildApiUrl(`merchant/dashboard?storeId=${storeId}`)
        : buildApiUrl('merchant/dashboard');
      const overviewUrl = storeId 
        ? buildApiUrl(`merchant/dashboard/overview?storeId=${storeId}`)
        : buildApiUrl('merchant/dashboard/overview');
      
      // Fetch main dashboard data
      const dashboardResponse = await fetch(dashboardUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      let dashboardData = null;
      if (dashboardResponse.ok) {
        const response = await dashboardResponse.json();
        if (response.success && response.data) {
          dashboardData = response.data;
        }
      }
      
      // Fetch overview data separately
      const overviewResponse = await fetch(overviewUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
      });

      let overview = null;
      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        if (overviewData.success && overviewData.data) {
          overview = overviewData.data;
        }
      }

      // Transform dashboard data to match expected format
      // Backend returns metrics as objects with { value, change, trend, period }
      // We need to extract the values
      const metrics = dashboardData?.metrics ? {
        totalRevenue: typeof dashboardData.metrics.totalRevenue === 'object' 
          ? (dashboardData.metrics.totalRevenue.value || 0)
          : (dashboardData.metrics.totalRevenue || 0),
        monthlyRevenue: dashboardData.metrics.monthlyRevenue || 0,
        revenueGrowth: typeof dashboardData.metrics.totalRevenue === 'object'
          ? (dashboardData.metrics.totalRevenue.change || 0)
          : (dashboardData.metrics.revenueGrowth || 0),
        averageOrderValue: dashboardData.metrics.averageOrderValue || 0,
        totalOrders: typeof dashboardData.metrics.totalOrders === 'object'
          ? (dashboardData.metrics.totalOrders.value || 0)
          : (dashboardData.metrics.totalOrders || 0),
        monthlyOrders: dashboardData.metrics.monthlyOrders || 0,
        ordersGrowth: typeof dashboardData.metrics.totalOrders === 'object'
          ? (dashboardData.metrics.totalOrders.change || 0)
          : (dashboardData.metrics.ordersGrowth || 0),
        pendingOrders: dashboardData.metrics.pendingOrders || 0,
        completedOrders: dashboardData.metrics.completedOrders || 0,
        totalProducts: typeof dashboardData.metrics.totalProducts === 'object'
          ? (dashboardData.metrics.totalProducts.value || 0)
          : (dashboardData.metrics.totalProducts || 0),
        activeProducts: dashboardData.metrics.activeProducts || 0,
        lowStockProducts: dashboardData.metrics.lowStockProducts || 0,
        totalCustomers: typeof dashboardData.metrics.totalCustomers === 'object'
          ? (dashboardData.metrics.totalCustomers.value || 0)
          : (dashboardData.metrics.totalCustomers || 0),
        monthlyCustomers: dashboardData.metrics.monthlyCustomers || 0,
        customerGrowth: typeof dashboardData.metrics.totalCustomers === 'object'
          ? (dashboardData.metrics.totalCustomers.change || 0)
          : (dashboardData.metrics.customerGrowth || 0),
        totalCashbackPaid: dashboardData.metrics.totalCashbackPaid || 0,
        pendingCashback: dashboardData.metrics.pendingCashback || 0,
        profitMargin: dashboardData.metrics.profitMargin || 0,
      } : undefined;

      return {
        metrics,
        overview,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Get all dashboard data error:', error);
      // Return empty data structure on error
      return {
        metrics: {
          totalRevenue: 0,
          monthlyRevenue: 0,
          revenueGrowth: 0,
          averageOrderValue: 0,
          totalOrders: 0,
          monthlyOrders: 0,
          ordersGrowth: 0,
          pendingOrders: 0,
          completedOrders: 0,
          totalProducts: 0,
          activeProducts: 0,
          lowStockProducts: 0,
          totalCustomers: 0,
          monthlyCustomers: 0,
          customerGrowth: 0,
          totalCashbackPaid: 0,
          pendingCashback: 0,
          profitMargin: 0,
        },
        overview: {
          quickStats: {
            totalProducts: 0,
            totalOrders: 0,
            pendingOrders: 0,
            pendingCashback: 0,
          },
        },
      };
    }
  }

  // Get customer payments with details for dashboard feed
  async getCustomerPayments(storeId?: string, page: number = 1, limit: number = 10): Promise<CustomerPaymentsResponse> {
    try {
      const params = new URLSearchParams();
      if (storeId) params.append('storeId', storeId);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const url = buildApiUrl(`merchant/dashboard/customer-payments?${params.toString()}`);
      const response = await fetch(url, {
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
        throw new Error(data.message || 'Failed to get customer payments');
      }
    } catch (error: any) {
      if (__DEV__) console.error('Get customer payments error:', error);
      return { payments: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, hasNextPage: false, hasPrevPage: false } };
    }
  }

  // Get per-store performance breakdown
  async getStorePerformance(): Promise<StorePerformanceResponse> {
    try {
      const url = buildApiUrl('merchant/dashboard/store-performance');
      const response = await fetch(url, {
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
      }
      throw new Error(data.message || 'Failed to get store performance');
    } catch (error: any) {
      if (__DEV__) console.error('Get store performance error:', error);
      return { stores: [], summary: { totalStores: 0, activeStores: 0, totalMonthlyRevenue: 0, totalMonthlyOrders: 0, totalPendingOrders: 0 } };
    }
  }

  // Get action items / to-do list for merchant
  async getActionItems(storeId?: string): Promise<ActionItemsResponse> {
    try {
      const params = new URLSearchParams();
      if (storeId) params.append('storeId', storeId);

      const url = buildApiUrl(`merchant/dashboard/action-items?${params.toString()}`);
      const response = await fetch(url, {
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
      }
      throw new Error(data.message || 'Failed to get action items');
    } catch (error: any) {
      if (__DEV__) console.error('Get action items error:', error);
      return { actionItems: [], summary: { total: 0, urgent: 0, high: 0, medium: 0 } };
    }
  }

  // Helper method to get auth token
  private async getAuthToken(): Promise<string> {
    return (await storageService.getAuthToken()) || '';
  }
}

// Create and export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;
