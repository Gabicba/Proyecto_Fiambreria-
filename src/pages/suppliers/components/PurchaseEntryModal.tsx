import { useEffect, useMemo, useState } from "react";
import type { Product, TaxDistributionRule } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Select from "@/components/base/Select";
import NumberInput from "@/components/base/NumberInput";
import QuickProductModal from "./QuickProductModal";
import {
  computePurchase,
  convertCostInput,
  grossCostFromInput,
  netCostFromInput,
  type RawPurchaseLine,
} from "@/utils/purchases";
import { costWithIva } from "@/utils/pricing";
import {
  normalizeText,
  round2,
  round3,
  toCurrency,
  toNumber,
} from "@/utils/format";

interface PurchaseEntryModalProps {
  open: boolean;
  onClose: () => void;
  defaultSupplierId?: string;
  onSaved?: () => void;
}

interface Row extends RawPurchaseLine {
  key: string;
  boxes: number;
  unitsPerBox: number;
  // El costo fue editado a mano: se conserva si cambia la modalidad de IVA.
  manual: boolean;
}

const toLocalInput = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const receiptTypes = [
  "Factura A",
  "Factura B",
  "Factura C",
  "Remito",
  "Ticket",
  "Otro",
];

const ruleOptions = [
  { value: "neto", label: "Proporcional al neto" },
  { value: "iva", label: "Proporcional al IVA" },
  { value: "igual", label: "Partes iguales" },
];

