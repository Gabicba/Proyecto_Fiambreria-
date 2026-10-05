import { useMemo, useState } from "react";
import type { Account } from "@/types";
import { useApp } from "@/store/AppContext";
import { useToast } from "@/components/base/Toast";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import IconButton from "@/components/base/IconButton";
import AccountModal from "./components/AccountModal";
import { accountBalance, accountIncomeToday, methodName } from "@/utils/accounts";
import { toCurrency } from "@/utils/format";

const SettingsPage = () => {
  const { state, currentUser, saveAccount } = useApp();
  const { notify } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const accounts = useMemo(
    () => [...state.accounts].sort((a, b) => a.name.localeCompare(b.name)),
    [state.accounts]
  );

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setModalOpen(true);
  };

  const handleSaved = (account: Account) => {
    saveAccount(account, currentUser?.name ?? "Sistema");
    setModalOpen(false);
    setEditing(null);
    notify("Cuenta guardada", "success", account.name);
  };

  const toggleActive = (account: Account) => {
    saveAccount(
      { ...account, active: !account.active },
      currentUser?.name ?? "Sistema"
    );
    notify(
      account.active ? "Cuenta desactivada" : "Cuenta activada",
      "info",
      `${account.name} · no se elimina para conservar su historial.`
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-background-200 bg-background-50 p-4">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-md bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
            <i className="ri-shield-keyhole-line" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground-950">
              Cuentas de cobro y configuración
            </h3>
            <p className="text-xs text-foreground-600 mt-0.5 max-w-2xl">
              Las cuentas definen el destino/origen concreto del dinero. Cada
              cuenta pertenece a un medio de pago y se habilita para Minorista,
              Mayorista o ambos. Solo ADMIN puede crear, editar o desactivar
              cuentas.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-background-200 bg-background-50">
        <div className="px-4 py-3 border-b border-background-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-foreground-950">
              Cuentas de cobro ({accounts.length})
            </h3>
            <p className="text-xs text-foreground-500 mt-0.5">
              No se eliminan cuentas con historial: se desactivan para nuevas
              ventas.
            </p>
          </div>
          <Button
            icon="ri-add-line"
            onClick={openNew}
            disabled={!isAdmin}
            title={isAdmin ? "Nueva cuenta" : "Solo ADMIN puede crear cuentas"}
          >
            Nueva cuenta
          </Button>
        </div>

        <ul className="divide-y divide-background-100">
          {accounts.map((account) => {
            const balance = accountBalance(account, state.financeMovements);
            const income = accountIncomeToday(account.id, state.financeMovements);
            return (
              <li
                key={account.id}
                className="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3"
              >
                <div className="flex items-center gap-2.5 lg:w-64">
                  <span
                    className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                      account.active
                        ? "bg-secondary-100 text-secondary-900"
                        : "bg-background-100 text-foreground-400"
                    }`}
                  >
                    <i
                      className={
                        account.type === "efectivo"
                          ? "ri-money-dollar-circle-line"
                          : account.type === "banco"
                            ? "ri-bank-line"
                            : account.type === "billetera"
                              ? "ri-smartphone-line"
                              : account.type === "tarjeta"
                                ? "ri-bank-card-line"
                                : "ri-wallet-3-line"
                      }
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground-900 truncate">
                      {account.name}
                    </p>
                    <p className="text-xs text-foreground-500 truncate">
                      {methodName(state.paymentMethods, account.methodId) ||
                        "Sin medio"}{" "}
                      · {account.typeLabel}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 lg:flex-1">
                  <Chip tone={account.retail ? "primary" : "neutral"}>
                    {account.retail ? "Minorista ✓" : "Minorista —"}
                  </Chip>
                  <Chip tone={account.wholesale ? "accent" : "neutral"}>
                    {account.wholesale ? "Mayorista ✓" : "Mayorista —"}
                  </Chip>
                  <Chip tone={account.active ? "success" : "neutral"}>
                    {account.active ? "Activa" : "Inactiva"}
                  </Chip>
                  {account.note ? (
                    <span className="text-xs text-foreground-400 truncate max-w-[220px]">
                      {account.note}
                    </span>
                  ) : null}
                </div>

                <div className="lg:w-44 lg:text-right lg:shrink-0">
                  <p className="text-xs text-foreground-500">Saldo actual</p>
                  <p className="text-sm font-bold tabular-nums text-foreground-950">
                    {toCurrency(balance)}
                  </p>
                  <p className="text-[11px] text-foreground-400">
                    Ingresado hoy {toCurrency(income)}
                  </p>
                </div>

                <div className="flex items-center gap-1 lg:shrink-0">
                  <IconButton
                    icon={account.active ? "ri-toggle-fill" : "ri-toggle-line"}
                    label={
                      account.active
                        ? "Desactivar cuenta"
                        : "Activar cuenta"
                    }
                    onClick={() => toggleActive(account)}
                    disabled={!isAdmin}
                  />
                  <IconButton
                    icon="ri-edit-line"
                    label="Editar cuenta"
                    onClick={() => openEdit(account)}
                    disabled={!isAdmin}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-background-200 bg-background-50">
        <div className="px-4 py-3 border-b border-background-200">
          <h3 className="text-sm font-semibold text-foreground-950">
            Medios de pago ({state.paymentMethods.length})
          </h3>
          <p className="text-xs text-foreground-500 mt-0.5">
            Los medios son el cómo se cobra. Las cuentas se agrupan dentro de
            cada medio.
          </p>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {state.paymentMethods.map((m) => (
            <span
              key={m.id}
              className="px-3 py-1.5 rounded-full bg-background-100 text-sm text-foreground-700"
            >
              {m.name}
              <span className="text-foreground-400">
                {" "}
                · {state.accounts.filter((a) => a.methodId === m.id).length}{" "}
                cuentas
              </span>
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-background-300 bg-background-50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-warning-soft text-warning flex items-center justify-center shrink-0">
            <i className="ri-file-text-line" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground-950">
                Comprobantes electrónicos / Facturación electrónica
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning-soft text-warning font-bold tracking-wide">
                PRÓXIMAMENTE
              </span>
            </div>
            <p className="text-xs text-foreground-500 mt-0.5">
              Integración futura sujeta a validación con el cliente. El ticket
              actual es un comprobante interno sin validez fiscal.
            </p>
          </div>
          <Button
            variant="outline"
            icon="ri-lock-line"
            disabled
            title="Integración futura sujeta a validación con el cliente."
          >
            No disponible
          </Button>
        </div>
      </section>

      <AccountModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        account={editing}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default SettingsPage;