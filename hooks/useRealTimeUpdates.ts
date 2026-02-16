import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services';
import { SocketConnectionState } from '@/types/socket';

export interface RealTimeEvent {
  type: 'order_created' | 'order_updated' | 'cashback_created' | 'cashback_updated' | 'product_updated' | 'metrics_updated';
  merchantId: string;
  data: any;
  timestamp: Date;
}

export interface RealTimeStats {
  totalConnections: number;
  totalRooms: number;
  merchantDashboards: number;
  activeSubscriptions: {
    metrics: number;
    orders: number;
    cashback: number;
  };
}

export interface DashboardUpdate {
  metrics: any;
  overview: any;
  notifications: any[];
  timestamp: Date;
}

export interface SystemNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

export const useRealTimeUpdates = () => {
  const { state: authState } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStats, setConnectionStats] = useState<RealTimeStats | null>(null);
  const eventListeners = useRef<Map<string, (data: any) => void>>(new Map());
  const socketListenersAttached = useRef(false);
  const connectingRef = useRef(false);

  // Connect to real-time updates using Socket.IO
  const connect = useCallback(async () => {
    if (connectingRef.current || socketService.isConnected()) return;
    if (!authState.merchant?.id) return;

    connectingRef.current = true;
    try {
      await socketService.connect();
      await socketService.joinMerchantDashboard();

      if (__DEV__) {
        console.log('📡 [Socket] Real-time updates connected');
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('⚠️ [Socket] Connection failed (non-critical)');
      }
    } finally {
      connectingRef.current = false;
    }
  }, [authState.merchant?.id]);

  const disconnect = useCallback(() => {
    connectingRef.current = false;
    socketService.disconnect();
    setIsConnected(false);
    setConnectionState('disconnected');
    if (__DEV__) {
      console.log('📡 Real-time Socket.IO disconnected');
    }
  }, []);

  // Cleanup socket listeners
  const cleanupSocketListeners = useCallback(() => {
    if (!socketListenersAttached.current) return;

    socketService.offAll('connection-status');
    socketService.offAll('initial-dashboard-data');
    socketService.offAll('metrics-updated');
    socketService.offAll('overview-updated');
    socketService.offAll('order-event');
    socketService.offAll('cashback-event');
    socketService.offAll('product-event');
    socketService.offAll('system-notification');
    socketService.offAll('connection-error');
    socketService.offAll('reconnected');
    socketService.offAll('reconnecting');

    socketListenersAttached.current = false;
  }, []);

  // Setup Socket.IO event listeners
  const setupSocketListeners = useCallback(() => {
    // Prevent duplicate listeners
    if (socketListenersAttached.current) return;

    // Connection status events
    socketService.on('connection-status', (status: string) => {
      setConnectionState(status as SocketConnectionState);
      setIsConnected(status === 'connected');
    });

    // Dashboard data events
    socketService.on('initial-dashboard-data', (data: any) => {
      setLastUpdate(new Date());
      const dashboardUpdate: DashboardUpdate = {
        metrics: data.metrics,
        overview: data.overview,
        notifications: data.notifications,
        timestamp: new Date()
      };
      emitEvent('initial-dashboard-data', dashboardUpdate);
    });

    socketService.on('metrics-updated', (data: any) => {
      setLastUpdate(new Date());
      const metricsUpdate: DashboardUpdate = {
        metrics: data,
        overview: null,
        notifications: [],
        timestamp: new Date()
      };
      emitEvent('metrics-updated', metricsUpdate);
    });

    socketService.on('overview-updated', (data: any) => {
      setLastUpdate(new Date());
      emitEvent('overview-updated', data);
    });

    // Real-time events
    socketService.on('order-event', (event: any) => {
      setLastUpdate(new Date());
      emitEvent('order-event', event);
    });

    socketService.on('cashback-event', (event: any) => {
      setLastUpdate(new Date());
      emitEvent('cashback-event', event);
    });

    socketService.on('product-event', (event: any) => {
      setLastUpdate(new Date());
      emitEvent('product-event', event);
    });

    // System notifications
    socketService.on('system-notification', (notification: any) => {
      setLastUpdate(new Date());
      const systemNotification: SystemNotification = {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        timestamp: new Date()
      };
      emitEvent('system-notification', systemNotification);
    });

    // Connection error events
    socketService.on('connection-error', (error: any) => {
      console.error('Socket connection error:', error);
      setConnectionState('error');
      setIsConnected(false);
    });

    // Reconnection events
    socketService.on('reconnected', () => {
      setConnectionState('connected');
      setIsConnected(true);
      setLastUpdate(new Date());
    });

    socketService.on('reconnecting', () => {
      setConnectionState('reconnecting');
    });

    socketListenersAttached.current = true;
  }, []);

  const emitEvent = (eventName: string, data: any) => {
    const listener = eventListeners.current.get(eventName);
    if (listener) {
      listener(data);
    }
  };

  // Get connection stats from socket service
  const fetchConnectionStats = useCallback(() => {
    const stats = socketService.getStats();
    const realtimeStats: RealTimeStats = {
      totalConnections: 1,
      totalRooms: 1,
      merchantDashboards: isConnected ? 1 : 0,
      activeSubscriptions: {
        metrics: stats.subscriptionCount > 0 ? 1 : 0,
        orders: stats.subscriptionCount > 0 ? 1 : 0,
        cashback: stats.subscriptionCount > 0 ? 1 : 0,
      }
    };
    setConnectionStats(realtimeStats);
  }, [isConnected]);

  // Event subscription methods
  const subscribeToMetrics = useCallback((callback: (data: DashboardUpdate) => void) => {
    eventListeners.current.set('metrics-updated', callback);
    socketService.subscribeToMetrics().catch(console.error);
    
    return () => {
      eventListeners.current.delete('metrics-updated');
    };
  }, []);

  const subscribeToOrders = useCallback((callback: (event: RealTimeEvent) => void) => {
    eventListeners.current.set('order-event', callback);
    socketService.subscribeToOrders().catch(console.error);
    
    return () => {
      eventListeners.current.delete('order-event');
    };
  }, []);

  const subscribeToCashback = useCallback((callback: (event: RealTimeEvent) => void) => {
    eventListeners.current.set('cashback-event', callback);
    socketService.subscribeToCashback().catch(console.error);
    
    return () => {
      eventListeners.current.delete('cashback-event');
    };
  }, []);

  const subscribeToProducts = useCallback((callback: (event: RealTimeEvent) => void) => {
    eventListeners.current.set('product-event', callback);
    socketService.subscribeToProducts().catch(console.error);
    
    return () => {
      eventListeners.current.delete('product-event');
    };
  }, []);

  const subscribeToSystemNotifications = useCallback((callback: (notification: SystemNotification) => void) => {
    eventListeners.current.set('system-notification', callback);
    socketService.subscribeToNotifications().catch(console.error);
    
    return () => {
      eventListeners.current.delete('system-notification');
    };
  }, []);

  const subscribeToChartData = useCallback((callback: (data: any) => void) => {
    eventListeners.current.set('live-chart-data', callback);
    
    return () => {
      eventListeners.current.delete('live-chart-data');
    };
  }, []);

  // Manual trigger methods
  const triggerMetricsUpdate = useCallback(() => {
    fetchConnectionStats();
  }, [fetchConnectionStats]);

  const requestChartData = useCallback(async (period: number = 24) => {
    if (!authState.merchant?.id) return;
    console.log('📊 Chart data requested via Socket.IO');
    // Chart data requests can be sent via socket if backend supports it
  }, [authState.merchant?.id]);

  const reconnect = useCallback(async () => {
    disconnect();
    await connect();
  }, [connect, disconnect]);

  // Setup socket listeners and auto-connect when merchant is available
  // NOTE: Don't disconnect in cleanup — the socket is a singleton and should stay
  // alive while authenticated. AuthContext.logout() handles disconnect on logout.
  // Disconnecting in cleanup causes errors in React Strict Mode (dev) due to
  // mount→unmount→remount cycle destroying in-flight connections.
  useEffect(() => {
    if (authState.merchant?.id) {
      setupSocketListeners();
      connect();
    } else {
      cleanupSocketListeners();
      disconnect();
    }

    return () => {
      cleanupSocketListeners();
    };
  }, [authState.merchant?.id]);

  // Update connection stats periodically
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(fetchConnectionStats, 10000); // Every 10 seconds
      return () => clearInterval(interval);
    }
  }, [isConnected, fetchConnectionStats]);

  return {
    // Connection state
    isConnected,
    connectionState,
    lastUpdate,
    connectionStats,
    
    // Connection methods
    connect,
    disconnect,
    reconnect,
    
    // Subscription methods
    subscribeToMetrics,
    subscribeToOrders,
    subscribeToCashback,
    subscribeToProducts,
    subscribeToSystemNotifications,
    subscribeToChartData,
    
    // Manual trigger methods
    triggerMetricsUpdate,
    requestChartData,
  };
};

