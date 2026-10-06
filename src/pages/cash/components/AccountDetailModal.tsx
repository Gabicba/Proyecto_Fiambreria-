import type { Account } from "@/types";
import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import {
  accountBalance,
  accountIncomeToday,
  accountLedger,
  accountOutflowToday,
  methodName,
} from "@/utils/accounts";
import { toCurrency, toTimeLabel } from "@/utils/format";

interface AccountDetailModalProps {
  open: boolean;
  onClose: () => void;
  account: Account | null;
  onOpenSale: (saleId: string) => void;
}

const AccountDetailModal = ({
  open,
  onClose,
  account,
  onOpenSale,
}: AccountDetailModalProps) => {
  const { state } = useApp();
  if (!account) return null;

  const balance = accountBalance(account, state.financeMovements);
  const incomeToday = accountIncomeToday(account.id, state.financeMovements);
  const outflowToday = accountOutflowToday(account.id, state.financeMovements);
  const ledger = accountLedger(account, state.financeMovements);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={account.name}
      subtitle={`${methodName(state.paymentMethods, account.methodId) || "Sin medio"} · ${
        account.typeLabel
      }`}
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md border border-background-200 bg-background-50 px-3 py-2">
          <p className="text-xs text-foreground-500">Saldo actual</p>
          <p className="text-2xl font-extrabold tabular-nums text-foreground-950">
            {toCurrency(balance)}
          </p>
        </div>
        <div className="rounded-md border border-background-200 bg-success-soft px-3 py-2">
          <p className="text-xs text-foreground-500">Ingresado hoy</p>
          <p className="text-2xl font-extrabold tabular-nums text-success">
            {toCurrency(incomeToday)}
          </p>
        </div>
        <div className="rounded-md border border-background-200 bg-danger-soft px-3 py-2">
          <p className="text-xs text-foreground-500">Reversiones de hoy</p>
          <p className="text-2xl font-extrabold tabular-nums text-danger">
            − {toCurrency(outflowToday)}
          </p>
        </div>
      </div>

      <h4 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-500">
        Movimientos
      </h4>
      <div className="overflow-x-auto border border-background-200 rounded-md">
        <table className="w-full text-sm min-w-[620px]">
          <thead>
            <tr className="text-left text-xs text-foreground-500 bg-background-100/60">
              <th className="py-2 px-3 font-medium">Hora</th>
              <th className="py-2 px-3 font-medium">Concepto</th>
              <th className="py-2 px-3 font-medium">Usuario</th>
              <th className="py-2 px-3 font-medium text-right">Importe</th>
              <th className="py-2 px-3 font-medium text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-background-100">
            {ledger.map((m) => {
              const sale = m.saleId
                ? state.sales.find((s) => s.id === m.saleId)
                : null;
              return (
                <tr
                  key={m.id}
                  className={sale ? "hover:bg-background-100/60 cursor-pointer" : ""}
                  onClick={() => {
                    if (sale) onOpenSale(sale.id);
                  }}
                >
                  <td className="py-2 px-3 text-foreground-600 tabular-nums">
                    {toTimeLabel(m.date)}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground-800">{m.origin}</span>
                      {m.kind === "anulacion" ? (
                        <Chip tone="danger">Reversión</Chip>
                      ) : m.kind === "venta" ? (
                        <Chip tone="success">Venta</Chip>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-foreground-600">
                    {m.userName}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-medium tabular-nums ${
                      m.type === "ingreso" ? "text-success" : "text-danger"
                    }`}
                  >
                    {m.type === "ingreso" ? "+" : "−"} {toCurrency(m.amount)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-foreground-700">
                    {toCurrency(m.balanceAfter)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ledger.length === 0 ? (
          <p className="py-10 text-center text-sm text-foreground-400">
            Esta cuenta todavía no tiene movimientos.
          </p>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-foreground-400 flex items-center gap-1.5">
        <i className="ri-information-line" />
        Tocá un movimiento de venta para abrir el detalle de esa venta.
      </p>
    </Modal>
  );
};

export default AccountDetailModal;