const PurchaseEntryModal = ({
  open,
  onClose,
  defaultSupplierId,
  onSaved,
}: PurchaseEntryModalProps) => {
  const { state, currentUser, createPurchaseInvoice, upsertProduct } = useApp();
  const { notify } = useToast();

  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(toLocalInput(new Date()));
  const [receiptType, setReceiptType] = useState("Factura A");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [pricesIncludeIva, setPricesIncludeIva] = useState(true);
  const [perceptionIvaRate, setPerceptionIvaRate] = useState(0);
  const [perceptionIibbRate, setPerceptionIibbRate] = useState(0);
  const [rule, setRule] = useState<TaxDistributionRule>("neto");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  // Costos editados a mano que quedaron con la interpretacion anterior.
  const [manualKept, setManualKept] = useState(0);
  const [query, setQuery] = useState("");
  const [payEnabled, setPayEnabled] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethodId, setPayMethodId] = useState("m1");
  const [payAccountId, setPayAccountId] = useState("");
  const [payNote, setPayNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickDefaults, setQuickDefaults] = useState({ costNet: 0, iva: 21 });

  useEffect(() => {
    if (!open) return;
    const initialSupplier = state.suppliers.find(
      (s) => s.id === (defaultSupplierId ?? "")
    );
    setSupplierId(defaultSupplierId ?? "");
    setPricesIncludeIva(initialSupplier?.pricesIncludeIva !== false);
    setDate(toLocalInput(new Date()));
    setReceiptType("Factura A");
    setReceiptNumber("");
    setAttachmentName(null);
    setPerceptionIvaRate(0);
    setPerceptionIibbRate(0);
    setRule("neto");
    setNote("");
    setRows([]);
    setManualKept(0);
    setQuery("");
    setPayEnabled(false);
    setPayAmount(0);
    setPayMethodId("m1");
    setPayAccountId("");
    setPayNote("");
    setError("");
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSupplierId]);

  const activeSuppliers = state.suppliers.filter((s) => s.active);
  const products = state.products;
  const selectedSupplier =
    state.suppliers.find((s) => s.id === supplierId) ?? null;

  const validRows = useMemo(
    () =>
      rows.filter(
        (r) => r.productId && r.quantity > 0 && r.costInput > 0
      ),
    [rows]
  );

  const preview = useMemo(
    () =>
      computePurchase(products, validRows, {
        pricesIncludeIva,
        perceptionIvaRate,
        perceptionIibbRate,
        taxDistributionRule: rule,
      }),
    [products, validRows, pricesIncludeIva, perceptionIvaRate, perceptionIibbRate, rule]
  );

  const lineByKey = useMemo(() => {
    const map = new Map<string, (typeof preview.lines)[number]>();
    validRows.forEach((row, index) => {
      const line = preview.lines[index];
      if (line) map.set(row.key, line);
    });
    return map;
  }, [validRows, preview]);

  const results = useMemo(() => {
    const q = normalizeText(query).trim();
    if (!q) return [];
    return products
      .filter((p) => p.active)
      .filter((p) =>
        normalizeText(`${p.name} ${p.brand} ${p.internalCode} ${p.barcode}`).includes(q)
      )
      .slice(0, 7);
  }, [products, query]);

  const payAccounts = state.accounts.filter(
    (a) => a.active && a.methodId === payMethodId
  );

  useEffect(() => {
    if (payAccounts.length === 1) setPayAccountId(payAccounts[0].id);
    else if (!payAccounts.some((a) => a.id === payAccountId)) setPayAccountId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payMethodId, open, payAccounts.length]);

  const costForProduct = (product: Product): number =>
    pricesIncludeIva ? round2(costWithIva(product)) : round2(product.costNet);

  const productIva = (productId: string): number =>
    products.find((p) => p.id === productId)?.iva ?? 0;

  /** Convierte los importes precargados sin cambiar su valor economico. */
  const convertRows = (
    list: Row[],
    nextMode: boolean,
    includeManual: boolean
  ): Row[] =>
    list.map((row) => {
      const product = products.find((p) => p.id === row.productId);
      if (!product) return row;
      if (row.manual && !includeManual) return row;
      return {
        ...row,
        costInput: convertCostInput(
          row.costInput,
          product.iva,
          pricesIncludeIva,
          nextMode
        ),
        manual: false,
      };
    });

  const changeMode = (next: boolean) => {
    if (next === pricesIncludeIva) return;
    const manualRows = rows.filter((r) => r.manual && r.productId).length;
    setRows((prev) => convertRows(prev, next, false));
    setManualKept(manualRows);
    setPricesIncludeIva(next);
  };

  const reinterpretManual = () => {
    setRows((prev) => convertRows(prev, pricesIncludeIva, true));
    setManualKept(0);
  };

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    const supplier = state.suppliers.find((s) => s.id === id);
    if (!supplier) return;
    const preferred = supplier.pricesIncludeIva !== false;
    if (preferred !== pricesIncludeIva) changeMode(preferred);
  };

  const addProduct = (product: Product) => {
    setRows((prev) => [
      ...prev,
      {
        key: `row_${Date.now()}_${prev.length}`,
        productId: product.id,
        quantity: product.unit === "kg" ? 0.5 : 1,
        costInput: costForProduct(product),
        boxes: 0,
        unitsPerBox: 0,
        manual: false,
      },
    ]);
    setQuery("");
  };

  const updateRow = (key: string, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.costInput !== undefined) next.manual = true;
        if (next.boxes > 0 && next.unitsPerBox > 0) {
          next.quantity = round3(next.boxes * next.unitsPerBox);
        }
        return next;
      })
    );

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  const handleQuickCreated = (product: Product) => {
    // El producto se agrega al catalogo y vuelve a la carga en curso.
    upsertProduct(product, currentUser?.name ?? "Sistema");
    setRows((prev) => [
      ...prev,
      {
        key: `row_${Date.now()}_${prev.length}`,
        productId: product.id,
        quantity: product.unit === "kg" ? 0.5 : 1,
        costInput: round2(
          pricesIncludeIva
            ? product.costNet * (1 + product.iva / 100)
            : product.costNet
        ),
        boxes: 0,
        unitsPerBox: 0,
        manual: false,
      },
    ]);
    setQuickOpen(false);
    notify("Producto creado", "success", `${product.name} agregado al ingreso`);
  };

  const confirm = () => {
    if (busy || !currentUser) return;
    if (!supplierId) {
      setError("Selecciona el proveedor de la factura.");
      return;
    }
    if (!receiptNumber.trim()) {
      setError("Ingresa el numero de comprobante.");
      return;
    }
    if (!date) {
      setError("Indica la fecha y hora de compra.");
      return;
    }
    if (validRows.length === 0) {
      setError("Agrega al menos un producto con cantidad y costo.");
      return;
    }
    if (payEnabled && !payAccountId) {
      setError("Selecciona la cuenta para el pago inicial.");
      return;
    }
    setBusy(true);
    setError("");
    const result = createPurchaseInvoice({
      supplierId,
      date: new Date(date).toISOString(),
      receiptType,
      receiptNumber,
      attachmentName,
      pricesIncludeIva,
      perceptionIvaRate,
      perceptionIibbRate,
      taxDistributionRule: rule,
      note,
      items: validRows.map((r) => ({
        productId: r.productId,
        quantity: r.quantity,
        costInput: r.costInput,
        boxes: r.boxes > 0 ? r.boxes : null,
        unitsPerBox: r.unitsPerBox > 0 ? r.unitsPerBox : null,
      })),
      payNow: payEnabled
        ? {
            amount: payAmount,
            methodId: payMethodId,
            accountId: payAccountId,
            note: payNote,
          }
        : null,
      user: currentUser,
    });
    setBusy(false);
    if (result.error || !result.invoice) {
      setError(result.error ?? "No se pudo registrar el ingreso.");
      return;
    }
    notify(
      "Ingreso de mercaderia registrado",
      "success",
      `${result.invoice.receiptNumber} · ${toCurrency(result.invoice.total)} · stock sumado`
    );
    onSaved?.();
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Ingreso de mercaderia"
        subtitle="Una factura, un proveedor. La mercaderia se SUMA al stock actual."
        size="xl"
        footer={
          <>
            <span className="mr-auto text-xs text-foreground-500 hidden md:inline">
              {validRows.length} producto(s) · Total {toCurrency(preview.total)}
            </span>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button icon="ri-check-double-line" onClick={confirm} disabled={busy}>
              Confirmar ingreso
            </Button>
          </>
        }
      >
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            <i className="ri-error-warning-line" /> {error}
          </div>
        ) : null}

        {manualKept > 0 ? (
          <div className="mb-4 flex flex-col md:flex-row md:items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-foreground-700">
            <i className="ri-alert-line text-warning text-base" />
            <span className="flex-1">
              Se conservaron {manualKept} costo(s) editados manualmente. La columna
              ahora se interpreta como{" "}
              <strong>{pricesIncludeIva ? "IVA incluido" : "sin IVA"}</strong>.
              Reinterpretalos solo si los cargaste con la modalidad anterior.
            </span>
            <button
              type="button"
              onClick={reinterpretManual}
              className="inline-flex items-center gap-1 rounded-md border border-warning/40 px-2 py-1 font-medium text-warning hover:bg-warning/10 cursor-pointer whitespace-nowrap"
            >
              <i className="ri-refresh-line" /> Reinterpretar importes
            </button>
          </div>
        ) : null}

        <div className="space-y-5">
          <section className="rounded-md border border-background-200 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-2">
              Datos de la factura
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-foreground-600 mb-1">
                  Proveedor *
                </label>
                <Select
                  value={supplierId}
                  onChange={handleSupplierChange}
                  placeholder="Seleccionar proveedor"
                  options={activeSuppliers.map((s) => ({
                    value: s.id,
                    label: s.name,
                    hint:
                      s.kind === "hipermercado"
                        ? "Hipermercado"
                        : s.pricesIncludeIva === false
                          ? "Factura sin IVA"
                          : "Factura con IVA",
                  }))}
                />
                {selectedSupplier ? (
                  <p className="mt-1 text-[11px] text-foreground-400">
                    <i className="ri-information-line mr-1" />
                    Preferencia del proveedor: precios de factura{" "}
                    {selectedSupplier.pricesIncludeIva === false
                      ? "sin IVA incluido"
                      : "con IVA incluido"}
                    . Podes cambiarla para esta factura.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">
                  Fecha y hora de compra *
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
                  Tipo de comprobante
                </label>
                <Select
                  value={receiptType}
                  onChange={setReceiptType}
                  options={receiptTypes.map((t) => ({ value: t, label: t }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">
                  Numero *
                </label>
                <input
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="0001-00001234"
                  className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">
                  Adjuntar factura (imagen o PDF)
                </label>
                <label className="flex items-center gap-2 h-9 px-3 rounded-md border border-dashed border-background-400 bg-background-50 text-sm text-foreground-600 cursor-pointer truncate">
                  <i className="ri-attachment-2" />
                  <span className="truncate">{attachmentName ?? "Elegir archivo"}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) =>
                      setAttachmentName(e.target.files?.[0]?.name ?? null)
                    }
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-background-200 p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500">
                Productos recibidos
              </h4>
              <Button
                size="sm"
                variant="outline"
                icon="ri-add-circle-line"
                onClick={() => {
                  const last = rows[rows.length - 1];
                  setQuickDefaults({
                    costNet: last
                      ? netCostFromInput(
                          last.costInput,
                          productIva(last.productId),
                          pricesIncludeIva
                        )
                      : 0,
                    iva: 21,
                  });
                  setQuickOpen(true);
                }}
              >
                Crear producto nuevo
              </Button>
            </div>

            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar producto por nombre, marca o codigo..."
                className="w-full h-9 pl-9 pr-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              {results.length > 0 ? (
                <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-background-200 bg-background-50">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50 cursor-pointer flex items-center justify-between gap-3"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-foreground-900">
                            {p.name}
                          </span>
                          <span className="block text-xs text-foreground-400">
                            {p.brand} · stock {toNumber(p.stock, p.unit === "kg" ? 3 : 0)}{" "}
                            {p.unit === "kg" ? "kg" : "un"}
                          </span>
                        </span>
                        <span className="text-xs tabular-nums text-foreground-500 shrink-0">
                          {toCurrency(costForProduct(p))}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-foreground-400">
                Busca y agrega los productos que llegaron en la factura.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="text-left text-xs text-foreground-500 border-b border-background-200">
                      <th className="py-2 px-2 font-medium">Producto</th>
                      <th className="py-2 px-2 font-medium w-28">Cantidad</th>
                      <th className="py-2 px-2 font-medium w-24">Cajas</th>
                      <th className="py-2 px-2 font-medium w-24">Un/caja</th>
                      <th className="py-2 px-2 font-medium w-36">
                        <span className="block">Costo unitario facturado</span>
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[1px] text-[10px] font-medium ${
                            pricesIncludeIva
                              ? "bg-accent-100 text-accent-900"
                              : "bg-secondary-100 text-secondary-900"
                          }`}
                        >
                          <i
                            className={
                              pricesIncludeIva
                                ? "ri-add-circle-line"
                                : "ri-subtract-line"
                            }
                          />
                          {pricesIncludeIva ? "IVA incluido" : "sin IVA"}
                        </span>
                      </th>
                      <th className="py-2 px-2 font-medium text-right">Total</th>
                      <th className="py-2 px-2 w-9" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-background-100">
                    {rows.map((row) => {
                      const product = products.find((p) => p.id === row.productId);
                      const line = lineByKey.get(row.key);
                      return (
                        <tr key={row.key}>
                          <td className="py-2 px-2">
                            <p className="text-foreground-900 truncate max-w-[220px]">
                              {product?.name ?? "—"}
                            </p>
                            <p className="text-[11px] text-foreground-400">
                              {product?.unit === "kg" ? "Kilogramos" : "Unidad"} ·
                              IVA {product?.iva ?? 0}%
                            </p>
                          </td>
                          <td className="py-2 px-2">
                            <NumberInput
                              value={row.quantity}
                              onChange={(v) => updateRow(row.key, { quantity: v })}
                              decimals={product?.unit === "kg" ? 3 : 0}
                              ariaLabel="Cantidad"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <NumberInput
                              value={row.boxes}
                              onChange={(v) => updateRow(row.key, { boxes: v })}
                              decimals={0}
                              ariaLabel="Cajas"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <NumberInput
                              value={row.unitsPerBox}
                              onChange={(v) => updateRow(row.key, { unitsPerBox: v })}
                              decimals={0}
                              ariaLabel="Unidades por caja"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <NumberInput
                              value={row.costInput}
                              onChange={(v) => updateRow(row.key, { costInput: v })}
                              suffix="$"
                              ariaLabel={
                                pricesIncludeIva
                                  ? "Costo unitario facturado con IVA"
                                  : "Costo unitario facturado sin IVA"
                              }
                            />
                            <p className="mt-1 text-[10px] text-foreground-400 tabular-nums whitespace-nowrap">
                              {pricesIncludeIva ? "Sin IVA " : "Con IVA "}
                              {toCurrency(
                                pricesIncludeIva
                                  ? netCostFromInput(
                                      row.costInput,
                                      product?.iva ?? 0,
                                      true
                                    )
                                  : grossCostFromInput(
                                      row.costInput,
                                      product?.iva ?? 0,
                                      false
                                    )
                              )}
                              {row.manual ? " · manual" : ""}
                            </p>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {line ? toCurrency(line.total) : "—"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeRow(row.key)}
                              aria-label="Quitar producto"
                              className="w-7 h-7 inline-flex items-center justify-center rounded-md text-foreground-400 hover:bg-danger-soft hover:text-danger cursor-pointer"
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-md border border-background-200 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-500 mb-2">
              Impuestos y costos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">
                  Precios de factura
                </label>
                <div className="flex items-center gap-1 bg-background-100 rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => changeMode(true)}
                    className={`flex-1 h-7 rounded-full text-xs font-medium cursor-pointer ${
                      pricesIncludeIva
                        ? "bg-primary-500 text-background-50"
                        : "text-foreground-600"
                    }`}
                  >
                    Incluyen IVA
                  </button>
                  <button
                    type="button"
                    onClick={() => changeMode(false)}
                    className={`flex-1 h-7 rounded-full text-xs font-medium cursor-pointer ${
                      !pricesIncludeIva
                        ? "bg-primary-500 text-background-50"
                        : "text-foreground-600"
                    }`}
                  >
                    Sin IVA
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">
                  Percepcion IVA %
                </label>
                <NumberInput
                  value={perceptionIvaRate}
                  onChange={setPerceptionIvaRate}
                  suffix="%"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">
                  Percepcion IIBB %
                </label>
                <NumberInput
                  value={perceptionIibbRate}
                  onChange={setPerceptionIibbRate}
                  suffix="%"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">
                  Distribuir impuestos
                </label>
                <Select
                  value={rule}
                  onChange={(v) => setRule(v as TaxDistributionRule)}
                  options={ruleOptions}
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-foreground-400">
              Si ingresas un costo con IVA se calcula el sin IVA con el IVA
              configurado de cada producto (y al reves). Al cambiar la modalidad,
              los importes precargados se convierten sin alterar su valor
              economico. Las reglas de precios minorista y mayorista usan el costo
              <strong> sin IVA</strong>. Las percepciones se calculan aparte y se
              reparten entre las lineas.
            </p>
          </section>

          <section className="rounded-md border border-background-200 overflow-hidden">
            <div className="px-3 py-2 bg-background-100 border-b border-background-200 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground-600">
                Previsualizacion de costos y precios
              </h4>
              <span className="text-[11px] text-foreground-500">
                Precios calculados sobre el costo sin IVA
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1020px]">
                <thead>
                  <tr className="text-left text-xs text-foreground-500 border-b border-background-200">
                    <th className="py-2 px-3 font-medium">Producto</th>
                    <th className="py-2 px-3 font-medium text-right">Stock actual → final</th>
                    <th className="py-2 px-3 font-medium text-right">
                      Costo facturado
                    </th>
                    <th className="py-2 px-3 font-medium text-right">Costo sin IVA</th>
                    <th className="py-2 px-3 font-medium text-right">Costo con IVA</th>
                    <th className="py-2 px-3 font-medium text-right">Minorista</th>
                    <th className="py-2 px-3 font-medium text-right">Mayorista</th>
                    <th className="py-2 px-3 font-medium text-right">Percep. IVA / IIBB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-background-100">
                  {validRows.map((row) => {
                    const product = products.find((p) => p.id === row.productId);
                    const line = lineByKey.get(row.key);
                    if (!product || !line) return null;
                    return (
                      <tr key={`prev-${row.key}`}>
                        <td className="py-2 px-3 text-foreground-900">
                          {line.productName}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-foreground-600">
                          {toNumber(product.stock, product.unit === "kg" ? 3 : 0)} →{" "}
                          <span className="font-semibold text-foreground-900">
                            {toNumber(
                              product.stock + line.quantity,
                              product.unit === "kg" ? 3 : 0
                            )}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          <span className="font-medium">
                            {toCurrency(line.costInput)}
                          </span>
                          <span className="block text-[10px] text-foreground-400">
                            {pricesIncludeIva ? "con IVA" : "sin IVA"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          <span className="text-foreground-400">
                            {toCurrency(line.prevCostNet)}
                          </span>{" "}
                          → <span className="font-medium">{toCurrency(line.costNet)}</span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          <span className="text-foreground-400">
                            {toCurrency(
                              round2(line.prevCostNet * (1 + line.iva / 100))
                            )}
                          </span>{" "}
                          → <span className="font-medium">{toCurrency(line.costWithIva)}</span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          <span className="text-foreground-400">
                            {toCurrency(line.prevPriceRetail)}
                          </span>{" "}
                          → <span className="font-medium">{toCurrency(line.newPriceRetail)}</span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          <span className="text-foreground-400">
                            {toCurrency(line.prevPriceWholesale)}
                          </span>{" "}
                          → <span className="font-medium">{toCurrency(line.newPriceWholesale)}</span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-foreground-500">
                          {toCurrency(line.perceptionIva)} /{" "}
                          {toCurrency(line.perceptionIibb)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {validRows.length === 0 ? (
              <p className="px-3 py-4 text-xs text-foreground-400">
                Agrega productos para ver la previsualizacion.
              </p>
            ) : null}
          </section>

          <section className="rounded-md border border-background-200 p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground-600">Subtotal neto</span>
                  <span className="tabular-nums">{toCurrency(preview.subtotalNet)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-600">IVA</span>
                  <span className="tabular-nums">{toCurrency(preview.ivaTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-600">Percepcion IVA</span>
                  <span className="tabular-nums">
                    {toCurrency(preview.perceptionIvaTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-600">Percepcion IIBB</span>
                  <span className="tabular-nums">
                    {toCurrency(preview.perceptionIibbTotal)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-background-200 pt-1.5 text-base font-bold">
                  <span>Total factura</span>
                  <span className="tabular-nums">{toCurrency(preview.total)}</span>
                </div>
                <p className="text-[11px] text-foreground-400">
                  Detalle distribuido: {ruleOptions.find((r) => r.value === rule)?.label}
                </p>
              </div>

              <div className="rounded-md bg-background-100 p-3">
                <label className="flex items-center gap-2 text-sm text-foreground-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payEnabled}
                    onChange={(e) => {
                      setPayEnabled(e.target.checked);
                      setPayAmount(e.target.checked ? preview.total : 0);
                    }}
                    className="w-4 h-4 accent-primary-500"
                  />
                  Registrar pago ahora (opcional)
                </label>
                {payEnabled ? (
                  <div className="mt-2 space-y-2">
                    <NumberInput
                      value={payAmount}
                      onChange={setPayAmount}
                      suffix="$"
                      placeholder={`Saldo ${toCurrency(preview.total)}`}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={payMethodId}
                        onChange={setPayMethodId}
                        options={state.paymentMethods
                          .filter((m) => m.active)
                          .map((m) => ({ value: m.id, label: m.name }))}
                      />
                      <Select
                        value={payAccountId}
                        onChange={setPayAccountId}
                        placeholder="Cuenta"
                        options={payAccounts.map((a) => ({
                          value: a.id,
                          label: a.name,
                        }))}
                      />
                    </div>
                    <input
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      placeholder="Observacion del pago (opcional)"
                      className="w-full h-8 px-2 rounded-md border border-background-300 bg-background-50 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                    <p className="text-[11px] text-foreground-400">
                      Si no pagas ahora, la factura queda pendiente y la deuda
                      aparece en la ficha del proveedor.
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-foreground-500">
                    La mercaderia ingresa al stock aunque la factura quede impaga.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-foreground-600 mb-1">
                Observaciones del ingreso
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                placeholder="Ej: entrega parcial, faltante informado por el proveedor..."
                className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </section>
        </div>
      </Modal>

      <QuickProductModal
        open={quickOpen}
        supplierId={supplierId}
        defaultCostNet={quickDefaults.costNet}
        defaultIva={quickDefaults.iva}
        onClose={() => setQuickOpen(false)}
        onCreated={handleQuickCreated}
      />
    </>
  );
};

export default PurchaseEntryModal;