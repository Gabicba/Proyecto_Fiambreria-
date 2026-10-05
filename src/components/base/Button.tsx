import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "accent"
  | "outline"
  | "ghost"
  | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: string;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1";

const variants: Record<Variant, string> = {
  primary: "bg-primary-500 text-background-50 hover:bg-primary-600",
  secondary: "bg-secondary-500 text-background-50 hover:bg-secondary-600",
  accent: "bg-accent-500 text-foreground-950 hover:bg-accent-600",
  outline:
    "border border-background-300 text-foreground-800 hover:bg-background-100",
  ghost: "text-foreground-700 hover:bg-background-100",
  danger: "bg-danger text-background-50 hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

const Button = ({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  type = "button",
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    {...rest}
  >
    {icon ? <i className={`${icon} text-base`} /> : null}
    {children}
  </button>
);

export default Button;