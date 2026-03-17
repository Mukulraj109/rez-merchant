import { io, Socket } from 'socket.io-client';
import { storageService } from '../storage';
import { API_CONFIG } from '../../config/api';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketConnectionState,
  SocketStats
} from '../../types/socket';

const SOCKET_URL = API_CONFIG.SOCKET_URL;
const SOCKET_TIMEOUT = API_CONFIG.SOCKET_TIMEOUT;

class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  private connectionState: SocketConnectionState = 'disconnected';
  private stats: SocketStats = {
    connectionUptime: 0,
    messagesReceived: 0,
    messagesSent: 0,
    reconnectionCount: 0,
    averageLatency: 0,
    subscriptionCount: 0
  };
  private listeners: Map<string, Function[]> = new Map();
  private connectionStartTime: number = 0;
  private pingInterval: any = null;
  private latencyMeasurements: number[] = [];

  // Initialize socket connection
  async connect(): Promise<void> {
    // Don't create a new socket if one is already connected or connecting
    if (this.socket?.connected || this.connectionState === 'connecting') {
      return;
    }

    // Clean up any existing socket before creating a new one
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      const token = await storageService.getAuthToken();
      if (!token) {
        // Silently fail if no token - WebSocket is optional
        this.connectionState = 'disconnected';
        return;
      }

      // Use localhost for development instead of IP address
      const socketUrl = SOCKET_URL.includes('172.20.10.4')
        ? SOCKET_URL.replace('172.20.10.4', 'localhost')
        : SOCKET_URL;

      // Only log in development mode
      if (__DEV__) {
        if (__DEV__) console.log(`📡 [Socket] Attempting to connect to: ${socketUrl}`);
      }

      this.connectionState = 'connecting';

      this.socket = io(socketUrl, {
        auth: {
          token
        },
        transports: ['polling', 'websocket'], // Try polling first for iOS compatibility
        timeout: SOCKET_TIMEOUT,
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 3,
        reconnectionDelayMax: 5000,
        autoConnect: true
      });

      this.setupEventListeners();
      this.connectionStartTime = Date.now();

    } catch (error) {
      // Silently handle connection errors - WebSocket is optional
      if (__DEV__) {
        if (__DEV__) console.warn('⚠️ [Socket] Connection failed (non-critical):', error);
      }
      this.connectionState = 'error';
      // Don't throw - allow app to continue without WebSocket
    }
  }

  // Disconnect socket
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.connectionState = 'disconnected';
    this.stats.connectionUptime = Date.now() - this.connectionStartTime;
  }

  // Setup socket event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      if (__DEV__) {
        if (__DEV__) console.log('🟢 [Socket] Connected successfully');
      }
      this.connectionState = 'connected';
      this.startPingInterval();
      this.emitToListeners('connection-status', 'connected');
    });

    this.socket.on('disconnect', (reason) => {
      // Only log in development
      if (__DEV__) {
        if (__DEV__) console.log('🔴 [Socket] Disconnected:', reason);
      }
      this.connectionState = 'disconnected';
      this.stopPingInterval();
      this.emitToListeners('connection-status', 'disconnected');
    });

    this.socket.on('connect_error', (error) => {
      // Only log in development to reduce console noise
      if (__DEV__) {
        if (__DEV__) console.warn('⚠️ [Socket] Connection error (non-critical):', error.message || error);
      }
      this.connectionState = 'error';
      this.emitToListeners('connection-error', error);
    });

    (this.socket as any).on('reconnect', (attemptNumber: number) => {
      if (__DEV__) {
        if (__DEV__) console.log('🟡 [Socket] Reconnected after', attemptNumber, 'attempts');
      }
      this.stats.reconnectionCount++;
      this.stats.lastReconnectionAt = new Date().toISOString();
      this.emitToListeners('reconnected', attemptNumber);
    });

    (this.socket as any).on('reconnect_attempt', (attemptNumber: number) => {
      // Only log first attempt to reduce spam
      if (__DEV__ && attemptNumber === 1) {
        if (__DEV__) console.log('🟡 [Socket] Attempting reconnection...');
      }
      this.connectionState = 'reconnecting';
      this.emitToListeners('reconnecting', attemptNumber);
    });

    // Dashboard data events
    this.socket.on('initial-dashboard-data', (data) => {
      if (__DEV__) console.log('📊 Received initial dashboard data');
      this.stats.messagesReceived++;
      this.emitToListeners('initial-dashboard-data', data);
    });

    this.socket.on('metrics-updated', (data) => {
      if (__DEV__) console.log('📈 Metrics updated');
      this.stats.messagesReceived++;
      this.emitToListeners('metrics-updated', data);
    });

    this.socket.on('overview-updated', (data) => {
      if (__DEV__) console.log('📋 Overview updated');
      this.stats.messagesReceived++;
      this.emitToListeners('overview-updated', data);
    });

    // Real-time events
    this.socket.on('order-event', (event) => {
      if (__DEV__) console.log('🛒 Order event:', event.type);
      this.stats.messagesReceived++;
      this.emitToListeners('order-event', event);
    });

    this.socket.on('cashback-event', (event) => {
      if (__DEV__) console.log('💰 Cashback event:', event.type);
      this.stats.messagesReceived++;
      this.emitToListeners('cashback-event', event);
    });

    this.socket.on('product-event', (event) => {
      if (__DEV__) console.log('📦 Product event:', event.type);
      this.stats.messagesReceived++;
      this.emitToListeners('product-event', event);
    });

    // System notifications
    this.socket.on('system-notification', (notification) => {
      if (__DEV__) console.log('🔔 System notification:', notification.type);
      this.stats.messagesReceived++;
      this.emitToListeners('system-notification', notification);
    });

    // Bulk operation events
    this.socket.on('bulk-operation-progress', (data) => {
      if (__DEV__) console.log('⚙️ Bulk operation progress:', data.progress.percentage + '%');
      this.stats.messagesReceived++;
      this.emitToListeners('bulk-operation-progress', data);
    });

    this.socket.on('bulk-operation-completed', (data) => {
      if (__DEV__) console.log('✅ Bulk operation completed:', data.type);
      this.stats.messagesReceived++;
      this.emitToListeners('bulk-operation-completed', data);
    });

    // Ping/pong for latency measurement
    this.socket.on('pong', (timestamp) => {
      const latency = Date.now() - timestamp;
      this.latencyMeasurements.push(latency);
      
      // Keep only last 10 measurements
      if (this.latencyMeasurements.length > 10) {
        this.latencyMeasurements.shift();
      }
      
      // Calculate average latency
      this.stats.averageLatency = this.latencyMeasurements.reduce((a, b) => a + b, 0) / this.latencyMeasurements.length;
    });

    // Error handling
    this.socket.on('error', (error) => {
      // Only log in development to reduce console noise
      if (__DEV__) {
        if (__DEV__) console.warn('⚠️ [Socket] Error (non-critical):', error);
      }
      this.emitToListeners('socket-error', error);
    });
  }

  // Join merchant dashboard for real-time updates
  async joinMerchantDashboard(): Promise<void> {
    const merchantData = await storageService.getMerchantData();
    if (!merchantData || !this.socket) return;

    const merchantId = (merchantData as any).id || merchantData;
    this.socket.emit('join-merchant-dashboard', merchantId);
    this.stats.messagesSent++;
    if (__DEV__) console.log('📊 Joined merchant dashboard for real-time updates');
  }

  // Leave merchant dashboard
  async leaveMerchantDashboard(): Promise<void> {
    const merchantData = await storageService.getMerchantData();
    if (!merchantData || !this.socket) return;

    const merchantId = (merchantData as any).id || merchantData;
    this.socket.emit('leave-merchant-dashboard', merchantId);
    this.stats.messagesSent++;
    if (__DEV__) console.log('📊 Left merchant dashboard');
  }

  // Subscribe to specific data types
  async subscribeToMetrics(): Promise<void> {
    const merchantData = await storageService.getMerchantData();
    if (!merchantData || !this.socket) return;

    const merchantId = (merchantData as any).id || merchantData;
    this.socket.emit('subscribe-metrics', merchantId);
    this.stats.messagesSent++;
    this.stats.subscriptionCount++;
  }

  async subscribeToOrders(): Promise<void> {
    const merchantData = await storageService.getMerchantData();
    if (!merchantData || !this.socket) return;

    const merchantId = (merchantData as any).id || merchantData;
    this.socket.emit('subscribe-orders', merchantId);
    this.stats.messagesSent++;
    this.stats.subscriptionCount++;
  }

  async subscribeToCashback(): Promise<void> {
    const merchantData = await storageService.getMerchantData();
    if (!merchantData || !this.socket) return;

    const merchantId = (merchantData as any).id || merchantData;
    this.socket.emit('subscribe-cashback', merchantId);
    this.stats.messagesSent++;
    this.stats.subscriptionCount++;
  }

  async subscribeToProducts(): Promise<void> {
    const merchantData = await storageService.getMerchantData();
    if (!merchantData || !this.socket) return;

    const merchantId = (merchantData as any).id || merchantData;
    this.socket.emit('subscribe-products', merchantId);
    this.stats.messagesSent++;
    this.stats.subscriptionCount++;
  }

  async subscribeToNotifications(): Promise<void> {
    const merchantData = await storageService.getMerchantData();
    if (!merchantData || !this.socket) return;

    const merchantId = (merchantData as any).id || merchantData;
    this.socket.emit('subscribe-notifications', merchantId);
    this.stats.messagesSent++;
    this.stats.subscriptionCount++;
  }

  // Event listener management
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      // Remove all listeners for this event
      this.listeners.delete(event);
      return;
    }
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Remove all listeners for an event
  offAll(event: string): void {
    this.listeners.delete(event);
  }

  private emitToListeners(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          if (__DEV__) console.error(`Error in socket listener for ${event}:`, error);
        }
      });
    }
  }

  // Ping for connection testing
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', Date.now());
        this.stats.messagesSent++;
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Get connection state
  getConnectionState(): SocketConnectionState {
    return this.connectionState;
  }

  // Get connection statistics
  getStats(): SocketStats {
    return {
      ...this.stats,
      connectionUptime: this.connectionState === 'connected' 
        ? Date.now() - this.connectionStartTime 
        : this.stats.connectionUptime
    };
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Auto-reconnect logic
  async ensureConnection(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }
}

// Create and export singleton instance
export const socketService = new SocketService();
export default socketService;