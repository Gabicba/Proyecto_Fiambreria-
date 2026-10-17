import { useEffect, useMemo, useState } from "react";
import type { Unit } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import IconButton from "@/components/base/IconButton";
import NumberInput from "@/components/base/NumberInput";
import { employeeFullName } from "@/utils/employees";
import { normalizeText, round2, toCurrency, toNumber } from "@/utils/format";

interface WithdrawalLine {
  key: string;
  productId: string;
  name: string;
  unit: Unit;
  stock: number;
  quantity: number;
  unitPrice: number;
}

interface EmployeeWithdrawalModalProps {
  open: boolean;
  employeeId: string | null;
  onClose: () => void;
}

const toLocalInput = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const EmployeeWithdrawalModal = ({
  open,
  employeeId,
  onClose,
}: EmployeeWithdrawalModalProps) => {
  const { state, currentUser, registerEmployeeWithdrawal } = useApp();
  const { notify } = useToast();

  const employee = state.employees.find((e) => e.id === employeeId) ?? null;
  // Solo ADMIN puede apartarse del precio sugerido.
  const canEditPrice = currentUser?.role === "admin";

  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<WithdrawalLine[]>([]);
  const [date, setDate] = useState(toLocalInput(new Date()));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setLines([]);
    setDate(toLocalInput(new Date()));
    setNote("");
    setError("");
    setSubmitting(false);
  }, [open, employeeId]);

  const results = useMemo(() => {
    if (!employeeId) return [];
    const q = normalizeText(query).trim();
    return state.products
      .filter((p) => p.active)
      .filter((p) => {
        if (!q) return true;
        return normalizeText(
          `${p.name} ${p.brand} ${p.internalCode} ${p.barcode}`
        ).includes(q);
      })
      .slice(0, 8);
  }, [state.products, query, employeeId]);

  const total = round2(lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0));

  const addProduct = (productId: string) => {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId
            ? { ...l, quantity: round2(l.quantity + (l.unit === "kg" ? 0.5 : 1)) }
            : l
        );
      }
      return [
        ...prev,
        {
          key: `${productId}-${Date.now()}`,
          productId,
          name: product.name,
          unit: product.unit,
          stock: product.stock,
          quantity: product.unit === "kg" ? 0.5 : 1,
          unitPrice: product.priceRetail,
        },
      ];
    });
    setQuery("");
  };

  const updateLine = (key: string, patch: Partial<WithdrawalLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = () => {
    if (!employee || !currentUser) return;
    if (lines.length === 0) {
      setError("Agrega al menos un producto al retiro.");
      return;
    }
    if (lines.some((l) => l.quantity <= 0)) {
      setError("Las cantidades deben ser mayores a cero.");
      return;
    }
    setSubmitting(true);
    const result = registerEmployeeWithdrawal({
      employeeId: employee.id,
      date: new Date(date).toISOString(),
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      })),
      note,
      user: currentUser,
    });
    if (result.error || !result.withdrawal) {
      setSubmitting(false);
      setError(result.error ?? "No se pudo registrar el retiro.");
      return;
    }
    notify(
      "Retiro registrado",
      "success",
      `${toCurrency(result.withdrawal.total)} · pendiente de descuento`
    );
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Registrar retiro de mercaderia"
      subtitle={
        employee
          ? `${employeeFullName(employee)} · descuenta stock, no genera venta ni ingresa dinero a Caja`
          : "Selecciona un empleado"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            icon="ri-shopping-basket-2-line"
            onClick={submit}
            disabled={submitting || !employee}
          >
            Confirmar retiro
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <i className="ri-error-warning-line" /> {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Fecha y hora *
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Observacion (opcional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={160}
            placeholder="Ej: consumo familiar, almuerzo del personal..."
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      <div className="rounded-lg border border-background-200 bg-background-100/60 p-3">
        <label className="block text-xs font-medium text-foreground-600 mb-1">
          Buscar producto *
        </label>
        <div className="relative flex items-center">
          <i className="ri-search-line absolute left-3 text-foreground-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre, marca o codigo del producto..."
            className="w-full h-9 pl-9 pr-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-background-200 bg-background-50 divide-y divide-background-100">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-sm text-foreground-400">
              Sin productos que coincidan.
            </p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p.id)}
                className="w-full px-3 py-2 text-left flex items-center justify-between gap-3 hover:bg-background-100 cursor-pointer"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground-900 truncate">
                    {p.name}
                  </span>
                  <span className="block text-[11px] text-foreground-400">
                    {p.brand} · {p.unit === "kg" ? "kilogramos" : "unidades"} ·
                    stock {toNumber(p.stock, p.unit === "kg" ? 3 : 0)}
                  </span>
                </span>
                <span className="text-xs tabular-nums text-foreground-600 whitespace-nowrap">
                  {toCurrency(p.priceRetail)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-background-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-xs text-foreground-500 border-b border-background-200 bg-background-100/60">
                <th className="py-2 px-3 font-medium">Producto</th>
                <th className="py-2 px-3 font-medium w-32">Cantidad</th>
                <th className="py-2 px-3 font-medium w-44">Precio aplicado</th>
                <th className="py-2 px-3 font-medium text-right w-28">Subtotal</th>
                <th className="py-2 px-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-background-100">
              {lines.map((l) => {
                const product = state.products.find((p) => p.id === l.productId);
                const suggested = product?.priceRetail ?? 0;
                const differs = Math.abs(l.unitPrice - suggested) > 0.009;
                return (
                <tr key={l.key}>
                  <td className="py-2 px-3">
                    <span className="block font-medium text-foreground-900">
                      {l.name}
                    </span>
                    <span className="block text-[11px] text-foreground-400">
                      {l.unit === "kg" ? "kilogramos" : "unidades"}
                      {l.quantity > l.stock ? (
                        <span className="text-danger">
                          {" "}
                          · stock disponible {toNumber(l.stock, l.unit === "kg" ? 3 : 0)}
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <NumberInput
                      value={l.quantity}
                      onChange={(v) => updateLine(l.key, { quantity: v })}
                      decimals={l.unit === "kg" ? 3 : 0}
                      min={0}
                    />
                  </td>
                  <td className="py-2 px-3">
                    {canEditPrice ? (
                      <NumberInput
                        value={l.unitPrice}
                        onChange={(v) => updateLine(l.key, { unitPrice: v })}
                        suffix="$"
                        min={0}
                      />
                    ) : (
                      <div className="h-9 flex items-center justify-end px-2 rounded-md border border-background-200 bg-background-100 text-sm tabular-nums text-foreground-800">
                        {toCurrency(l.unitPrice)}
                      </div>
                    )}
                    <p
                      className={`mt-1 text-[10px] text-right tabular-nums ${
                        differs ? "text-warning" : "text-foreground-400"
                      }`}
                    >
                      {differs
                        ? `Sugerido ${toCurrency(suggested)}`
                        : "Sugerido minorista"}
                    </p>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-foreground-900">
                    {toCurrency(l.quantity * l.unitPrice)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <IconButton
                      icon="ri-delete-bin-line"
                      label="Quitar producto"
                      tone="danger"
                      size="sm"
                      onClick={() =>
                        setLines((prev) => prev.filter((x) => x.key !== l.key))
                      }
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lines.length === 0 ? (
          <div className="py-8 text-center text-foreground-400">
            <i className="ri-shopping-basket-line text-4xl" />
            <p className="mt-2 text-sm">Agrega productos con el buscador.</p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap rounded-lg border border-background-200 bg-background-50 px-4 py-3">
        <div className="max-w-md space-y-1">
          <p className="text-xs text-foreground-500 flex items-start gap-1.5">
            <i className="ri-information-line mt-0.5" />
            El importe queda pendiente de descuento en la ficha del empleado. No se
            registra una venta ni se acredita dinero en ninguna cuenta.
          </p>
          <p className="text-[11px] text-foreground-400 flex items-start gap-1.5">
            <i className="ri-price-tag-3-line mt-0.5" />
            {canEditPrice
              ? "El precio sugerido es el minorista y puede ajustarse antes de confirmar. Pendiente de validacion comercial."
              : "Se aplica el precio minorista sugerido. Solo un usuario ADMIN puede modificarlo."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-foreground-500">Total del retiro</p>
          <p className="text-xl font-semibold tabular-nums text-foreground-950">
            {toCurrency(total)}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeWithdrawalModal;