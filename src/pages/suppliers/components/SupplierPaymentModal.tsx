import { useEffect, useMemo, useState } from "react";
import type { PurchaseInvoice } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Select from "@/components/base/Select";
import NumberInput from "@/components/base/NumberInput";
import { invoiceBalance } from "@/utils/purchases";
import { accountBalance } from "@/utils/accounts";
import { round2, toCurrency } from "@/utils/format";

interface SupplierPaymentModalProps {
  open: boolean;
  invoice: PurchaseInvoice | null;
  onClose: () => void;
  onPaid?: () => void;
}

const toLocalInput = (date: Date): string =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const SupplierPaymentModal = ({
  open,
  invoice,
  onClose,
  onPaid,
}: SupplierPaymentModalProps) => {
  const { state, currentUser, registerSupplierPayment } = useApp();
  const { notify } = useToast();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(toLocalInput(new Date()));
  const [methodId, setMethodId] = useState("m1");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const balance = invoice ? invoiceBalance(invoice) : 0;

  useEffect(() => {
    if (!open || !invoice) return;
    setAmount(invoiceBalance(invoice));
    setDate(toLocalInput(new Date()));
    setMethodId("m1");
    setAccountId("");
    setNote("");
    setError("");
  }, [open, invoice]);

  const methodAccounts = useMemo(
    () =>
      state.accounts.filter(
        (a) => a.active && (methodId ? a.methodId === methodId : true)
      ),
    [state.accounts, methodId]
  );

  useEffect(() => {
    if (!open) return;
    if (methodAccounts.length === 1) {
      setAccountId(methodAccounts[0].id);
    } else if (!methodAccounts.some((a) => a.id === accountId)) {
      setAccountId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodId, open, methodAccounts.length]);

  const selectedAccount = state.accounts.find((a) => a.id === accountId);
  const available = selectedAccount
    ? accountBalance(selectedAccount, state.financeMovements)
    : 0;

  const submit = () => {
    if (!invoice || !currentUser) return;
    if (!accountId) {
      setError("Selecciona la cuenta de origen del pago.");
      return;
    }
    if (!date) {
      setError("Indica la fecha y hora del pago.");
      return;
    }
    if (amount > balance + 0.01) {
      setError(`El pago no puede superar el saldo pendiente (${toCurrency(balance)}).`);
      return;
    }
    const result = registerSupplierPayment({
      invoiceId: invoice.id,
      amount: round2(amount),
      methodId,
      accountId,
      note,
      date: new Date(date).toISOString(),
      user: currentUser,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    notify(
      "Pago registrado",
      "success",
      `${invoice.supplierName} · ${toCurrency(amount)} desde ${selectedAccount?.name}`
    );
    onPaid?.();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pago a proveedor"
      subtitle={
        invoice
          ? `${invoice.supplierName} · ${invoice.receiptType} ${invoice.receiptNumber}`
          : ""
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="ri-hand-coin-line" onClick={submit} disabled={balance <= 0}>
            Confirmar pago
          </Button>
        </>
      }
    >
      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          <i className="ri-error-warning-line" /> {error}
        </div>
      ) : null}

      <div className="rounded-md border border-background-200 bg-background-100 p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-foreground-500">Total factura</p>
          <p className="text-sm font-semibold tabular-nums text-foreground-950">
            {toCurrency(invoice?.total ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-foreground-500">Ya pagado</p>
          <p className="text-sm font-semibold tabular-nums text-success">
            {toCurrency(invoice?.paidAmount ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-foreground-500">Saldo pendiente</p>
          <p className="text-sm font-bold tabular-nums text-danger">
            {toCurrency(balance)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Importe a pagar *
          </label>
          <NumberInput value={amount} onChange={setAmount} suffix="$" autoFocus />
          <button
            type="button"
            onClick={() => setAmount(balance)}
            className="mt-1 text-xs text-primary-700 hover:underline cursor-pointer"
          >
            Pagar todo el saldo
          </button>
        </div>
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
            Medio de pago
          </label>
          <Select
            value={methodId}
            onChange={setMethodId}
            options={state.paymentMethods
              .filter((m) => m.active)
              .map((m) => ({ value: m.id, label: m.name }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Cuenta de origen *
          </label>
          <Select
            value={accountId}
            onChange={setAccountId}
            placeholder="Seleccionar cuenta"
            options={methodAccounts.map((a) => ({
              value: a.id,
              label: a.name,
              hint: toCurrency(accountBalance(a, state.financeMovements)),
            }))}
          />
          {methodAccounts.length === 0 ? (
            <p className="mt-1 text-xs text-warning">
              No hay cuentas activas para este medio.
            </p>
          ) : null}
          {selectedAccount ? (
            <p className="mt-1 text-xs text-foreground-400">
              Saldo disponible: {toCurrency(available)}
            </p>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-foreground-600 mb-1">
            Observacion (opcional)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={160}
            placeholder="Ej: pago parcial acordado con el proveedor"
            className="w-full h-9 px-3 rounded-md border border-background-300 bg-background-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-foreground-500 flex items-start gap-1.5">
        <i className="ri-information-line mt-0.5" />
        El pago descuenta el saldo de la cuenta elegida y actualiza el saldo de la
        factura. No se permiten pagos superiores a la deuda.
      </p>
    </Modal>
  );
};

export default SupplierPaymentModal;