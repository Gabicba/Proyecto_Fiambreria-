import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Chip from "@/components/base/Chip";
import { costWithIva, margin, markup, multiplier, profit } from "@/utils/pricing";
import { round2, toCurrency, toNumber } from "@/utils/format";

interface BaseRow {
  productId: string;
  name: string;
  unit: Product["unit"];
  iva: number;
  origCostNet: number;
  origPriceRetail: number;
  origPriceWholesale: number;
  origMultRetail: number;
  origMultWholesale: number;
}

interface PreviewRow extends BaseRow {
  costNet: number;
  priceRetail: number;
  priceWholesale: number;
}

interface BulkUpdateModalProps {
  open: boolean;
  onClose: () => void;
  selected: Product[];
  onApply: (
    updates: {
      productId: string;
      costNet: number;
      priceRetail: number;
      priceWholesale: number;
    }[]
  ) => void;
}

const BulkUpdateModal = ({
  open,
  onClose,
  selected,
  onApply,
}: BulkUpdateModalProps) => {
  const [base, setBase] = useState<BaseRow[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!open) return;
    const nextBase: BaseRow[] = selected.map((p) => {
      const costIva = costWithIva(p);
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        iva: p.iva,
        origCostNet: p.costNet,
        origPriceRetail: p.priceRetail,
        origPriceWholesale: p.samePrice ? p.priceRetail : p.priceWholesale,
        origMultRetail: multiplier(p.priceRetail, costIva),
        origMultWholesale: multiplier(
          p.samePrice ? p.priceRetail : p.priceWholesale,
          costIva
        ),
      };
    });
    setBase(nextBase);
    setRows(
      nextBase.map((b) => ({
        ...b,
        costNet: b.origCostNet,
        priceRetail: b.origPriceRetail,
        priceWholesale: b.origPriceWholesale,
      }))
    );
    setPercent(0);
  }, [open, selected]);

  const update = (productId: string, patch: Partial<PreviewRow>) =>
    setRows((prev) =>
      prev.map((r) => (r.productId === productId ? { ...r, ...patch } : r))
    );

  const multOf = (row: BaseRow): { retail: number; wholesale: number } => ({
    retail: row.origMultRetail,
    wholesale: row.origMultWholesale,
  });

  /**
   * Aplica el % sobre el COSTO ORIGINAL y recalcula los precios sugeridos con
   * los multiplicadores minorista/mayorista originales (independientes).
   * Nunca se acumula: siempre se parte del valor original.
   */
  const applyToCost = () => {
    setRows((prev) =>
      prev.map((r) => {
        const costNet = round2(r.origCostNet * (1 + percent / 100));
        const costIva = costWithIva({ costNet, iva: r.iva });
        const m = multOf(r);
        return {
          ...r,
          costNet,
          priceRetail: m.retail > 0 ? round2(costIva * m.retail) : r.priceRetail,
          priceWholesale:
            m.wholesale > 0 ? round2(costIva * m.wholesale) : r.priceWholesale,
        };
      })
    );
  };

  const applyToRetail = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        priceRetail: round2(r.origPriceRetail * (1 + percent / 100)),
      }))
    );
  };

  const applyToWholesale = () => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        priceWholesale: round2(r.origPriceWholesale * (1 + percent / 100)),
      }))
    );
  };

  const onCostChange = (productId: string, costNet: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.productId !== productId) return r;
        const costIva = costWithIva({ costNet, iva: r.iva });
        const m = multOf(r);
        return {
          ...r,
          costNet,
          priceRetail: m.retail > 0 ? round2(costIva * m.retail) : r.priceRetail,
          priceWholesale:
            m.wholesale > 0 ? round2(costIva * m.wholesale) : r.priceWholesale,
        };
      })
    );
  };

  const onMultChange = (
    row: PreviewRow,
    channel: "retail" | "wholesale",
    value: number
  ) => {
    const costIva = costWithIva({ costNet: row.costNet, iva: row.iva });
    const nextPrice = round2(costIva * value);
    update(row.productId, {
      [channel === "retail" ? "priceRetail" : "priceWholesale"]: nextPrice,
    } as Partial<PreviewRow>);
  };

  const summary = useMemo(() => {
    let changes = 0;
    rows.forEach((r, i) => {
      const b = base[i];
      if (!b) return;
      if (
        round2(r.costNet) !== round2(b.origCostNet) ||
        round2(r.priceRetail) !== round2(b.origPriceRetail) ||
        round2(r.priceWholesale) !== round2(b.origPriceWholesale)
      ) {
        changes += 1;
      }
    });
    return { changes };
  }, [rows, base]);

  const resetPreview = () => {
    setRows(
      base.map((b) => ({
        ...b,
        costNet: b.origCostNet,
        priceRetail: b.origPriceRetail,
        priceWholesale: b.origPriceWholesale,
      }))
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Actualizacion masiva (${rows.length} productos)`}
      subtitle="El ajuste se calcula siempre sobre el valor original. La previsualizacion no se acumula. Los datos se guardan solo al confirmar."
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            icon="ri-refresh-line"
            onClick={resetPreview}
          >
            Restablecer
          </Button>
          <Button
            icon="ri-save-3-line"
            disabled={summary.changes === 0}
            onClick={() =>
              onApply(
                rows.map((r) => ({
                  productId: r.productId,
                  costNet: round2(r.costNet),
                  priceRetail: round2(r.priceRetail),
                  priceWholesale: round2(r.priceWholesale),
                }))
              )
            }
          >
            Aplicar cambios ({summary.changes})
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-background-200 bg-background-100 px-3 py-3">
        <span className="text-sm text-foreground-600">Ajuste rapido %:</span>
        <div className="w-28">
          <NumberInput value={percent} onChange={setPercent} suffix="%" />
        </div>
        <Button size="sm" variant="outline" icon="ri-refresh-line" onClick={applyToCost}>
          Aplicar a costo
        </Button>
        <Button size="sm" variant="outline" onClick={applyToRetail}>
          Aplicar a minorista
        </Button>
        <Button size="sm" variant="outline" onClick={applyToWholesale}>
          Aplicar a mayorista
        </Button>
        <span className="text-xs text-foreground-400">
          Al aplicar a costo se recalculan los precios sugeridos con el
          multiplicador de cada producto.
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const costIva = costWithIva({ costNet: row.costNet, iva: row.iva });
          const mRetail = multiplier(row.priceRetail, costIva);
          const mWholesale = multiplier(row.priceWholesale, costIva);
          const profitRetail = profit(row.priceRetail, costIva);
          const profitWholesale = profit(row.priceWholesale, costIva);
          const costChanged =
            round2(row.costNet) !== round2(row.origCostNet);

          return (
            <div
              key={row.productId}
              className="rounded-md border border-background-200 p-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground-900">
                    {row.name}
                  </span>
                  <Chip tone="neutral">
                    {row.unit === "kg" ? "kg" : "un"}
                  </Chip>
                </div>
                <div className="flex items-center gap-2">
                  <Chip tone={profitRetail < 0 ? "danger" : "success"}>
                    Gan. min {toCurrency(profitRetail)}
                  </Chip>
                  <Chip tone={profitWholesale < 0 ? "danger" : "success"}>
                    Gan. may {toCurrency(profitWholesale)}
                  </Chip>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-md bg-background-100 px-2.5 py-1.5">
                  <p className="text-[11px] text-foreground-500">
                    Costo orig. s/IVA
                  </p>
                  <p className="text-sm tabular-nums text-foreground-700">
                    {toCurrency(row.origCostNet)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-foreground-500 mb-1">
                    Costo nuevo s/IVA
                  </p>
                  <NumberInput
                    value={row.costNet}
                    onChange={(v) => onCostChange(row.productId, v)}
                    suffix="$"
                  />
                </div>
                <div className="rounded-md bg-background-100 px-2.5 py-1.5">
                  <p className="text-[11px] text-foreground-500">IVA %</p>
                  <p className="text-sm tabular-nums text-foreground-700">
                    {toNumber(row.iva, 1)}
                  </p>
                </div>
                <div className="rounded-md bg-background-100 px-2.5 py-1.5">
                  <p className="text-[11px] text-foreground-500">
                    Costo c/IVA{costChanged ? " (nuevo)" : ""}
                  </p>
                  <p className="text-sm tabular-nums text-foreground-800 font-medium">
                    {toCurrency(costIva)}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border border-background-200 p-2.5">
                  <Chip tone="primary" icon="ri-user-line" className="mb-2">
                    Minorista
                  </Chip>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-foreground-500 mb-1">
                        Precio
                      </label>
                      <NumberInput
                        value={row.priceRetail}
                        onChange={(v) =>
                          update(row.productId, { priceRetail: v })
                        }
                        suffix="$"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-foreground-500 mb-1">
                        Multiplicador
                      </label>
                      <NumberInput
                        value={mRetail}
                        onChange={(v) => onMultChange(row, "retail", v)}
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[11px] text-foreground-500">Markup</p>
                      <p className="text-xs tabular-nums text-foreground-700">
                        {toNumber(markup(row.priceRetail, costIva), 0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-foreground-500">Margen</p>
                      <p className="text-xs tabular-nums text-foreground-700">
                        {toNumber(margin(row.priceRetail, costIva), 0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-foreground-500">Ganancia</p>
                      <p
                        className={`text-xs font-medium tabular-nums ${
                          profitRetail < 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        {toCurrency(profitRetail)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-background-200 p-2.5">
                  <Chip tone="accent" icon="ri-store-3-line" className="mb-2">
                    Mayorista
                  </Chip>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-foreground-500 mb-1">
                        Precio
                      </label>
                      <NumberInput
                        value={row.priceWholesale}
                        onChange={(v) =>
                          update(row.productId, { priceWholesale: v })
                        }
                        suffix="$"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-foreground-500 mb-1">
                        Multiplicador
                      </label>
                      <NumberInput
                        value={mWholesale}
                        onChange={(v) => onMultChange(row, "wholesale", v)}
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[11px] text-foreground-500">Markup</p>
                      <p className="text-xs tabular-nums text-foreground-700">
                        {toNumber(markup(row.priceWholesale, costIva), 0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-foreground-500">Margen</p>
                      <p className="text-xs tabular-nums text-foreground-700">
                        {toNumber(margin(row.priceWholesale, costIva), 0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-foreground-500">Ganancia</p>
                      <p
                        className={`text-xs font-medium tabular-nums ${
                          profitWholesale < 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        {toCurrency(profitWholesale)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? (
          <p className="text-sm text-foreground-400 py-8 text-center">
            No hay productos seleccionados.
          </p>
        ) : null}
      </div>
    </Modal>
  );
};

export default BulkUpdateModal;