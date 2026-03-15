/**
 * SocketContext stub
 * Placeholder for Socket.IO real-time connection context
 * TODO: Implement full Socket.IO integration when backend supports it
 */

import React, { createContext, useContext } from 'react';

interface SocketContextType {
  isConnected: boolean;
  socket: any | null;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

const defaultContext: SocketContextType = {
  isConnected: false,
  socket: null,
  on: () => {},
  off: () => {},
  emit: () => {},
};

const SocketContext = createContext<SocketContextType>(defaultContext);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SocketContext.Provider value={defaultContext}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
