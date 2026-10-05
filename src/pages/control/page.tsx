import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Sale } from "@/types";
import { useApp, findTodaySales } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Chip from "@/components/base/Chip";
import Button from "@/components/base/Button";
import ReceiptModal from "@/components/feature/ReceiptModal";
import AnnulSaleModal from "@/components/feature/AnnulSaleModal";
import ControlDetailModal from "./components/ControlDetailModal";
import { saleStatusLabel, saleStatusTone } from "@/utils/sales";
import { round2, toCurrency, toDateKey, toTimeLabel } from "@/utils/format";

type Tab = "pendientes" | "devueltas" | "finalizadas";

const itemSummary = (sale: Sale): string => {
  const names = sale.items.slice(0, 2).map((i) => i.name);
  const extra = sale.items.length - names.length;
  return `${names.join(", ")}${extra > 0 ? ` +${extra}` : ""}`;
};

const ControlVentasPage = () => {
  const { state, currentUser, confirmSale, returnSale, cancelSale, annulSale } =
    useApp();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("pendientes");
  const [selected, setSelected] = useState<Sale | null>(null);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [annulTarget, setAnnulTarget] = useState<Sale | null>(null);

  const pendientes = useMemo(
    () =>
      state.sales
        .filter((s) => s.status === "pendiente")
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [state.sales]
  );
  const devueltas = useMemo(
    () =>
      state.sales
        .filter((s) => s.status === "rechazada")
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [state.sales]
  );
  const finalizadas = useMemo(() => findTodaySales(state.sales), [state.sales]);

  const list = useMemo(() => {
    if (tab === "pendientes") return pendientes;
    if (tab === "devueltas") return devueltas;
    return finalizadas;
  }, [tab, pendientes, devueltas, finalizadas]);

  const pendingTotal = round2(pendientes.reduce((a, s) => a + s.total, 0));

  const hasSession = state.cashSessions.some(
    (c) => c.dateKey === toDateKey(new Date())
  );

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pendientes", label: "Pendientes de control", count: pendientes.length },
    { id: "devueltas", label: "Devueltas", count: devueltas.length },
    { id: "finalizadas", label: "Finalizadas hoy", count: finalizadas.length },
  ];

  const handleConfirm = (args: {
    cashReceived: number | null;
    transferVerified: boolean;
  }) => {
    if (!selected || !currentUser) return;
    const result = confirmSale(selected.id, {
      verifier: currentUser,
      cashReceived: args.cashReceived,
      transferVerified: args.transferVerified,
    });
    setSelected(null);
    if (result) {
      setReceiptSale(result);
      notify(
        `Venta #${result.number} finalizada`,
        "success",
        "Stock descontado y cobro registrado en Caja del día."
      );
    } else {
      notify(
        `La venta ya fue finalizada`,
        "info",
        "No se generaron impactos duplicados."
      );
    }
  };

  const handleReturn = (reason: string) => {
    if (!selected || !currentUser) return;
    returnSale(selected.id, reason, currentUser);
    setSelected(null);
    notify(
      `Operación #${selected.number} devuelta`,
      "info",
      "El vendedor deberá corregirla."
    );
  };

  const handleCancel = (reason: string) => {
    if (!selected || !currentUser) return;
    cancelSale(selected.id, reason, currentUser);
    setSelected(null);
    notify(`Operación #${selected.number} cancelada`, "info", reason);
  };

  const handleAnnul = (reason: string) => {
    if (!annulTarget || !currentUser) return;
    const targetNumber = annulTarget.number;
    const result = annulSale(annulTarget.id, reason, currentUser);
    setAnnulTarget(null);
    if (result) {
      notify(
        `Venta #${targetNumber} anulada`,
        "info",
        "Se revirtieron el dinero y el stock en una sola operación."
      );
    } else {
      notify(
        `La venta #${targetNumber} ya estaba anulada`,
        "info",
        "No se generaron impactos duplicados."
      );
    }
  };

  return (
    <div className="space-y-4">
      {!hasSession ? (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 flex items-center gap-3 flex-wrap">
          <i className="ri-lock-line text-warning text-lg" />
          <span className="text-sm text-foreground-700 flex-1">
            La Caja del día todavía no está abierta. Podés abrirla desde Caja del
            día para registrar el efectivo inicial del turno.
          </span>
          <Button
            size="sm"
            variant="outline"
            icon="ri-arrow-right-line"
            onClick={() => navigate("/caja")}
          >
            Ir a Caja del día
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Pendientes de control</p>
          <p className="text-2xl font-semibold text-foreground-950">
            {pendientes.length}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4">
          <p className="text-xs text-foreground-500">Importe pendiente</p>
          <p className="text-2xl font-semibold text-foreground-950 tabular-nums">
            {toCurrency(pendingTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-background-200 bg-background-50 p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-foreground-500">Finalizadas hoy</p>
          <p className="text-2xl font-semibold text-success">
            {finalizadas.length}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-background-200 bg-background-50">
        <div className="p-4 border-b border-background-200 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center p-1 rounded-full bg-background-100 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  tab === t.id
                    ? "bg-primary-500 text-background-50"
                    : "text-foreground-600 hover:text-foreground-900"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          {tab === "pendientes" && pendientes.length > 0 ? (
            <span className="lg:ml-auto inline-flex items-center gap-2 text-xs text-warning bg-warning-soft border border-warning/30 px-3 py-1.5 rounded-full whitespace-nowrap">
              <i className="ri-time-line" />
              Hay operaciones esperando confirmación
            </span>
          ) : null}
        </div>

        <ul className="divide-y divide-background-100">
          {list.map((sale) => {
            const isPending = sale.status === "pendiente";
            return (
              <li
                key={sale.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (tab === "finalizadas") setReceiptSale(sale);
                  else setSelected(sale);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (tab === "finalizadas") setReceiptSale(sale);
                    else setSelected(sale);
                  }
                }}
                className={`px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3 cursor-pointer transition-colors hover:bg-background-100/60 ${
                  isPending ? "border-l-4 border-l-warning" : "border-l-4 border-l-transparent"
                }`}
              >
                <div className="flex items-center gap-2 lg:w-44">
                  <span className="text-base font-semibold text-foreground-950 tabular-nums">
                    #{sale.number}
                  </span>
                  <Chip tone={saleStatusTone(sale.status)}>
                    {saleStatusLabel(sale.status)}
                  </Chip>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-foreground-800 flex items-center gap-1">
                      <i className="ri-user-line text-foreground-400" />
                      {sale.sellerName}
                    </span>
                    <Chip tone={sale.channel === "retail" ? "primary" : "accent"}>
                      {sale.channel === "retail" ? "Minorista" : "Mayorista"}
                    </Chip>
                    <span className="text-xs text-foreground-400 tabular-nums flex items-center gap-1">
                      <i className="ri-time-line" />
                      {toTimeLabel(sale.sentAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground-500 truncate">
                    {sale.customer || "Consumidor final"} · {sale.items.length}{" "}
                    {sale.items.length === 1 ? "producto" : "productos"} ·{" "}
                    {itemSummary(sale)}
                  </p>
                  {sale.status === "rechazada" && sale.returnReason ? (
                    <p className="mt-1 text-xs text-danger flex items-center gap-1">
                      <i className="ri-error-warning-line" />
                      {sale.returnReason}
                    </p>
                  ) : null}
                </div>

                <div className="lg:w-48 lg:shrink-0">
                  <p className="text-xs text-foreground-500">Cómo paga</p>
                  <p className="text-sm text-foreground-700 truncate">
                    {sale.payments
                      .map((p) => `${p.methodName} · ${p.accountName}`)
                      .join(" + ")}
                  </p>
                </div>

                <div className="lg:w-28 lg:text-right lg:shrink-0">
                  <p className="text-lg font-bold tabular-nums text-foreground-950">
                    {toCurrency(sale.total)}
                  </p>
                </div>

                <div className="lg:shrink-0">
                  {isPending ? (
                    <Button
                      size="sm"
                      icon="ri-check-double-line"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(sale);
                      }}
                    >
                      Controlar
                    </Button>
                  ) : tab === "finalizadas" ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        icon="ri-printer-line"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptSale(sale);
                        }}
                      >
                        Ticket
                      </Button>
                      {currentUser?.role === "admin" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon="ri-arrow-go-back-line"
                          className="text-danger"
                          title="Anular venta confirmada"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnnulTarget(sale);
                          }}
                        >
                          Anular
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-foreground-400 whitespace-nowrap">
                      Esperando corrección
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {list.length === 0 ? (
          <div className="py-16 text-center text-foreground-400">
            <i className="ri-inbox-archive-line text-5xl" />
            <p className="mt-3 text-sm">
              {tab === "pendientes"
                ? "No hay operaciones pendientes de control."
                : tab === "devueltas"
                  ? "No hay operaciones devueltas."
                  : "Todavía no se finalizaron ventas hoy."}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-start gap-2 text-xs text-foreground-400">
        <i className="ri-information-line mt-0.5" />
        <span>
          El vendedor envía la operación y recién acá se confirma: al finalizar se
          descuenta el stock, se registra el cobro en su cuenta y aparece en Caja
          del día. Toda la confirmación se hace dentro del detalle para evitar
          finalizar una venta por un Enter accidental.
        </span>
      </div>

      <ControlDetailModal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        sale={selected}
        onConfirm={handleConfirm}
        onReturn={handleReturn}
        onCancel={handleCancel}
      />

      <ReceiptModal
        open={Boolean(receiptSale)}
        onClose={() => setReceiptSale(null)}
        sale={receiptSale}
      />

      <AnnulSaleModal
        open={Boolean(annulTarget)}
        onClose={() => setAnnulTarget(null)}
        sale={annulTarget}
        onConfirm={handleAnnul}
      />
    </div>
  );
};

export default ControlVentasPage;