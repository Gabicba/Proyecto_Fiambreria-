import { useApp } from "@/store/AppContext";
import Modal from "@/components/base/Modal";
import Button from "@/components/base/Button";
import Chip from "@/components/base/Chip";
import { periodicityLabel } from "@/utils/employees";
import { toCurrency, toDateTimeLabel } from "@/utils/format";

interface SalaryPaymentDetailModalProps {
  paymentId: string | null;
  onClose: () => void;
}

const SalaryPaymentDetailModal = ({
  paymentId,
  onClose,
}: SalaryPaymentDetailModalProps) => {
  const { state } = useApp();
  const payment = state.employeePayments.find((p) => p.id === paymentId) ?? null;
  if (!payment) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title="Detalle del pago de sueldo"
      subtitle={`${payment.employeeName} · ${toDateTimeLabel(payment.date)}`}
      footer={
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <Chip tone="accent" icon="ri-hand-coin-line">
          {periodicityLabel(payment.periodicity)}
        </Chip>
        <p className="text-xl font-bold tabular-nums text-foreground-950">
          {toCurrency(payment.netAmount)}
        </p>
      </div>

      <div className="rounded-md border border-background-200 bg-background-100/60 px-3 py-2 mb-4">
        <p className="text-xs text-foreground-500">Periodo liquidado</p>
        <p className="text-sm text-foreground-900">
          {payment.periodFrom} al {payment.periodTo}
        </p>
      </div>

      <dl className="divide-y divide-background-100 text-sm">
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Importe bruto</dt>
          <dd className="tabular-nums text-foreground-900">
            {toCurrency(payment.grossAmount)}
          </dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">
            Mercaderia retirada ({payment.discounts.length})
          </dt>
          <dd className="tabular-nums text-danger">
            −{toCurrency(payment.discountsTotal)}
          </dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">
            Adelantos aplicados ({(payment.advanceDiscounts ?? []).length})
          </dt>
          <dd className="tabular-nums text-danger">
            −{toCurrency(payment.advanceDiscountsTotal ?? 0)}
          </dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Descuentos totales</dt>
          <dd className="tabular-nums text-danger">
            −{toCurrency(
              (payment.discountsTotal ?? 0) + (payment.advanceDiscountsTotal ?? 0)
            )}
          </dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Neto pagado</dt>
          <dd className="tabular-nums font-semibold text-foreground-950">
            {toCurrency(payment.netAmount)}
          </dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Cuenta de origen</dt>
          <dd className="text-foreground-900">{payment.accountName}</dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Usuario responsable</dt>
          <dd className="text-foreground-900">{payment.userName}</dd>
        </div>
        <div className="flex justify-between py-2 gap-3">
          <dt className="text-foreground-500">Estado</dt>
          <dd>
            <Chip tone="success">Registrado</Chip>
          </dd>
        </div>
        {payment.note ? (
          <div className="flex justify-between py-2 gap-3">
            <dt className="text-foreground-500">Observacion</dt>
            <dd className="text-foreground-900 text-right">{payment.note}</dd>
          </div>
        ) : null}
      </dl>

      {payment.discounts.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-600 mb-2">
            Retiros descontados en este pago
          </p>
          <div className="rounded-md border border-background-200 divide-y divide-background-100">
            {payment.discounts.map((d) => {
              const withdrawal = state.employeeWithdrawals.find(
                (w) => w.id === d.withdrawalId
              );
              return (
                <div
                  key={d.withdrawalId}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground-900">
                      {toDateTimeLabel(d.date)}
                    </p>
                    <p className="text-[11px] text-foreground-400 truncate">
                      {withdrawal
                        ? withdrawal.items.map((i) => i.productName).join(", ")
                        : "Retiro de mercaderia"}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-foreground-800 whitespace-nowrap">
                    {toCurrency(d.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-foreground-500">
          Este pago no aplico descuentos por retiros de mercaderia.
        </p>
      )}

      {(payment.advanceDiscounts ?? []).length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-foreground-600 mb-2">
            Adelantos descontados en este pago
          </p>
          <div className="rounded-md border border-background-200 divide-y divide-background-100">
            {(payment.advanceDiscounts ?? []).map((d) => {
              const advance = state.employeeAdvances.find(
                (a) => a.id === d.advanceId
              );
              return (
                <div
                  key={d.advanceId}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground-900">
                      {toDateTimeLabel(d.date)}
                    </p>
                    <p className="text-[11px] text-foreground-400 truncate">
                      {advance
                        ? `${advance.accountName}${
                            advance.note ? ` · ${advance.note}` : ""
                          }`
                        : "Adelanto de sueldo"}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums text-foreground-800 whitespace-nowrap">
                    {toCurrency(d.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-foreground-500">
          Este pago no aplico descuentos por adelantos de sueldo.
        </p>
      )}
    </Modal>
  );
};

export default SalaryPaymentDetailModal;