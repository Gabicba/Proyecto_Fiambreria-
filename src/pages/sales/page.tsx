import { useMemo, useRef, useState } from "react";
import type { Channel, HeldSale, Payment, Sale } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Button from "@/components/base/Button";
import { useSaleCart } from "@/hooks/useSaleCart";
import { type CatalogResult } from "@/utils/search";
import { toCurrency, uid } from "@/utils/format";
import SearchPanel from "./components/SearchPanel";
import CartPanel from "./components/CartPanel";
import PaymentModal from "./components/PaymentModal";
import HeldSalesModal from "./components/HeldSalesModal";
import ReturnedSalesModal from "./components/ReturnedSalesModal";

const SalesPage = () => {
  const { currentUser, state, productMap, holdSale, removeHeldSale, sendToControl } =
    useApp();
  const { notify } = useToast();

  const defaultChannel: Channel =
    currentUser?.role === "vendedor-mayorista" ? "wholesale" : "retail";
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [customer, setCustomer] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [returnedOpen, setReturnedOpen] = useState(false);
  const [resubmitId, setResubmitId] = useState<string | null>(null);
  const [correctingSale, setCorrectingSale] = useState<Sale | null>(null);
  const [paymentSeed, setPaymentSeed] = useState<Payment[] | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    id: string;
    token: number;
  } | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const focusSearch = () => searchRef.current?.focus();

  const cart = useSaleCart(channel);

  const requestFocus = (id: string) =>
    setFocusRequest({ id, token: Date.now() });

  const handlePick = (result: CatalogResult) => {
    if (result.kind === "combo") {
      const combo = state.combos.find((c) => c.id === result.id);
      if (!combo) return;
      const id = cart.addCombo(combo, 1);
      requestFocus(id);
      return;
    }
    const product = productMap.get(result.id);
    if (!product) return;
    const id = cart.addProduct(product, 1);
    requestFocus(id);
  };

  // Cerrar el cobro (Escape, cruz o fondo) NUNCA borra el carrito:
  // solo se oculta la ventana de cobro y el foco vuelve al buscador
  // para poder seguir cargando productos por teclado.
  const handlePaymentClose = () => {
    setPaymentOpen(false);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  };

  const handleCharge = () => {
    if (cart.lines.length === 0) return;
    if (cart.hasZeroQuantity) {
      notify(
        "Hay un producto con cantidad 0",
        "error",
        "Corregi la cantidad o elimina el producto antes de enviar a caja."
      );
      return;
    }
    setPaymentOpen(true);
  };

  const confirmPayment = (result: {
    payments: Payment[];
    cashReceived: number | null;
  }) => {
    if (!currentUser) return;
    const wasResubmit = Boolean(resubmitId);
    const sale = sendToControl({
      channel,
      customer: customer.trim(),
      items: cart.toSaleItems(),
      payments: result.payments,
      seller: currentUser,
      cashReceived: result.cashReceived,
      resubmitId: resubmitId ?? undefined,
    });
    setPaymentOpen(false);
    cart.clear();
    setCustomer("");
    setResubmitId(null);
    setCorrectingSale(null);
    setPaymentSeed(null);
    notify(
      wasResubmit
        ? `Operacion #${sale.number} reenviada a Caja`
        : `Operacion #${sale.number} enviada a Caja`,
      "success",
      wasResubmit
        ? "La operación corregida vuelve a quedar pendiente de control."
        : `Total ${toCurrency(sale.total)} · queda pendiente de control. No se descuenta stock hasta confirmarla.`
    );
  };

  const handleHold = () => {
    if (!currentUser) return;
    const held: HeldSale = {
      id: uid("held"),
      createdAt: new Date().toISOString(),
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      channel,
      customer: customer.trim(),
      items: cart.toSaleItems(),
    };
    holdSale(held);
    cart.clear();
    setCustomer("");
    notify("Preventa guardada", "info", "No descuenta stock ni genera ingreso.");
  };

  const loadHeld = (held: HeldSale) => {
    cart.loadItems(held.items);
    setChannel(held.channel);
    setCustomer(held.customer);
    removeHeldSale(held.id);
    setHeldOpen(false);
    notify("Preventa recuperada", "info", "Podes continuar la venta.");
  };

  // Operaciones que Caja devolvio y este vendedor debe corregir (minorista o mayorista).
  const returnedSales = useMemo(
    () =>
      state.sales
        .filter(
          (s) => s.status === "rechazada" && s.sellerId === currentUser?.id
        )
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [state.sales, currentUser]
  );

  const handleCorrectReturned = (sale: Sale) => {
    cart.loadItems(sale.items);
    setChannel(sale.channel);
    setCustomer(sale.customer);
    setResubmitId(sale.id);
    setCorrectingSale(sale);
    setPaymentSeed(sale.payments);
    setReturnedOpen(false);
    notify(
      `Operacion #${sale.number} recuperada`,
      "info",
      sale.returnReason
        ? `Corregí: ${sale.returnReason}`
        : "Ajustá productos o cantidades y reenviala a Caja."
    );
  };

  const cancelCorrection = () => {
    cart.clear();
    setCustomer("");
    setResubmitId(null);
    setCorrectingSale(null);
    setPaymentSeed(null);
  };

  const channelInfo = useMemo(
    () =>
      channel === "retail"
        ? { label: "VENTA MINORISTA", price: "Precios y reglas minoristas" }
        : { label: "VENTA MAYORISTA", price: "Precios y reglas mayoristas" },
    [channel]
  );

  return (
    <div className="space-y-4">
      <div className="bg-background-50 rounded-lg border border-background-200 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary-100 text-primary-700 flex items-center justify-center">
            <i className="ri-shopping-cart-2-line text-xl" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground-950">
              CAJA DE VENTA
            </h2>
            <p className="text-xs text-foreground-500">
              {channelInfo.price} · vendedor: {currentUser?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center p-1 rounded-full bg-background-100">
          <button
            type="button"
            onClick={() => setChannel("retail")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              channel === "retail"
                ? "bg-primary-500 text-background-50"
                : "text-foreground-600 hover:text-foreground-900"
            }`}
          >
            VENTA MINORISTA
          </button>
          <button
            type="button"
            onClick={() => setChannel("wholesale")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              channel === "wholesale"
                ? "bg-accent-500 text-foreground-950"
                : "text-foreground-600 hover:text-foreground-900"
            }`}
          >
            VENTA MAYORISTA
          </button>
        </div>
      </div>

      {correctingSale ? (
        <div className="rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <i className="ri-edit-2-line text-warning text-xl mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground-950">
                Corrigiendo Operación #{correctingSale.number} · devuelta por Caja
              </p>
              <p className="text-xs text-foreground-600 mt-0.5">
                {correctingSale.returnReason ? (
                  <>
                    <strong>Motivo:</strong> {correctingSale.returnReason}
                  </>
                ) : (
                  "Ajustá productos o cantidades y reenviala a Caja."
                )}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon="ri-close-line"
            onClick={cancelCorrection}
          >
            Cancelar corrección
          </Button>
        </div>
      ) : returnedSales.length > 0 ? (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <i className="ri-arrow-go-back-line text-danger text-xl" />
            <div>
              <p className="text-sm font-semibold text-foreground-950">
                {returnedSales.length}{" "}
                {returnedSales.length === 1
                  ? "operación devuelta"
                  : "operaciones devueltas"}{" "}
                para corregir
              </p>
              <p className="text-xs text-foreground-600">
                Caja devolvió operaciones para que revises stock o productos.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon="ri-list-check-2"
            onClick={() => setReturnedOpen(true)}
          >
            Ver devoluciones
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <SearchPanel
          channel={channel}
          onPick={handlePick}
          inputRef={searchRef}
          onEmptySubmit={handleCharge}
        />
        <CartPanel
          lines={cart.lines}
          channel={channel}
          customer={customer}
          onCustomerChange={setCustomer}
          onSetQuantity={cart.setQuantity}
          onRemove={cart.removeLine}
          focusRequest={focusRequest}
          onFocusDone={() => setFocusRequest(null)}
          onQuantityEnter={focusSearch}
          subtotal={cart.subtotal}
          heldCount={state.heldSales.length}
          onHold={handleHold}
          onOpenHeld={() => setHeldOpen(true)}
          onClear={cancelCorrection}
          onCharge={handleCharge}
        />
      </div>

      <div className="text-xs text-foreground-400 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          <strong className="text-foreground-600">Teclado:</strong> buscar →
          Enter → cantidad → Enter → siguiente producto.
        </span>
        <span>
          <strong className="text-foreground-600">Kg:</strong> acepta 0.250 o
          0,250.
        </span>
        <span>
          <strong className="text-foreground-600">Enter con buscador vacio:</strong>{" "}
          abre el cobro.
        </span>
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={handlePaymentClose}
        total={cart.subtotal}
        channel={channel}
        onConfirm={confirmPayment}
        initialPayments={paymentSeed}
      />

      <ReturnedSalesModal
        open={returnedOpen}
        onClose={() => setReturnedOpen(false)}
        sales={returnedSales}
        onCorrect={handleCorrectReturned}
      />

      <HeldSalesModal
        open={heldOpen}
        onClose={() => setHeldOpen(false)}
        heldSales={state.heldSales}
        onLoad={loadHeld}
        onRemove={removeHeldSale}
      />
    </div>
  );
};

export default SalesPage;