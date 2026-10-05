import { useEffect, useMemo, useRef, useState } from "react";
import type { Channel, Payment } from "@/types";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import NumberInput from "@/components/base/NumberInput";
import Select from "@/components/base/Select";
import { useApp } from "@/store/AppContext";
import { accountsForMethod } from "@/utils/accounts";
import { round2, toCurrency, uid } from "@/utils/format";

interface PaymentRow {
  id: string;
  methodId: string;
  accountId: string;
  amount: number;
  received: number;
}

interface PaymentResult {
  payments: Payment[];
  cashReceived: number | null;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  channel: Channel;
  onConfirm: (result: PaymentResult) => void;
  // Si viene, precarga los cobros de una operacion devuelta que se esta corrigiendo.
  initialPayments?: Payment[] | null;
}

type FocusField = {
  rowId: string;
  field: "method" | "account" | "amount" | "received";
} | null;

const PaymentModal = ({
  open,
  onClose,
  total,
  channel,
  onConfirm,
  initialPayments,
}: PaymentModalProps) => {
  const { state, accountMap, paymentMethodMap } = useApp();

  const methodOptions = useMemo(
    () =>
      state.paymentMethods
        .filter((m) => m.active)
        .map((m) => ({ value: m.id, label: m.name })),
    [state.paymentMethods]
  );

  // Medio por defecto: el primero con al menos una cuenta habilitada para el canal.
  const defaultMethodId = useMemo(() => {
    const found = state.paymentMethods
      .filter((m) => m.active)
      .find((m) => accountsForMethod(state.accounts, m.id, channel).length > 0);
    return found?.id ?? "";
  }, [state.paymentMethods, state.accounts, channel]);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [focusField, setFocusField] = useState<FocusField>(null);
  const [distWarning, setDistWarning] = useState(false);

  const methodRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const accountRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const amountRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const receivedRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const accountLabelFor = (methodId: string, accountId: string): string => {
    const valid = accountsForMethod(state.accounts, methodId, channel);
    return valid.find((a) => a.id === accountId)?.name ?? "";
  };

  const isCashRow = (row: PaymentRow): boolean =>
    accountMap.get(row.accountId)?.type === "efectivo";

  // Inicializa las filas al abrir, SIEMPRE contra el TOTAL ACTUAL.
  useEffect(() => {
    if (!open) return;
    let nextRows: PaymentRow[];
    let warning = false;
    if (initialPayments && initialPayments.length > 0) {
      const sumInit = round2(initialPayments.reduce((a, p) => a + p.amount, 0));
      if (initialPayments.length === 1) {
        const p = initialPayments[0];
        const methodId = p.methodId || defaultMethodId;
        const valid = accountsForMethod(state.accounts, methodId, channel);
        const accountId = valid.some((a) => a.id === p.accountId)
          ? p.accountId
          : valid.length === 1
            ? valid[0].id
            : "";
        nextRows = [
          {
            id: uid("row"),
            methodId,
            accountId,
            amount: total,
            received: p.received ?? 0,
          },
        ];
      } else {
        nextRows = initialPayments.map((p) => {
          const methodId = p.methodId || defaultMethodId;
          const valid = accountsForMethod(state.accounts, methodId, channel);
          const accountId = valid.some((a) => a.id === p.accountId)
            ? p.accountId
            : valid.length === 1
              ? valid[0].id
              : "";
          return {
            id: uid("row"),
            methodId,
            accountId,
            amount: p.amount,
            received: p.received ?? 0,
          };
        });
        warning = Math.abs(sumInit - total) > 0.01;
      }
    } else {
      const valid = accountsForMethod(state.accounts, defaultMethodId, channel);
      nextRows = [
        {
          id: uid("row"),
          methodId: defaultMethodId,
          accountId: valid.length >= 1 ? valid[0].id : "",
          amount: total,
          received: 0,
        },
      ];
    }
    setRows(nextRows);
    setDistWarning(warning);
    setFocusField({ rowId: nextRows[0].id, field: "method" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, total, initialPayments, defaultMethodId, channel]);

  // Foco programatico (medio / cuenta / importe / paga con) sin obligar al mouse.
  useEffect(() => {
    if (!focusField) return;
    const { rowId, field } = focusField;
    const map =
      field === "method"
        ? methodRefs.current
        : field === "account"
          ? accountRefs.current
          : field === "amount"
            ? amountRefs.current
            : receivedRefs.current;
    const node = map.get(rowId);
    const el = node?.querySelector(
      field === "amount" || field === "received" ? "input" : "button"
    ) as HTMLElement | null;
    if (el) {
      el.focus();
      if (field === "amount" || field === "received") {
        (el as HTMLInputElement).select?.();
      }
    }
    setFocusField(null);
  }, [focusField, rows]);

  const sum = round2(
    rows.reduce((a, r) => a + (Number.isFinite(r.amount) ? r.amount : 0), 0)
  );
  const remaining = round2(total - sum);
  const allHaveAccount = rows.every((r) => r.accountId && r.methodId);
  const valid = Math.abs(remaining) < 0.01 && sum > 0 && allHaveAccount;

  const updateRow = (id: string, patch: Partial<PaymentRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleMethodChange = (rowId: string, methodId: string) => {
    const validAccounts = accountsForMethod(state.accounts, methodId, channel);
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const othersSum = round2(
          prev.filter((x) => x.id !== rowId).reduce((a, x) => a + x.amount, 0)
        );
        const suggested =
          prev.length === 1 ? total : Math.max(0, round2(total - othersSum));
        const accountId =
          validAccounts.length === 1
            ? validAccounts[0].id
            : validAccounts.some((a) => a.id === r.accountId)
              ? r.accountId
              : "";
        return { ...r, methodId, accountId, amount: suggested };
      })
    );
    setDistWarning(false);
    setFocusField({
      rowId,
      field: validAccounts.length > 1 ? "account" : "amount",
    });
  };

  const handleAccountChange = (rowId: string, accountId: string) => {
    updateRow(rowId, { accountId });
    setFocusField({ rowId, field: "amount" });
  };

  const handleAmountChange = (rowId: string, amount: number) => {
    updateRow(rowId, { amount });
    setDistWarning(false);
  };

  const addRow = () => {
    const othersSum = round2(rows.reduce((a, r) => a + r.amount, 0));
    const suggested = Math.max(0, round2(total - othersSum));
    const id = uid("row");
    const validAccounts = accountsForMethod(state.accounts, defaultMethodId, channel);
    setRows((prev) => [
      ...prev,
      {
        id,
        methodId: defaultMethodId,
        accountId: validAccounts.length >= 1 ? validAccounts[0].id : "",
        amount: suggested,
        received: 0,
      },
    ]);
    setDistWarning(false);
    setFocusField({ rowId: id, field: "method" });
  };

  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const buildResult = (source: PaymentRow[]): PaymentResult => {
    const payments: Payment[] = source
      .filter((r) => r.amount > 0 && r.methodId && r.accountId)
      .map((r) => {
        const method = paymentMethodMap.get(r.methodId);
        const account = accountMap.get(r.accountId);
        const cash = account?.type === "efectivo";
        return {
          id: uid("pay"),
          methodId: r.methodId,
          methodName: method?.name ?? "Metodo",
          accountId: account?.id ?? "",
          accountName: account?.name ?? "Sin cuenta",
          amount: round2(r.amount),
          received: cash && r.received > 0 ? round2(r.received) : null,
        };
      });
    const cashReceived = round2(
      source.reduce(
        (a, r) =>
          a +
          (accountMap.get(r.accountId)?.type === "efectivo" && r.received > 0
            ? r.received
            : 0),
        0
      )
    );
    return {
      payments,
      cashReceived: cashReceived > 0 ? cashReceived : null,
    };
  };

  const doConfirm = (source: PaymentRow[]) => {
    const result = buildResult(source);
    if (result.payments.length === 0) return;
    const s = round2(source.reduce((a, r) => a + r.amount, 0));
    if (Math.abs(s - total) > 0.01) return;
    if (!source.every((r) => r.accountId && r.methodId)) return;
    onConfirm(result);
  };

  // Enter sobre el importe: valida con el valor recien escrito (sin esperar al estado).
  const confirmFromAmount = (rowId: string, amountValue: number) => {
    const effective = rows.map((r) =>
      r.id === rowId ? { ...r, amount: amountValue } : r
    );
    setRows(effective);
    doConfirm(effective);
  };

  const multiRow = rows.length > 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Informar cobro y enviar a Caja"
      subtitle={`Acepta pago simple o mixto · ${
        channel === "retail" ? "Venta minorista" : "Venta mayorista"
      }. La venta queda pendiente hasta que Caja/ADMIN la confirma.`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            icon="ri-send-plane-line"
            disabled={!valid}
            onClick={() => doConfirm(rows)}
          >
            Enviar a Caja · {toCurrency(sum)}
          </Button>
        </>
      }
    >
      <div className="rounded-md border border-foreground-200 bg-foreground-950 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground-300">
          TOTAL A COBRAR
        </span>
        <span className="text-3xl font-extrabold text-background-50 tabular-nums leading-none">
          {toCurrency(total)}
        </span>
      </div>

      {distWarning ? (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm text-warning">
          <i className="ri-alert-line mt-0.5" />
          <span>
            Revisá los medios de pago: el total de la venta cambió. Confirmá o
            corregí la distribución antes de reenviar a Caja.
          </span>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const cash = isCashRow(row);
          const change =
            cash && row.received > 0 ? round2(row.received - row.amount) : null;
          const accountOptions = accountsForMethod(
            state.accounts,
            row.methodId,
            channel
          ).map((a) => ({ value: a.id, label: a.name, hint: a.typeLabel }));
          return (
            <div key={row.id} className="rounded-md border border-background-200 p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Medio de pago
                  </label>
                  <div
                    ref={(el) => {
                      methodRefs.current.set(row.id, el);
                    }}
                  >
                    <Select
                      value={row.methodId}
                      onChange={(v) => handleMethodChange(row.id, v)}
                      options={methodOptions}
                      placeholder="Seleccionar"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Cuenta {accountOptions.length > 1 ? "*" : ""}
                  </label>
                  <div
                    ref={(el) => {
                      accountRefs.current.set(row.id, el);
                    }}
                  >
                    <Select
                      value={row.accountId}
                      onChange={(v) => handleAccountChange(row.id, v)}
                      options={accountOptions}
                      placeholder={
                        accountOptions.length === 0
                          ? "Sin cuentas disponibles"
                          : "Seleccionar"
                      }
                      disabled={accountOptions.length === 0}
                    />
                  </div>
                </div>
                <div className="w-full sm:w-36">
                  <label className="block text-xs font-medium text-foreground-600 mb-1">
                    Importe
                  </label>
                  <div
                    ref={(el) => {
                      amountRefs.current.set(row.id, el);
                    }}
                  >
                    <NumberInput
                      value={row.amount}
                      onChange={(v) => handleAmountChange(row.id, v)}
                      onEnter={(v) => confirmFromAmount(row.id, v)}
                      suffix="$"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={!multiRow}
                    className="w-9 h-9 flex items-center justify-center rounded-md border border-background-300 text-foreground-500 hover:bg-danger-soft hover:text-danger cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Quitar cobro"
                  >
                    <i className="ri-subtract-line" />
                  </button>
                </div>
              </div>

              {row.methodId && accountOptions.length === 0 ? (
                <p className="mt-2 text-xs text-danger flex items-center gap-1.5">
                  <i className="ri-error-warning-line" />
                  Este medio no tiene cuentas habilitadas para{" "}
                  {channel === "retail" ? "minorista" : "mayorista"}.
                </p>
              ) : row.methodId && accountOptions.length === 1 ? (
                <p className="mt-2 text-xs text-foreground-400 flex items-center gap-1.5">
                  <i className="ri-checkbox-circle-line" />
                  Cuenta asignada automáticamente:{" "}
                  {accountLabelFor(row.methodId, row.accountId)}
                </p>
              ) : null}

              {cash ? (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-end gap-3 rounded-md bg-background-100 px-3 py-2">
                  <div className="w-full sm:w-44">
                    <label className="block text-xs font-medium text-foreground-600 mb-1">
                      El cliente paga con (opcional)
                    </label>
                    <div
                      ref={(el) => {
                        receivedRefs.current.set(row.id, el);
                      }}
                    >
                      <NumberInput
                        value={row.received}
                        onChange={(v) => updateRow(row.id, { received: v })}
                        onEnter={() => doConfirm(rows)}
                        suffix="$"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    {change === null ? (
                      <span className="text-xs text-foreground-400">
                        Caja podrá verificar el efectivo recibido.
                      </span>
                    ) : change < 0 ? (
                      <div>
                        <p className="text-xs text-foreground-500">VUELTO</p>
                        <p className="text-xl font-extrabold text-danger tabular-nums">
                          Falta {toCurrency(Math.abs(change))}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-foreground-500">VUELTO</p>
                        <p className="text-2xl font-extrabold text-success tabular-nums">
                          {toCurrency(change)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <Button variant="outline" size="sm" icon="ri-add-line" onClick={addRow}>
          Agregar otro cobro
        </Button>
        {remaining > 0.01 ? (
          <span className="text-sm text-warning">
            Falta cobrar {toCurrency(remaining)}
          </span>
        ) : remaining < -0.01 ? (
          <span className="text-sm text-danger">
            El cobro supera el total en {toCurrency(Math.abs(remaining))}
          </span>
        ) : (
          <span className="text-sm text-success inline-flex items-center gap-1">
            <i className="ri-checkbox-circle-line" /> Cobro completo
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-background-200 bg-background-50 px-3 py-2">
        <div>
          <p className="text-[11px] text-foreground-500">Cobrado</p>
          <p className="text-base font-bold tabular-nums text-foreground-900">
            {toCurrency(sum)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-foreground-500">Falta cobrar</p>
          <p
            className={`text-base font-bold tabular-nums ${
              remaining > 0.01 ? "text-warning" : "text-foreground-900"
            }`}
          >
            {toCurrency(Math.max(0, remaining))}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-foreground-500">Total</p>
          <p className="text-base font-bold tabular-nums text-foreground-950">
            {toCurrency(total)}
          </p>
        </div>
      </div>

      <p className="mt-2 text-xs text-foreground-400 flex items-start gap-1.5">
        <i className="ri-keyboard-line mt-0.5" />
        Por teclado: Enter abre el medio, flechas navegan y Enter elige; después
        elegís la cuenta y el importe se carga solo con el total. Enter sobre el
        importe envía a Caja cuando el cobro está completo.
      </p>
    </Modal>
  );
};

export default PaymentModal;