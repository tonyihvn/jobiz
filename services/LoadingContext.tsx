import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { globalLoadingManager } from './globalLoadingManager';

type LoadingContextValue = {
  isLoading: boolean;
  loadingMessage: string;
  requestCount: number;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  setLoadingMessage: (message: string) => void;
};

const LoadingContext = createContext<LoadingContextValue>({
  isLoading: false,
  loadingMessage: 'Loading...',
  requestCount: 0,
  startLoading: () => {},
  stopLoading: () => {},
  setLoadingMessage: () => {},
});

export const LoadingProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessageState] = useState('Loading...');

  // Subscribe to global loading manager changes
  useEffect(() => {
    const unsubscribe = globalLoadingManager.subscribe(() => {
      setIsLoading(globalLoadingManager.isLoading());
      setLoadingMessageState(globalLoadingManager.getMessage());
    });

    return unsubscribe;
  }, []);

  const startLoading = useCallback((message = 'Loading...') => {
    globalLoadingManager.start(message);
  }, []);

  const stopLoading = useCallback(() => {
    globalLoadingManager.stop();
  }, []);

  const setLoadingMessage = useCallback((message: string) => {
    globalLoadingManager.setMessage(message);
  }, []);

  const value: LoadingContextValue = {
    isLoading,
    loadingMessage,
    requestCount: isLoading ? 1 : 0,
    startLoading,
    stopLoading,
    setLoadingMessage,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);

export default LoadingContext;
