import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Custom dropdown that closes only on selection, outside click or Escape.
 * It deliberately does NOT close on wheel scroll, fixing the common bug.
 * Fully keyboard operable: Enter/Arrow opens, arrows navigate, Enter selects.
 */
const Select = ({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  className = "",
  size = "md",
  disabled,
  autoFocus,
}: SelectProps) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  // Al abrir, posicionamos el resaltado sobre la opcion seleccionada.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, options, value]);

  useEffect(() => {
    if (autoFocus) triggerRef.current?.focus();
  }, [autoFocus]);

  const selectAt = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(Math.max(0, options.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectAt(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const height = size === "sm" ? "h-8 text-sm" : "h-9 text-sm";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`w-full ${height} px-3 rounded-md border border-background-300 bg-background-50 text-left flex items-center justify-between gap-2 cursor-pointer disabled:opacity-60 ${
          open ? "ring-2 ring-primary-400 border-primary-400" : ""
        }`}
      >
        <span
          className={`truncate ${
            selected ? "text-foreground-900" : "text-foreground-400"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <i
          className={`ri-arrow-down-s-line text-base text-foreground-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-background-200 bg-background-50 py-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-foreground-400">
              Sin opciones
            </div>
          ) : (
            options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-3 cursor-pointer ${
                  index === activeIndex ? "bg-background-100" : ""
                } ${option.value === value ? "bg-primary-50" : ""}`}
              >
                <span className="truncate text-foreground-800">
                  {option.label}
                </span>
                {option.hint ? (
                  <span className="text-xs text-foreground-400 shrink-0">
                    {option.hint}
                  </span>
                ) : null}
                {option.value === value ? (
                  <i className="ri-check-line text-primary-600" />
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Select;