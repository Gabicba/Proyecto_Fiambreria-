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
 * Fully keyboard operable: Enter/Arrow opens, arrows navigate (with wrap),
 * Home/End jump, Enter/Space selects, Escape closes.
 * Keyboard handling lives on the wrapper so it keeps working even if the
 * trigger momentarily loses focus. The active option is clearly highlighted
 * and always scrolled into view.
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
  const optionsRef = useRef<Array<HTMLButtonElement | null>>([]);
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

  // Al abrir, posicionamos el resaltado sobre la opcion seleccionada y
  // devolvemos el foco al disparador para que el teclado siga respondiendo.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    triggerRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Mantenemos siempre visible la opcion resaltada mientras se navega.
  useEffect(() => {
    if (!open) return;
    optionsRef.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  useEffect(() => {
    if (autoFocus) triggerRef.current?.focus();
  }, [autoFocus]);

  const commitAt = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    // Si el onChange ya movio el foco a otro control (siguiente paso del flujo),
    // NO lo devolvemos al disparador. Si lo hicieramos, el siguiente Enter
    // reabriria el desplegable en lugar de avanzar.
    const active = document.activeElement;
    const focusMovedAway =
      !!active && active !== document.body && !ref.current?.contains(active);
    if (!focusMovedAway) {
      triggerRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (!open) {
      if (
        e.key === "Enter" ||
        e.key === " " ||
        e.key === "ArrowDown" ||
        e.key === "ArrowUp"
      ) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) =>
          options.length === 0 ? 0 : (i + 1) % options.length
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((i) =>
          options.length === 0 ? 0 : (i - 1 + options.length) % options.length
        );
        break;
      case "Home":
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex(Math.max(0, options.length - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        e.stopPropagation();
        commitAt(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const height = size === "sm" ? "h-8 text-sm" : "h-9 text-sm";

  return (
    <div
      ref={ref}
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
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
        <div
          role="listbox"
          className="absolute z-40 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-background-200 bg-background-50 py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-foreground-400">
              Sin opciones
            </div>
          ) : (
            options.map((option, index) => {
              const isActive = index === activeIndex;
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  ref={(el) => {
                    optionsRef.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-3 cursor-pointer ${
                    isActive
                      ? "bg-primary-100 text-primary-900"
                      : isSelected
                        ? "bg-primary-50 text-foreground-900"
                        : "text-foreground-800"
                  }`}
                >
                  <span className="truncate font-medium">{option.label}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {option.hint ? (
                      <span className="text-xs text-foreground-400">
                        {option.hint}
                      </span>
                    ) : null}
                    {isSelected ? (
                      <i className="ri-check-line text-primary-600" />
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Select;