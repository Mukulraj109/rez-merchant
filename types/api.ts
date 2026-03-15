// Base API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  ownerName: string;
  businessName: string;
  phone: string;
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
  merchant: Merchant;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  merchantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Merchant {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone?: string;
  businessAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  verificationStatus?: string;
  settings?: {
    timezone: string;
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// Common enums
// Canonical order status — must match backend Order model schema
export type OrderStatus = 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelling' | 'cancelled' | 'returned' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partial';
export type CashbackStatus = 'pending' | 'approved' | 'rejected' | 'paid' | 'expired';
export type RiskLevel = 'low' | 'medium' | 'high';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'digital_wallet' | 'cash' | 'other';

// Order types — matches backend transformOrderForMerchant() output
export interface Order {
  id: string;
  _id?: string;
  orderNumber: string;
  merchantId?: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  pricing: {
    subtotal: number;
    tax: number;
    taxAmount: number;
    delivery: number;
    shippingAmount: number;
    discount: number;
    discountAmount: number;
    totalAmount: number;
  };
  payment?: {
    method: string;
    status: string;
    transactionId?: string;
  };
  cashback?: {
    amount: number;
    status: string;
  };
  delivery?: {
    method: string;
    address?: {
      street?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      pincode?: string;
      country?: string;
    };
    estimatedTime?: string;
    instructions?: string;
    deliveredAt?: string;
  };
  totals?: {
    subtotal: number;
    tax: number;
    delivery: number;
    discount: number;
    total: number;
  };
  priority?: 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
  notes?: string;
  specialInstructions?: string;
  store?: {
    _id: string;
    name: string;
    location?: any;
  };
}

export interface OrderItem {
  id?: string;
  _id?: string;
  productId?: string;
  productName: string;
  name?: string;
  sku?: string;
  quantity: number;
  price: number;
  total?: number;
  totalPrice?: number;
  subtotal?: number;
  notes?: string;
  specialInstructions?: string;
  customizations?: string[];
}

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusBreakdown: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
  revenueGrowth: number;
  orderGrowth: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  orderNumber?: string;
  sortBy?: 'created' | 'updated' | 'total' | 'priority';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
}

// Cashback types
export interface CashbackRequest {
  id: string;
  requestNumber: string;
  merchantId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  order: {
    id: string;
    orderNumber: string;
    totalAmount: number;
    orderDate: string;
  };
  requestedAmount: number;
  approvedAmount?: number;
  status: CashbackStatus;
  riskScore: number;
  flaggedForReview: boolean;
  reason?: string;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  submittedAt: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashbackMetrics {
  totalRequests: number;
  totalPendingRequests: number;
  totalApprovedRequests: number;
  totalRejectedRequests: number;
  totalPaidRequests: number;
  totalRequestedAmount: number;
  totalPendingAmount: number;
  totalApprovedAmount: number;
  totalPaidAmount: number;
  averageProcessingTime: number;
  highRiskRequests: number;
  autoApprovedToday: number;
  manualReviewRequired: number;
}

export interface CashbackFilters {
  status?: CashbackStatus;
  riskLevel?: 'low' | 'medium' | 'high';
  customerId?: string;
  orderNumber?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'created' | 'amount' | 'risk' | 'processed';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
}

// Product types
export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  sku?: string;
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    inStock: boolean;
  };
  images: string[];
  isActive: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  merchantId: string;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilters {
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  lowStock?: boolean;
  search?: string;
  storeId?: string; // Store filter for multi-store support
  sortBy?: 'name' | 'price' | 'created' | 'updated' | 'quantity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  dateStart?: string;
  dateEnd?: string;
}

// Request options for filtering and pagination
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

export interface OrderFilters extends QueryOptions, DateRangeFilter {
  status?: OrderStatus;
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CashbackFilters extends QueryOptions, DateRangeFilter {
  status?: CashbackStatus;
  riskLevel?: RiskLevel;
  customerId?: string;
  minAmount?: number;
  maxAmount?: number;
  flaggedOnly?: boolean;
}

export interface ProductFilters extends QueryOptions {
  category?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

// Cashback analytics (used by cashback analytics page)
export interface CashbackAnalytics {
  totalPaid: number;
  totalPending: number;
  approvalRate: number;
  fraudDetectionRate: number;
  averageApprovalTime: number;
  customerRetentionImpact: number;
  revenueImpact: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    orderCount: number;
    cashbackPaid: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    cashbackPaid: number;
    ordersWithCashback: number;
    fraudAttempts: number;
  }>;
}

// Product search request (alias for product filters)
export type ProductSearchRequest = ProductFilters;

// Health check response
export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
}