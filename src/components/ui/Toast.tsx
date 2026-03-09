"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Toast {
  id: number;
  type: "success" | "error";
  message: string;
}

interface ToastContextValue {
  showToast: (type: "success" | "error", message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    const duration = type === "error" ? 6000 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="alert"
              aria-live="assertive"
              className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg text-sm animate-in slide-in-from-right ${
                toast.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <span className="mt-0.5 shrink-0 text-base" aria-hidden="true">
                {toast.type === "success" ? "✓" : "✕"}
              </span>
              <p className="flex-1 font-medium">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded-lg p-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
