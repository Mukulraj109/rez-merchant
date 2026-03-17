/**
 * SocketContext — Real-time Socket.IO connection context
 *
 * Wraps the existing socketService singleton, managing connection lifecycle
 * based on auth state and app foreground/background transitions.
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { socketService } from '@/services/api/socket';

interface SocketContextType {
  isConnected: boolean;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

const defaultContext: SocketContextType = {
  isConnected: false,
  on: () => {},
  off: () => {},
  emit: () => {},
};

const SocketContext = createContext<SocketContextType>(defaultContext);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!state.isAuthenticated || !token) return;

    // Connect socket
    socketService.connect().then(() => {
      setIsConnected(socketService.getConnectionState() === 'connected');
    }).catch(() => {});

    // Listen for connection state changes
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socketService.on('connect', onConnect);
    socketService.on('disconnect', onDisconnect);

    // Handle app state transitions
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // Returning to foreground — reconnect
        socketService.connect().catch(() => {});
      } else if (nextState === 'background') {
        // Going to background — disconnect to save resources
        socketService.disconnect();
      }
      appStateRef.current = nextState;
    });

    return () => {
      socketService.off('connect', onConnect);
      socketService.off('disconnect', onDisconnect);
      socketService.disconnect();
      appStateSub.remove();
    };
  }, [state.isAuthenticated, token]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketService.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketService.off(event, handler);
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketService.emit(event, ...args);
  }, []);

  return (
    <SocketContext.Provider value={{ isConnected, on, off, emit }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
