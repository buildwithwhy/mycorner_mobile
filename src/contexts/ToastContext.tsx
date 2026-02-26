import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

interface ToastState {
  message: string;
  icon?: string;
  visible: boolean;
}

interface ToastContextType {
  toast: ToastState;
  showToast: (message: string, icon?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, icon?: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ message, icon, visible: true });
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
