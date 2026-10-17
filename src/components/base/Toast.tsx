import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
  detail?: string;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastItem["tone"], detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastItem["tone"], string> = {
  success: "border-success/40 bg-success-soft text-success",
  error: "border-danger/40 bg-danger-soft text-danger",
  info: "border-background-300 bg-background-50 text-foreground-800",
};

const toneIcon: Record<ToastItem["tone"], string> = {
  success: "ri-checkbox-circle-line",
  error: "ri-error-warning-line",
  info: "ri-information-line",
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const notify = useCallback(
    (message: string, tone: ToastItem["tone"] = "info", detail?: string) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, tone, detail }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-80">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-md border px-4 py-3 text-sm ${
              toneStyles[item.tone]
            }`}
          >
            <div className="flex items-start gap-2">
              <i className={`${toneIcon[item.tone]} text-base mt-0.5`} />
              <div>
                <p className="font-medium">{item.message}</p>
                {item.detail ? (
                  <p className="text-xs opacity-80 mt-0.5">{item.detail}</p>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};