// Hook for dashboard-specific real-time updates
export const useDashboardRealTime = () => {
  const realTime = useRealTimeUpdates();
  const [dashboardData, setDashboardData] = useState<DashboardUpdate | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    // Subscribe to metrics updates
    const unsubscribeMetrics = realTime.subscribeToMetrics((data) => {
      setDashboardData(data);
    });

    // Subscribe to system notifications
    const unsubscribeNotifications = realTime.subscribeToSystemNotifications((notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeNotifications();
    };
  }, [realTime]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const markNotificationRead = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  return {
    ...realTime,
    dashboardData,
    notifications,
    clearNotifications,
    markNotificationRead,
  };
};

// Hook for order-specific real-time updates
export const useOrderRealTime = () => {
  const realTime = useRealTimeUpdates();
  const [orderEvents, setOrderEvents] = useState<RealTimeEvent[]>([]);

  useEffect(() => {
    const unsubscribe = realTime.subscribeToOrders((event) => {
      setOrderEvents(prev => [event, ...prev.slice(0, 19)]); // Keep last 20
    });

    return unsubscribe;
  }, [realTime]);

  const clearOrderEvents = () => {
    setOrderEvents([]);
  };

  return {
    ...realTime,
    orderEvents,
    clearOrderEvents,
  };
};

// Hook for cashback-specific real-time updates
export const useCashbackRealTime = () => {
  const realTime = useRealTimeUpdates();
  const [cashbackEvents, setCashbackEvents] = useState<RealTimeEvent[]>([]);

  useEffect(() => {
    const unsubscribe = realTime.subscribeToCashback((event) => {
      setCashbackEvents(prev => [event, ...prev.slice(0, 19)]); // Keep last 20
    });

    return unsubscribe;
  }, [realTime]);

  const clearCashbackEvents = () => {
    setCashbackEvents([]);
  };

  return {
    ...realTime,
    cashbackEvents,
    clearCashbackEvents,
  };
};

// Hook for chart-specific real-time updates
export const useChartRealTime = () => {
  const realTime = useRealTimeUpdates();
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = realTime.subscribeToChartData((data) => {
      setChartData(data);
    });

    return unsubscribe;
  }, [realTime]);

  return {
    ...realTime,
    chartData,
  };
};