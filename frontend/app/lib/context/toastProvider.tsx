'use client';
import Image from 'next/image';
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface Toast {
  id: number;
  content: ReactNode;
  exiting: boolean;
}

interface ToastContextType {
  addToast: (content: ReactNode) => void; // Changed type from 'string' to 'ReactNode'
}

const ToastContext = createContext<ToastContextType | undefined>(
  undefined
);

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [counter, setCounter] = useState(0);

  const addToast = useCallback(
    (content: ReactNode) => {
      const newToast = { id: counter, content, exiting: false };
      setToasts((prevToasts) => [...prevToasts, newToast]);
      setCounter((prevCounter) => prevCounter + 1);

      setTimeout(() => {
        setToasts((prevToasts) =>
          prevToasts.map((toast) =>
            toast.id === newToast.id
              ? { ...toast, exiting: true }
              : toast
          )
        );
        setTimeout(() => {
          setToasts((prevToasts) =>
            prevToasts.filter((toast) => toast.id !== newToast.id)
          );
        }, 500); // Delay for exit animation
      }, 2000);
    },
    [counter]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        className="fixed left-0 bottom-0 p-4 space-y-2 z-50"
        style={{ zIndex: 1000 }}
      >
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`bg-black opacity-95 w-[90vw] max-w-[372px] text-white px-2 md:px-5 py-4 rounded-[15px] border border-white14 relative overflow-hidden
                        ${
                          toast.exiting
                            ? 'animate-fadeOut'
                            : 'animate-fadeInSlideUp'
                        }`}
          >
            <div>{toast.content}</div>
            <div
              className="absolute bottom-0 left-0 bg-white14 h-1"
              style={{ animation: 'fillup 2s linear forwards' }}
            ></div>
            <Image
              src="/icons/close.svg"
              alt="close"
              width={200}
              height={200}
              className="absolute top-5 right-5 cursor-pointer w-3 h-3 mt-0.5"
              onClick={() =>
                setToasts((prevToasts) =>
                  prevToasts.filter((_, i) => i !== index)
                )
              }
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
