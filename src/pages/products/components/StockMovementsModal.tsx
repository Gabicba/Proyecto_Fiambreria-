import { useEffect, useState } from "react";
import type { Product, StockAdjustReason } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Select from "@/components/base/Select";
import Chip from "@/components/base/Chip";
import { costWithIva, margin, markup, multiplier, profit } from "@/utils/pricing";
import { round2, toCurrency, toDateTimeLabel, toNumber } from "@/utils/format";
import { getStockState, stockStateLabel, stockStateTone } from "@/utils/inventory";

interface StockMovementsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

const reasons: StockAdjustReason[] = [
  "Recuento fisico",
  "Carga inicial",
  "Mercaderia recibida",
  "Correccion",
  "Rotura",
  "Otro",
];

const typeTone = (type: string): "success" | "danger" | "primary" | "neutral" => {
  if (type === "Venta" || type === "Combo" || type === "Consumo") return "danger";
  if (type === "Ingreso") return "success";
  if (type === "Ajuste") return "primary";
  return "neutral";
};

const StockMovementsModal = ({ open, onClose, product }: StockMovementsModalProps) => {
  const { state, currentUser, adjustStock } = useApp();
  const [newStock, setNewStock] = useState(0);
  const [reason, setReason] = useState<StockAdjustReason>("Recuento fisico");
  const [note, setNote] = useState("");
  const [newCost, setNewCost] = useState(0);
  const [applyPrices, setApplyPrices] = useState(true);

  useEffect(() => {
    if (open && product) {
      setNewStock(product.stock);
      setReason("Recuento fisico");
      setNote("");
      setNewCost(0);
      setApplyPrices(true);
    }
  }, [open, product]);

  if (!product) return null;

  const movements = state.stockMovements.filter((m) => m.productId === product.id);
  const stockState = getStockState(product);
  const delta = round2(newStock - product.stock);

  const originalCostIva = costWithIva(product);
  const multRetail = multiplier(product.priceRetail, originalCostIva);
  const multWholesale = multiplier(
    product.samePrice ? product.priceRetail : product.priceWholesale,
    originalCostIva
  );
  const hasNewCost = newCost > 0 && newCost !== product.costNet;
  const newCostIva = costWithIva({ costNet: newCost, iva: product.iva });
  const suggestedRetail = hasNewCost ? round2(newCostIva * multRetail) : product.priceRetail;
  const suggestedWholesale = hasNewCost
    ? round2(newCostIva * multWholesale)
    : product.samePrice
      ? product.priceRetail
      : product.priceWholesale;

  const suggestedMarkup = markup(suggestedRetail, newCostIva);
  const suggestedMargin = margin(suggestedRetail, newCostIva);
  const suggestedProfit = profit(suggestedRetail, newCostIva);

  const apply = () => {
    if (!currentUser) return;
    const finalNote = note.trim() || reason;
    adjustStock({
      productId: product.id,
      newStock,
      reason,
      note: finalNote,
      user: currentUser,
      costNet: hasNewCost ? newCost : null,
      priceRetail: hasNewCost && applyPrices ? suggestedRetail : null,
      priceWholesale: hasNewCost && applyPrices ? suggestedWholesale : null,
    });
    setNote("");
    setNewCost(0);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Inventario · ${product.name}`}
      subtitle="Ajustá el stock, actualizá el costo y revisá el historial de movimientos."
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-background-200 p-3">
          <p className="text-xs text-foreground-500">Stock actual</p>
          <p className="text-xl font-semibold text-foreground-950 tabular-nums">
            {toNumber(product.stock, product.unit === "kg" ? 3 : 0)}{" "}
            <span className="text-sm text-foreground-500">
              {product.unit === "kg" ? "kg" : "un"}
            </span>
          </p>
        </div>
        <div className="rounded-md border border-background-200 p-3">
          <p className="text-xs text-foreground-500">Stock minimo</p>
          <p className="text-xl font-semibold text-foreground-950 tabular-nums">
            {toNumber(product.minStock, product.unit === "kg" ? 3 : 0)}
          </p>
        </div>
        <div className="rounded-md border border-background-200 p-3">
          <p className="text-xs text-foreground-500 mb-1">Estado</p>
          <Chip tone={stockStateTone(stockState)}>{stockStateLabel(stockState)}</Chip>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-background-200 p-3">
        <p className="text-sm font-medium text-foreground-800 mb-3">
          Ajuste de inventario
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Nuevo stock total
            </label>
            <NumberInput
              value={newStock}
              onChange={setNewStock}
              decimals={product.unit === "kg" ? 3 : 0}
              suffix={product.unit === "kg" ? "kg" : "un"}
            />
            <p
              className={`mt-1 text-xs tabular-nums ${
                delta < 0 ? "text-danger" : delta > 0 ? "text-success" : "text-foreground-400"
              }`}
            >
              Diferencia: {delta > 0 ? "+" : ""}
              {toNumber(delta, product.unit === "kg" ? 3 : 0)}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Motivo
            </label>
            <Select
              value={reason}
              onChange={(v) => setReason(v as StockAdjustReason)}
              options={reasons.map((r) => ({ value: r, label: r }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Nuevo costo sin IVA (opcional)
            </label>
            <NumberInput value={newCost} onChange={setNewCost} suffix="$" />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-600 mb-1">
              Detalle (opcional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: recuento fisico de la manana"
              className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>

        {hasNewCost ? (
          <div className="mt-3 rounded-md border border-primary-200 bg-primary-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-2">
              Previsualizacion del cambio de costo
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-foreground-500">Costo s/IVA</p>
                <p className="tabular-nums text-foreground-700">
                  <span className="text-foreground-400 line-through">
                    {toCurrency(product.costNet)}
                  </span>{" "}
                  → <strong>{toCurrency(newCost)}</strong>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-foreground-500">IVA %</p>
                <p className="tabular-nums text-foreground-700">
                  {toNumber(product.iva, 1)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-foreground-500">Costo c/IVA</p>
                <p className="tabular-nums text-foreground-700">
                  <span className="text-foreground-400 line-through">
                    {toCurrency(originalCostIva)}
                  </span>{" "}
                  → <strong>{toCurrency(newCostIva)}</strong>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-foreground-500">Multiplicadores</p>
                <p className="tabular-nums text-foreground-700">
                  Min {toNumber(multRetail, 2)} · May {toNumber(multWholesale, 2)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md bg-background-50 border border-background-200 px-3 py-2">
                <p className="text-[11px] text-foreground-500">Precio minorista</p>
                <p className="tabular-nums text-foreground-700">
                  <span className="text-foreground-400 line-through">
                    {toCurrency(product.priceRetail)}
                  </span>{" "}
                  → <strong className="text-foreground-900">{toCurrency(suggestedRetail)}</strong>
                </p>
              </div>
              <div className="rounded-md bg-background-50 border border-background-200 px-3 py-2">
                <p className="text-[11px] text-foreground-500">Precio mayorista</p>
                <p className="tabular-nums text-foreground-700">
                  <span className="text-foreground-400 line-through">
                    {toCurrency(product.samePrice ? product.priceRetail : product.priceWholesale)}
                  </span>{" "}
                  → <strong className="text-foreground-900">{toCurrency(suggestedWholesale)}</strong>
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-foreground-600">
                Markup <strong>{toNumber(suggestedMarkup, 0)}%</strong>
              </span>
              <span className="text-foreground-600">
                Margen <strong>{toNumber(suggestedMargin, 0)}%</strong>
              </span>
              <span
                className={suggestedProfit < 0 ? "text-danger" : "text-success"}
              >
                Ganancia estimada <strong>{toCurrency(suggestedProfit)}</strong>
              </span>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm text-foreground-700 cursor-pointer">
              <input
                type="checkbox"
                checked={applyPrices}
                onChange={(e) => setApplyPrices(e.target.checked)}
                className="w-4 h-4 accent-primary-500"
              />
              Actualizar tambien los precios de venta con el multiplicador actual
            </label>
          </div>
        ) : null}

        <div className="mt-3 flex justify-end">
          <Button icon="ri-refresh-line" onClick={apply}>
            Aplicar ajuste
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-foreground-800 mb-2">
          Movimientos ({movements.length})
        </p>
        {movements.length === 0 ? (
          <p className="text-sm text-foreground-400 py-6 text-center">
            Sin movimientos registrados para este producto.
          </p>
        ) : (
          <ul className="divide-y divide-background-100 border border-background-200 rounded-md max-h-72 overflow-y-auto">
            {movements.map((m) => (
              <li key={m.id} className="px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Chip tone={typeTone(m.type)}>{m.type}</Chip>
                    <span className="text-xs text-foreground-500">
                      {toDateTimeLabel(m.date)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-500 mt-0.5 truncate">
                    {m.origin} · {m.userName}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    m.quantity < 0 ? "text-danger" : "text-success"
                  }`}
                >
                  {m.quantity > 0 ? "+" : ""}
                  {toNumber(m.quantity, product.unit === "kg" ? 3 : 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default StockMovementsModal;