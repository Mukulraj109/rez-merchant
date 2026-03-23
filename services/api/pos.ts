/**
 * POS API Service — Product search, customer lookup, and bill creation for Simple POS.
 */
import { apiClient, ApiResponse } from './client';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface POSProduct {
  _id: string;
  name: string;
  price: number;
  images?: Array<{ url: string; thumbnailUrl?: string; isMain?: boolean }>;
  category?: string;
  sku?: string;
  barcode?: string;
  status: string;
  inventory?: { stock: number; trackInventory?: boolean };
  cashback?: { percentage: number; maxAmount?: number; isActive?: boolean };
  pricing?: { selling: number; original: number; currency: string; discount?: number };
}

export interface POSProductSearchResponse {
  products: POSProduct[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface POSCustomer {
  _id: string;
  fullName: string;
  phoneNumber: string;
  availableCoins: number;
  tier?: string;
}

export interface POSCartItem {
  product: POSProduct;
  quantity: number;
}

export interface CreateBillPayload {
  storeId: string;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  customerPhone?: string;
  coinsRedeemed?: number;
  coinDiscount?: number;
  idempotencyKey: string;
}

export interface BillResponse {
  billId: string;
  referenceNumber: string;
  total: number;
  paymentMethod: string;
  coinsIssued: number;
  coinsRedeemed: number;
  coinDiscount: number;
  createdAt: string;
}

// ─── Service ────────────────────────────────────────────────────────────────────

class POSService {
  /**
   * Search merchant products for POS. Uses the existing merchant products API.
   */
  async searchProducts(
    storeId: string,
    query: string = '',
    page: number = 1,
    limit: number = 50
  ): Promise<POSProductSearchResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    params.append('storeId', storeId);
    params.append('status', 'active');
    if (query.trim()) {
      params.append('search', query.trim());
    }

    const response = await apiClient.get<POSProductSearchResponse>(
      `/merchant/products?${params.toString()}`
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to search products');
    }

    return response.data;
  }

  /**
   * Look up a customer by phone number for coin redemption.
   */
  async lookupCustomer(phone: string, storeId: string): Promise<POSCustomer | null> {
    try {
      const response = await apiClient.get<POSCustomer>(
        `/store-payment/customer-lookup?phone=${encodeURIComponent(phone)}&storeId=${storeId}`
      );

      if (!response.success || !response.data) {
        return null;
      }

      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Create a new bill / store payment.
   */
  async createBill(data: CreateBillPayload): Promise<BillResponse> {
    const response = await apiClient.post<BillResponse>(
      '/store-payment/create-bill',
      data,
      {
        headers: { 'X-Idempotency-Key': data.idempotencyKey },
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create bill');
    }

    return response.data;
  }
}

export const posService = new POSService();
export default posService;
