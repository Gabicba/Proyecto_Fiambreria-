import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}: ModalProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground-950/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full ${sizes[size]} max-h-[92vh] flex flex-col bg-background-50 rounded-lg border border-background-200`}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-background-200">
          <div>
            <h3 className="text-base font-semibold text-foreground-950">
              {title}
            </h3>
            {subtitle ? (
              <p className="text-sm text-foreground-500 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 cursor-pointer"
            aria-label="Cerrar"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer ? (
          <div className="px-5 py-3 border-t border-background-200 flex items-center justify-end gap-2 flex-wrap">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Modal;