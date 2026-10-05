import { useRef, useState, type ButtonHTMLAttributes } from "react";

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

/**
 * Boton solo-icono con tooltip. El tooltip aparece tras un pequeno retardo,
 * permanece visible mientras se mantiene el hover y desaparece al salir.
 * Se posiciona en forma fija para no quedar recortado por contenedores.
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
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const show = () => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setCoords({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const handleEnter = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(show, 320);
  };

  const handleLeave = () => {
    if (timer.current) window.clearTimeout(timer.current);
    setCoords(null);
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={show}
      onBlur={handleLeave}
      className={`relative flex items-center justify-center rounded-md transition-colors cursor-pointer ${tones[tone]} ${sizes[size]} ${className}`}
      {...rest}
    >
      <i className={`${icon} text-base`} />
      {coords ? (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-[100] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-foreground-950 px-2 py-1 text-[11px] font-medium text-background-50"
          style={{ left: coords.x, top: coords.y }}
        >
          {label}
        </span>
      ) : null}
    </button>
  );
};

export default IconButton;