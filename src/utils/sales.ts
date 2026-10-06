import type { Account, Payment, Sale, SaleStatus } from "@/types";
import { round2 } from "@/utils/format";

export const sumPayments = (payments: Payment[]): number =>
  round2(payments.reduce((acc, p) => acc + (Number.isFinite(p.amount) ? p.amount : 0), 0));

/**
 * Suma unicamente los cobros que impactan en una cuenta de tipo efectivo.
 * El vuelto se calcula solo sobre la porcion efectiva de la venta.
 */
export const cashPortionOf = (
  payments: Payment[],
  accounts: Account[]
): number => {
  const cashAccountIds = new Set(
    accounts.filter((a) => a.type === "efectivo").map((a) => a.id)
  );
  return round2(
    payments.reduce(
      (acc, p) => acc + (cashAccountIds.has(p.accountId) ? p.amount : 0),
      0
    )
  );
};

export const changeFor = (received: number, cashPortion: number): number =>
  round2(received - cashPortion);

export const saleStatusLabel = (status: SaleStatus): string => {
  switch (status) {
    case "pendiente":
      return "Pendiente de control";
    case "finalizada":
      return "Confirmada";
    case "rechazada":
      return "Devuelta a vendedor";
    case "anulada":
      return "Anulada";
    case "cancelada":
      return "Cancelada";
    default:
      return status;
  }
};

export const saleStatusTone = (
  status: SaleStatus
): "warning" | "success" | "danger" | "neutral" => {
  switch (status) {
    case "pendiente":
      return "warning";
    case "finalizada":
      return "success";
    case "rechazada":
      return "danger";
    case "anulada":
      return "danger";
    default:
      return "neutral";
  }
};

export const pendingSales = (sales: Sale[]): Sale[] =>
  sales.filter((s) => s.status === "pendiente");