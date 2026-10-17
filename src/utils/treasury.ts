import type { FinanceMovement } from "@/types";

export const movementKindLabel = (movement: FinanceMovement): string => {
  switch (movement.kind) {
    case "venta":
      return "Venta";
    case "pago-proveedor":
      return "Pago a proveedor";
    case "transferencia":
      return "Transferencia interna";
    case "ingreso":
      return "Ingreso de dinero";
    case "anulacion":
      return "Anulacion de venta";
    case "compra":
      return "Compra";
    case "pago-sueldo":
      return "Pago de sueldo";
    case "adelanto-sueldo":
      return "Adelanto de sueldo";
    case "otro":
      return "Ajuste";
    default:
      return movement.type === "ingreso" ? "Ingreso" : "Egreso";
  }
};

export type MovementTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "primary"
  | "accent"
  | "secondary";

export const movementKindTone = (movement: FinanceMovement): MovementTone => {
  if (movement.kind === "transferencia") return "secondary";
  if (movement.kind === "pago-proveedor") return "warning";
  if (movement.kind === "pago-sueldo") return "accent";
  if (movement.kind === "adelanto-sueldo") return "accent";
  if (movement.kind === "ingreso") return "primary";
  if (movement.type === "ingreso") return "success";
  return "danger";
};

export const movementKindOptions = [
  { value: "all", label: "Todos los tipos" },
  { value: "ingreso", label: "Ingresos de dinero" },
  { value: "egreso", label: "Egresos" },
  { value: "transferencia", label: "Transferencias internas" },
  { value: "venta", label: "Ventas" },
  { value: "pago-proveedor", label: "Pagos a proveedores" },
  { value: "pago-sueldo", label: "Pagos de sueldo" },
  { value: "adelanto-sueldo", label: "Adelantos de sueldo" },
  { value: "anulacion", label: "Anulaciones" },
];

export const movementMatchesFilter = (
  movement: FinanceMovement,
  filter: string
): boolean => {
  if (filter === "all") return true;
  if (filter === "ingreso" || filter === "egreso") return movement.type === filter;
  return movement.kind === filter;
};