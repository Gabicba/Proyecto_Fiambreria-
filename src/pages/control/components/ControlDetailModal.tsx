import { useEffect, useMemo, useState } from "react";
import type { Sale, Unit } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import NumberInput from "@/components/base/NumberInput";
import { cashPortionOf, changeFor } from "@/utils/sales";
import { round3, toCurrency, toDateTimeLabel, toNumber } from "@/utils/format";

interface ConfirmArgs {
  cashReceived: number | null;
  transferVerified: boolean;
}

interface ControlDetailModalProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirm: (args: ConfirmArgs) => void;
  onReturn: (reason: string) => void;
  onCancel: (reason: string) => void;
}

type ReasonMode = "return" | "cancel" | null;

const ControlDetailModal = ({
  open,
  onClose,
  sale,
  onConfirm,
  onReturn,
  onCancel,
}: ControlDetailModalProps) => {
  const { accountMap, productMap, state } = useApp();
  const [received, setReceived] = useState(0);
  const [transferVerified, setTransferVerified] = useState(false);
  const [reasonMode, setReasonMode] = useState<ReasonMode>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  useEffect(() => {
    if (open && sale) {
      const accounts = Array.from(accountMap.values());
      const cash = cashPortionOf(sale.payments, accounts);
      const informed = sale.cashReceived ?? 0;
      setReceived(informed > 0 ? informed : cash);
      setTransferVerified(sale.transferVerified);
      setReasonMode(null);
      setReason("");
      setReasonError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sale]);

  const accounts = useMemo(() => Array.from(accountMap.values()), [accountMap]);

  // Stock proyectado: detecta que productos quedarian negativos al confirmar.
  const projectedNegative = useMemo(() => {
    if (!sale) return [] as { name: string; unit: Unit; after: number }[];
    const deltas = new Map<string, number>();
    sale.items.forEach((line) => {
      if (line.kind === "combo" && line.comboId) {
        const combo = state.combos.find((c) => c.id === line.comboId);
        combo?.components.forEach((component) => {
          deltas.set(
            component.productId,
            round3(
              (deltas.get(component.productId) ?? 0) -
                component.quantity * line.quantity
            )
          );
        });
      } else if (line.productId) {
        deltas.set(
          line.productId,
          round3((deltas.get(line.productId) ?? 0) - line.quantity)
        );
      }
    });
    const list: { name: string; unit: Unit; after: number }[] = [];
    deltas.forEach((delta, productId) => {
      const product = productMap.get(productId);
      if (!product) return;
      const after = round3(product.stock + delta);
      if (after < 0) list.push({ name: product.name, unit: product.unit, after });
    });
    return list;
  }, [sale, productMap, state.combos]);

  if (!sale) return null;

  const cashPortion = cashPortionOf(sale.payments, accounts);
  const hasCash = cashPortion > 0;
  const hasTransfer = sale.payments.some((p) =>
    p.methodName.toLowerCase().includes("transfer")
  );
  const change = hasCash ? changeFor(received, cashPortion) : null;

  const submitReason = () => {
    if (!reason.trim()) {
      setReasonError(
        reasonMode === "cancel"
          ? "Indicá el motivo de la cancelación para continuar."
          : "Indicá qué debe corregir el vendedor para devolver la operación."
      );
      return;
    }
    if (reasonMode === "cancel") onCancel(reason.trim());
    else onReturn(reason.trim());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Operación #${sale.number}`}
      subtitle={`${toDateTimeLabel(sale.sentAt)} · Pendiente de control de caja`}
      size="lg"
      footer={
        reasonMode ? (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setReasonMode(null);
                setReason("");
                setReasonError("");
              }}
            >
              Volver
            </Button>
            <Button
              variant={reasonMode === "cancel" ? "danger" : "secondary"}
              icon={reasonMode === "cancel" ? "ri-close-circle-line" : "ri-arrow-go-back-line"}
              onClick={submitReason}
            >
              {reasonMode === "cancel" ? "Confirmar cancelación" : "Devolver al vendedor"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              icon="ri-arrow-go-back-line"
              className="mr-auto"
              onClick={() => setReasonMode("return")}
            >
              Devolver para corrección
            </Button>
            <Button
              variant="outline"
              icon="ri-close-circle-line"
              onClick={() => setReasonMode("cancel")}
            >
              Cancelar operación
            </Button>
            <Button
              icon="ri-check-double-line"
              onClick={() =>
                onConfirm({
                  cashReceived: hasCash ? received : null,
                  transferVerified,
                })
              }
            >
              Confirmar y finalizar
            </Button>
          </>
        )
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Vendedor</p>
          <p className="text-sm text-foreground-800">{sale.sellerName}</p>
        </div>
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Cliente</p>
          <p className="text-sm text-foreground-800 truncate">
            {sale.customer || "Consumidor final"}
          </p>
        </div>
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Tipo</p>
          <Chip tone={sale.channel === "retail" ? "primary" : "accent"}>
            {sale.channel === "retail" ? "MINORISTA" : "MAYORISTA"}
          </Chip>
        </div>
        <div className="rounded-md bg-background-100 px-3 py-2">
          <p className="text-xs text-foreground-500">Productos</p>
          <p className="text-sm text-foreground-800 tabular-nums">
            {sale.items.length}
          </p>
        </div>
      </div>

      <h4 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-500">
        Productos
      </h4>
      <div className="overflow-x-auto border border-background-200 rounded-md">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-xs text-foreground-500 bg-background-100/60">
              <th className="py-2 px-3 font-medium">Nombre</th>
              <th className="py-2 px-3 font-medium text-right">Cantidad</th>
              <th className="py-2 px-3 font-medium text-right">Precio</th>
              <th className="py-2 px-3 font-medium">Promoción</th>
              <th className="py-2 px-3 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-background-100">
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 px-3 text-foreground-800">{item.name}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {toNumber(item.quantity, item.unit === "kg" ? 3 : 0)}{" "}
                  {item.unit === "kg" ? "kg" : "un"}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {toCurrency(item.unitPrice)}
                </td>
                <td className="py-2 px-3">
                  {item.promotionLabel ? (
                    <Chip tone="primary">{item.promotionLabel}</Chip>
                  ) : (
                    <span className="text-xs text-foreground-400">—</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-medium">
                  {toCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md bg-foreground-950 px-4 py-4">
        <span className="text-sm font-semibold tracking-wide text-foreground-300">
          TOTAL DE LA OPERACIÓN
        </span>
        <span className="text-3xl font-extrabold text-background-50 tabular-nums leading-none">
          {toCurrency(sale.total)}
        </span>
      </div>

      {projectedNegative.length > 0 ? (
        <div className="mt-3 rounded-md border border-warning/40 bg-warning-soft px-3 py-2.5">
          <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
            <i className="ri-alert-line" />
            Al confirmar, este stock quedaría negativo
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {projectedNegative.map((p) => (
              <li key={p.name} className="text-xs text-foreground-700">
                {p.name} quedará en{" "}
                <span className="font-semibold tabular-nums">
                  {toNumber(p.after, p.unit === "kg" ? 3 : 0)}{" "}
                  {p.unit === "kg" ? "kg" : "un"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-foreground-500">
            Se permite la venta igualmente (puede haber mercadería física sin
            cargar). Quedará registrada una alerta administrativa.
          </p>
        </div>
      ) : null}

      <h4 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-500">
        Pago informado por el vendedor
      </h4>
      <ul className="border border-background-200 rounded-md divide-y divide-background-100">
        {sale.payments.map((p) => (
          <li key={p.id} className="px-3 py-2 flex items-center justify-between">
            <span className="text-sm text-foreground-700">
              {p.methodName}
              <span className="text-foreground-400"> · {p.accountName}</span>
            </span>
            <span className="text-sm font-medium tabular-nums text-foreground-900">
              {toCurrency(p.amount)}
            </span>
          </li>
        ))}
      </ul>

      {hasCash ? (
        <div className="mt-3 rounded-md border border-background-200 p-3">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="w-full lg:w-52">
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Efectivo recibido
              </label>
              <NumberInput value={received} onChange={setReceived} suffix="$" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="rounded-md bg-background-100 px-3 py-2">
                <p className="text-xs text-foreground-500">Efectivo a cobrar</p>
                <p className="text-2xl font-extrabold tabular-nums text-foreground-900">
                  {toCurrency(cashPortion)}
                </p>
              </div>
              <div
                className={`rounded-md px-3 py-2 ${
                  change !== null && change < 0 ? "bg-danger-soft" : "bg-success-soft"
                }`}
              >
                <p className="text-xs text-foreground-500">Vuelto</p>
                <p
                  className={`text-2xl font-extrabold tabular-nums ${
                    change !== null && change < 0 ? "text-danger" : "text-success"
                  }`}
                >
                  {change === null ? "—" : toCurrency(change)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {hasTransfer ? (
        <label className="mt-3 flex items-center gap-2 rounded-md border border-background-200 px-3 py-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={transferVerified}
            onChange={(e) => setTransferVerified(e.target.checked)}
            className="w-4 h-4 accent-primary-500"
          />
          <span className="text-sm text-foreground-700">
            Transferencia verificada manualmente por Caja/ADMIN
          </span>
        </label>
      ) : null}

      {!hasCash && !hasTransfer ? (
        <p className="mt-3 text-xs text-foreground-400 flex items-start gap-1.5">
          <i className="ri-information-line mt-0.5" />
          Los medios sin integración externa (débito, crédito, Mercado Pago) se
          validan de forma manual en esta primera versión.
        </p>
      ) : null}

      {reasonMode ? (
        <div className="mt-4 rounded-md border border-background-200 p-3">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            {reasonMode === "cancel"
              ? "Motivo de la cancelación *"
              : "Qué debe corregir el vendedor *"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder={
              reasonMode === "cancel"
                ? "Ej: el cliente se arrepintió de la compra."
                : "Ej: la cantidad de jamón no coincide con el peso real."
            }
            className="w-full px-3 py-2 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          {reasonError ? (
            <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
              <i className="ri-error-warning-line" /> {reasonError}
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
};

export default ControlDetailModal;