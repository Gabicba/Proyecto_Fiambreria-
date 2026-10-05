import type { Sale } from "@/types";
import { toCurrency, toDateTimeLabel, toNumber } from "@/utils/format";

interface ReceiptDocumentProps {
  sale: Sale;
}

const ReceiptDocument = ({ sale }: ReceiptDocumentProps) => (
  <div className="receipt-sheet w-[80mm] mx-auto bg-white text-foreground-950 px-3 py-4 text-[11px] leading-snug">
    <div className="text-center">
      <p className="text-lg font-bold tracking-[0.18em]">EL CHILENO</p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground-500">
        Fiambreria &amp; Almacen
      </p>
      <p className="mt-1 text-[10px] text-foreground-500">
        Gestion Comercial · Sistema POS
      </p>
      <div className="mt-2 flex justify-center">
        {sale.status === "anulada" ? (
          <span className="px-3 py-1 border-2 border-danger text-danger rounded text-[10px] font-bold tracking-[0.3em]">
            ANULADA
          </span>
        ) : (
          <span className="px-3 py-1 border-2 border-success text-success rounded text-[10px] font-bold tracking-[0.3em]">
            PAGADO
          </span>
        )}
      </div>
    </div>

    <div className="my-3 border-t border-dashed border-foreground-300" />

    <div className="space-y-0.5 text-[10px]">
      <div className="flex justify-between">
        <span className="text-foreground-500">Comprobante</span>
        <span className="font-semibold">Venta #{sale.number}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-foreground-500">Fecha</span>
        <span>{toDateTimeLabel(sale.date)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-foreground-500">Vendedor</span>
        <span>{sale.sellerName}</span>
      </div>
      {sale.confirmedByName ? (
        <div className="flex justify-between">
          <span className="text-foreground-500">Cajero</span>
          <span>{sale.confirmedByName}</span>
        </div>
      ) : null}
      <div className="flex justify-between">
        <span className="text-foreground-500">Tipo</span>
        <span className="font-semibold">
          {sale.channel === "retail" ? "MINORISTA" : "MAYORISTA"}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-foreground-500">Cliente</span>
        <span className="text-right">{sale.customer || "Consumidor final"}</span>
      </div>
    </div>

    <div className="my-3 border-t border-dashed border-foreground-300" />

    <div className="space-y-2">
      {sale.items.map((item) => (
        <div key={item.id}>
          <div className="flex justify-between gap-2">
            <span className="font-medium">
              {item.name}
              {item.kind === "combo" ? (
                <span className="text-foreground-500"> (combo)</span>
              ) : null}
            </span>
            <span className="tabular-nums font-medium">
              {toCurrency(item.subtotal)}
            </span>
          </div>
          <div className="flex justify-between gap-2 text-[10px] text-foreground-500">
            <span className="tabular-nums">
              {toNumber(item.quantity, item.unit === "kg" ? 3 : 0)}{" "}
              {item.unit === "kg" ? "kg" : "un"} x {toCurrency(item.unitPrice)}
            </span>
            {item.promotionLabel ? (
              <span className="text-right">{item.promotionLabel}</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>

    <div className="my-3 border-t border-dashed border-foreground-300" />

    <div className="flex justify-between text-[11px]">
      <span className="text-foreground-500">Subtotal</span>
      <span className="tabular-nums">{toCurrency(sale.subtotal)}</span>
    </div>
    <div className="mt-1 flex items-center justify-between">
      <span className="text-sm font-bold tracking-wide">TOTAL</span>
      <span className="text-base font-bold tabular-nums">
        {toCurrency(sale.total)}
      </span>
    </div>

    <div className="my-3 border-t border-dashed border-foreground-300" />

    <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-500 mb-1">
      Cobros
    </p>
    <div className="space-y-0.5 text-[10px]">
      {sale.payments.map((p) => (
        <div key={p.id} className="flex justify-between gap-2">
          <span>
            {p.methodName}
            <span className="text-foreground-400"> · {p.accountName}</span>
          </span>
          <span className="tabular-nums">{toCurrency(p.amount)}</span>
        </div>
      ))}
      {sale.cashReceived !== null ? (
        <div className="flex justify-between gap-2 pt-1">
          <span className="text-foreground-500">Efectivo recibido</span>
          <span className="tabular-nums">{toCurrency(sale.cashReceived)}</span>
        </div>
      ) : null}
      {sale.change !== null ? (
        <div className="flex justify-between gap-2 font-semibold">
          <span>Vuelto</span>
          <span className="tabular-nums">{toCurrency(sale.change)}</span>
        </div>
      ) : null}
    </div>

    <div className="my-3 border-t border-dashed border-foreground-300" />

    <div className="text-center text-[9px] text-foreground-500 space-y-0.5">
      <p>Documento no fiscal. No valido como factura.</p>
      <p>Comprobante electronico: No emitido / integracion futura.</p>
      <p className="pt-1 font-medium text-foreground-700">
        Gracias por su compra.
      </p>
    </div>
  </div>
);

export default ReceiptDocument;