import { useEffect, useRef } from "react";
import type { Channel } from "@/types";
import type { CartLineView } from "@/hooks/useSaleCart";
import NumberInput from "@/components/base/NumberInput";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import IconButton from "@/components/base/IconButton";
import { quantityDecimals, formatQuantity, toCurrency } from "@/utils/format";

interface CartPanelProps {
  lines: CartLineView[];
  channel: Channel;
  customer: string;
  onCustomerChange: (value: string) => void;
  onSetQuantity: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  focusRequest: { id: string; token: number } | null;
  onFocusDone: () => void;
  onQuantityEnter: () => void;
  subtotal: number;
  heldCount: number;
  onHold: () => void;
  onOpenHeld: () => void;
  onClear: () => void;
  onCharge: () => void;
}

const CartPanel = ({
  lines,
  channel,
  customer,
  onCustomerChange,
  onSetQuantity,
  onRemove,
  focusRequest,
  onFocusDone,
  onQuantityEnter,
  subtotal,
  heldCount,
  onHold,
  onOpenHeld,
  onClear,
  onCharge,
}: CartPanelProps) => {
  const refs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    if (!focusRequest) return;
    const node = refs.current.get(focusRequest.id);
    const input = node?.querySelector("input") as HTMLInputElement | null;
    if (input) {
      input.focus();
      input.select();
    }
    onFocusDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  return (
    <section className="w-full lg:w-[440px] shrink-0 flex flex-col bg-background-50 rounded-lg border border-background-200 max-h-[calc(100vh-8rem)] lg:sticky lg:top-20">
      <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground-950">
            Venta actual
          </h2>
          <Chip tone={channel === "retail" ? "primary" : "accent"}>
            {channel === "retail" ? "MINORISTA" : "MAYORISTA"}
          </Chip>
        </div>
        {lines.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-foreground-400 hover:text-danger cursor-pointer"
          >
            Vaciar
          </button>
        ) : null}
      </div>

      <div className="px-4 py-3 border-b border-background-200">
        <label className="block text-xs font-medium text-foreground-600 mb-1">
          Cliente (opcional)
        </label>
        <div className="relative flex items-center">
          <i className="ri-user-3-line absolute left-3 text-foreground-400 text-sm" />
          <input
            type="text"
            value={customer}
            onChange={(e) => onCustomerChange(e.target.value)}
            placeholder="Consumidor final"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-foreground-400 py-16 px-6">
            <i className="ri-shopping-cart-2-line text-5xl" />
            <p className="mt-3 text-sm">
              La venta esta vacia. Busca un producto y presiona Enter.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-background-100">
            {lines.map((line) => {
              const unit = line.unit;
              const stockIssue =
                line.availableStock !== null &&
                line.quantity > line.availableStock
                  ? line.availableStock - line.quantity
                  : null;
              return (
                <li key={line.lineId} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground-900 truncate">
                          {line.name}
                        </span>
                        {line.kind === "combo" ? (
                          <Chip tone="accent">COMBO</Chip>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-foreground-500 tabular-nums">
                          {toCurrency(line.unitPrice)} / {unit === "kg" ? "kg" : "un"}
                        </span>
                        {line.promotionLabel ? (
                          <Chip tone="primary" icon="ri-price-tag-3-line">
                            {line.promotionLabel}
                          </Chip>
                        ) : null}
                      </div>
                      {line.kind === "combo" &&
                      line.comboComponents &&
                      line.comboComponents.length > 0 ? (
                        <p className="mt-1.5 text-[11px] leading-snug text-foreground-400">
                          <span className="font-medium text-foreground-500">
                            Incluye:
                          </span>{" "}
                          {line.comboComponents
                            .map(
                              (c) =>
                                `${formatQuantity(c.quantity, c.unit)} ${c.name}`
                            )
                            .join(" + ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-sm font-semibold text-foreground-900 tabular-nums">
                        {toCurrency(line.subtotal)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-32" ref={(el) => { refs.current.set(line.lineId, el); }}>
                      <NumberInput
                        value={line.quantity}
                        decimals={quantityDecimals(unit)}
                        min={0}
                        suffix={unit === "kg" ? "kg" : "un"}
                        onChange={(v) => onSetQuantity(line.lineId, v)}
                        onEnter={onQuantityEnter}
                        ariaLabel={`Cantidad de ${line.name}`}
                      />
                    </div>
                    <IconButton
                      icon="ri-delete-bin-6-line"
                      label="Eliminar producto"
                      tone="danger"
                      onClick={() => onRemove(line.lineId)}
                      className="w-9 h-9 border border-background-300 shrink-0"
                    />
                  </div>

                  {stockIssue !== null ? (
                    <div className="mt-2 flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-2.5 py-1.5 text-xs text-warning">
                      <i className="ri-alert-line mt-0.5" />
                      <span>
                        Stock insuficiente. El producto quedaria en{" "}
                        {stockIssue.toFixed(unit === "kg" ? 3 : 0)}{" "}
                        {unit === "kg" ? "kg" : "un"}.
                      </span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-background-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-foreground-600">
          <span>Subtotal</span>
          <span className="tabular-nums">{toCurrency(subtotal)}</span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-sm font-medium text-foreground-700">TOTAL</span>
          <span className="text-3xl font-bold text-foreground-950 tabular-nums leading-none">
            {toCurrency(subtotal)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" icon="ri-save-3-line" onClick={onHold} disabled={lines.length === 0}>
            Guardar preventa
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="ri-inbox-archive-line"
            onClick={onOpenHeld}
          >
            Ventas guardadas {heldCount > 0 ? `(${heldCount})` : ""}
          </Button>
        </div>
        <Button
          size="lg"
          className="w-full mt-2"
          icon="ri-send-plane-line"
          disabled={lines.length === 0 || subtotal <= 0}
          onClick={onCharge}
        >
          ENVIAR A CAJA
        </Button>
        <p className="mt-2 text-[11px] text-foreground-400 text-center">
          La venta queda pendiente hasta que Caja/ADMIN la confirma.
        </p>
      </div>
    </section>
  );
};

export default CartPanel;