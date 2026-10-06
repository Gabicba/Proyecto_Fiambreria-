import { useEffect, useState, type FocusEvent, type KeyboardEvent } from "react";
import { parseNumber, round2 } from "@/utils/format";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  onEnter?: (value: number) => void;
  decimals?: number;
  min?: number;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  selectOnFocus?: boolean;
  disabled?: boolean;
  suffix?: string;
  ariaLabel?: string;
}

/**
 * Numeric input that fixes the classic "0 stuck in the field" problem and
 * accepts both comma and dot as decimal separator. The field can stay empty
 * while editing and only formats on blur / Enter.
 */
const NumberInput = ({
  value,
  onChange,
  onEnter,
  decimals = 2,
  min,
  placeholder,
  className = "",
  autoFocus,
  selectOnFocus = true,
  disabled,
  suffix,
  ariaLabel,
}: NumberInputProps) => {
  const [draft, setDraft] = useState<string>("");
  const [editing, setEditing] = useState(false);

  const toDraft = (v: number): string => {
    if (!Number.isFinite(v)) return "";
    if (v === 0) return "";
    return String(v).replace(".", ",");
  };

  const display = editing ? draft : value === 0 ? "" : String(value).replace(".", ",");

  const commit = (): number => {
    const parsed = parseNumber(draft);
    let next = Number.isNaN(parsed) ? (value === 0 ? 0 : value) : parsed;
    if (next !== 0) next = Number(next.toFixed(decimals));
    if (typeof min === "number" && !Number.isNaN(parsed) && next < min) {
      next = min;
    }
    onChange(next);
    setEditing(false);
    return next;
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setEditing(true);
    setDraft(toDraft(value));
    if (selectOnFocus) {
      requestAnimationFrame(() => e.target.select());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const committed = commit();
      if (onEnter) onEnter(committed);
    }
    if (e.key === "Escape") {
      setEditing(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  useEffect(() => {
    if (!editing) setDraft(toDraft(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editing]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={ariaLabel}
        disabled={disabled}
        className={`w-full h-9 px-3 pr-10 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 placeholder:text-foreground-400 ${
          disabled ? "opacity-60" : ""
        }`}
        value={display}
        placeholder={placeholder}
        onFocus={handleFocus}
        onChange={(e) => {
          const raw = e.target.value;
          if (!/^-?[0-9.,]*$/.test(raw)) return;
          setDraft(raw);
        }}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
      />
      {suffix ? (
        <span className="absolute right-3 text-xs text-foreground-400 pointer-events-none">
          {suffix}
        </span>
      ) : null}
    </div>
  );
};

export default NumberInput;