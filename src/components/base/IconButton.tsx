import { useRef, useState, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";

type Tone = "default" | "danger";
type Size = "sm" | "md";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label: string;
  tone?: Tone;
  size?: Size;
}

const tones: Record<Tone, string> = {
  default: "text-foreground-500 hover:bg-background-200 hover:text-foreground-800",
  danger:
    "text-foreground-500 hover:bg-danger-soft hover:text-danger",
};

const sizes: Record<Size, string> = {
  sm: "w-7 h-7",
  md: "w-8 h-8",
};

interface TooltipState {
  x: number;
  y: number;
  below: boolean;
}

/**
 * Boton solo-icono con tooltip. El tooltip aparece apenas el mouse pasa por
 * encima (o al enfocar con teclado) y se mantiene mientras el hover continua,
 * para que el usuario pueda leer que hace cada icono. Se renderiza en un portal
 * sobre el body, asi nunca queda recortado por contenedores con scroll/overflow.
 */
const IconButton = ({
  icon,
  label,
  tone = "default",
  size = "md",
  className = "",
  ...rest
}: IconButtonProps) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const timer = useRef<number | null>(null);
  const [tip, setTip] = useState<TooltipState | null>(null);

  const show = () => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const below = rect.top < 46;
    setTip({
      x: rect.left + rect.width / 2,
      y: below ? rect.bottom + 8 : rect.top - 8,
      below,
    });
  };

  const handleEnter = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(show, 80);
  };

  const handleLeave = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setTip(null);
  };

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={label}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={show}
        onBlur={handleLeave}
        className={`flex items-center justify-center rounded-md transition-colors cursor-pointer ${tones[tone]} ${sizes[size]} ${className}`}
        {...rest}
      >
        <i className={`${icon} text-base`} />
      </button>
      {tip
        ? createPortal(
            <span
              role="tooltip"
              className={`pointer-events-none fixed z-[9999] -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground-950 px-2 py-1 text-[11px] font-medium text-background-50 ${
                tip.below ? "" : "-translate-y-full"
              }`}
              style={{ left: tip.x, top: tip.y }}
            >
              {label}
            </span>,
            document.body
          )
        : null}
    </>
  );
};

export default IconButton;