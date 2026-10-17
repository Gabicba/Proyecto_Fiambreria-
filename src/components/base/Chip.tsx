import type { ReactNode } from "react";

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "primary"
  | "accent"
  | "secondary";

const tones: Record<Tone, string> = {
  neutral: "bg-background-100 text-foreground-700 border-background-200",
  success: "bg-success-soft text-success border-success/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  danger: "bg-danger-soft text-danger border-danger/30",
  info: "bg-info-soft text-info border-info/30",
  primary: "bg-primary-100 text-primary-700 border-primary-200",
  accent: "bg-accent-100 text-accent-700 border-accent-200",
  secondary: "bg-secondary-100 text-secondary-900 border-secondary-200",
};

interface ChipProps {
  children: ReactNode;
  tone?: Tone;
  icon?: string;
  className?: string;
}

const Chip = ({ children, tone = "neutral", icon, className = "" }: ChipProps) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${tones[tone]} ${className}`}
  >
    {icon ? <i className={`${icon} text-sm`} /> : null}
    {children}
  </span>
);

export default Chip;