/**
 * useOrdersDashboard — Extracted state and logic from orders.tsx
 *
 * Manages order fetching, filtering, sorting, status updates,
 * real-time events, and modal state for the merchant orders screen.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import { showAlert } from '@/utils/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { ordersService } from '@/services';
import { useOrderRealTime } from '@/hooks/useRealTimeUpdates';
import type { Order, OrderStatus } from '@/types/api';

export type StatusFilter = OrderStatus | 'all';
export type SortBy = 'created' | 'priority' | 'total';

const STATUS_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'delivered'],
  dispatched: ['delivered'],
  delivered: ['returned', 'refunded'],
  cancelled: ['refunded'],
  returned: ['refunded'],
  refunded: [],
};

function mapApiOrder(order: any): Order {
  return {
    id: order._id || order.id,
    _id: order._id,
    orderNumber: order.orderNumber,
    merchantId: order.merchantId || '',
    customer: {
      id: order.user?._id || '',
      name: (() => {
        const firstName = order.user?.profile?.firstName;
        const lastName = order.user?.profile?.lastName;
        if (firstName && lastName) return `${firstName} ${lastName}`.trim();
        if (firstName) return firstName;
        if (lastName) return lastName;
        if (order.user?.phoneNumber) return order.user.phoneNumber;
        return 'Unknown Customer';
      })(),
      email: order.user?.profile?.email || '',
      phone: order.user?.phoneNumber || '',
    },
    items: (order.items || []).map((item: any) => ({
      id: item._id || item.id,
      productId: item.product?._id || item.productId || '',
      productName: item.name || item.productName || 'Unknown Product',
      quantity: item.quantity || 0,
      price: item.price || 0,
      total: item.subtotal || (item.price || 0) * (item.quantity || 0),
      customizations: item.customizations || [],
      image: item.image || item.product?.images?.[0] || item.product?.image || null,
      discount: item.discount || 0,
    })),
    status: order.status || 'pending',
    paymentStatus: order.payment?.status || order.paymentStatus || 'pending',
    payment: {
      method: order.payment?.method || 'unknown',
      status: order.payment?.status || 'pending',
      transactionId: order.payment?.transactionId || '',
      coinsUsed: order.payment?.coinsUsed || null,
    },
    pricing: {
      subtotal: order.totals?.subtotal || 0,
      tax: order.totals?.tax || 0,
      delivery: order.totals?.delivery || order.delivery?.deliveryFee || 0,
      discount: order.totals?.discount || 0,
      cashback: order.totals?.cashback || 0,
      totalAmount: order.totals?.total || order.totals?.paidAmount || 0,
      paidAmount: order.totals?.paidAmount || order.totals?.total || 0,
      refundAmount: order.totals?.refundAmount || 0,
    },
    delivery: {
      method: order.delivery?.method || 'pickup',
      address: order.delivery?.address?.addressLine1 || order.delivery?.address || '',
      fullAddress: order.delivery?.address || null,
      estimatedTime: order.delivery?.estimatedTime || '',
      deliveryFee: order.delivery?.deliveryFee || 0,
      status: order.delivery?.status || 'pending',
    },
    priority: order.priority || 'normal',
    createdAt: order.createdAt || '',
    updatedAt: order.updatedAt || '',
    notes: order.notes || '',
    store: order.store || undefined,
    timeline: order.timeline || [],
    rating: order.rating || null,
    analytics: order.analytics || null,
  } as any;
}

export function useOrdersDashboard() {
  const { state } = useAuth();
  const { stores, activeStore } = useStore();
  const realTime = useOrderRealTime();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState<string | undefined>(activeStore?._id);

  // Status update modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [statusOrderCurrent, setStatusOrderCurrent] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState(false);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      pending: 0, placed: 0, confirmed: 0, preparing: 0, ready: 0,
      dispatched: 0, out_for_delivery: 0, delivered: 0, cancelling: 0,
      cancelled: 0, returned: 0, refunded: 0,
    };
    orders.forEach(order => { counts[order.status]++; });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const filtered = activeFilter === 'all'
      ? orders
      : orders.filter(order => order.status === activeFilter);

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const priorityOrder: Record<string, number> = { urgent: 3, high: 2, normal: 1 };
          return (priorityOrder[b.priority || 'normal'] || 0) - (priorityOrder[a.priority || 'normal'] || 0);
        }
        case 'total':
          return (b.pricing?.totalAmount || 0) - (a.pricing?.totalAmount || 0);
        case 'created':
        default:
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }
    });
  }, [orders, activeFilter, sortBy]);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const apiSortByMap: Record<SortBy, string> = {
        created: 'createdAt',
        total: 'total',
        priority: 'status',
      };

      const params: any = {
        sortBy: apiSortByMap[sortBy] || 'createdAt',
        limit: 50,
        page: 1,
      };
      if (selectedStoreId) params.storeId = selectedStoreId;

      const result = await ordersService.getOrders(params);
      const mappedOrders = (result.orders || []).map(mapApiOrder);
      setOrders(mappedOrders as any);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch orders. Please try again.';
      setError(errorMessage);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        showAlert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStoreId, sortBy]);

  const handleQuickAction = useCallback(async (orderId: string, action: string) => {
    const actionStatusMap: Record<string, OrderStatus> = {
      confirm: 'confirmed' as OrderStatus,
      prepare: 'preparing' as OrderStatus,
      ready: 'ready' as OrderStatus,
      cancel: 'cancelled' as OrderStatus,
    };
    const newStatus = actionStatusMap[action];
    if (!newStatus) return;

    try {
      await ordersService.updateOrderStatus(orderId, { status: newStatus, notifyCustomer: true });
      await fetchOrders();
    } catch (err: any) {
      showAlert('Error', 'Failed to update order status. Please try again.');
    }
  }, [fetchOrders]);

  const handleUpdateStatus = useCallback((orderId: string, currentStatus: string) => {
    setStatusOrderId(orderId);
    setStatusOrderCurrent(currentStatus);
    setShowStatusModal(true);
  }, []);

  const handleStatusSelect = useCallback(async (newStatus: string) => {
    if (!statusOrderId) return;
    try {
      setProcessingStatus(true);
      await ordersService.updateOrderStatus(statusOrderId, {
        status: newStatus as OrderStatus,
        notifyCustomer: true,
      });
      setShowStatusModal(false);
      await fetchOrders();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      } else {
        showAlert('Success', `Order status updated to ${newStatus.replace(/_/g, ' ')}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to update order status.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Error: ${msg}`);
      } else {
        showAlert('Error', msg);
      }
    } finally {
      setProcessingStatus(false);
      setStatusOrderId(null);
    }
  }, [statusOrderId, fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const clearNewOrders = useCallback(() => setNewOrdersCount(0), []);

  // Initial fetch
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Handle real-time order events
  useEffect(() => {
    if (realTime.orderEvents && realTime.orderEvents.length > 0) {
      const latestEvent = realTime.orderEvents[0];

      switch (latestEvent.type) {
        case 'order_created':
          if (latestEvent.data) {
            setOrders(prev => [latestEvent.data, ...prev]);
            setNewOrdersCount(prev => prev + 1);
            showAlert(
              'New Order Received',
              `Order #${latestEvent.data.orderNumber} has been placed.`,
              [{ text: 'OK', onPress: () => setNewOrdersCount(0) }]
            );
          }
          break;
        case 'order_updated':
          if (latestEvent.data) {
            setOrders(prev => prev.map(order =>
              order.id === latestEvent.data.id ? latestEvent.data : order
            ));
          }
          break;
      }
    }
  }, [realTime.orderEvents]);

  return {
    // Data
    orders: filteredOrders,
    allOrders: orders,
    statusCounts,
    loading,
    refreshing,
    error,

    // Filters
    activeFilter,
    setActiveFilter,
    sortBy,
    setSortBy,
    selectedStoreId,
    setSelectedStoreId,

    // Real-time
    realTime,
    newOrdersCount,
    clearNewOrders,

    // Status modal
    showStatusModal,
    setShowStatusModal,
    statusOrderId,
    statusOrderCurrent,
    processingStatus,

    // Actions
    fetchOrders,
    onRefresh,
    handleQuickAction,
    handleUpdateStatus,
    handleStatusSelect,

    // Context data
    stores,
    activeStore,
    STATUS_TRANSITIONS,
  };
}
