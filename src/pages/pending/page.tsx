import { useLocation, useNavigate } from "react-router-dom";
import Button from "@/components/base/Button";

const titles: Record<string, { title: string; description: string }> = {
  "/proveedores": {
    title: "Proveedores",
    description:
      "Gestion completa de proveedores, cuentas corrientes y compras. Se desarrolla en una proxima etapa.",
  },
  "/tesoreria": {
    title: "Tesoreria",
    description:
      "Cuentas, movimientos de dinero y conciliacion. Se desarrolla en una proxima etapa.",
  },
  "/reportes": {
    title: "Reportes avanzados",
    description:
      "Reporteria avanzada del negocio. Se desarrolla en una proxima etapa.",
  },
  "/configuracion": {
    title: "Configuracion",
    description:
      "Usuarios, permisos, parametros generales y medios de pago. Se desarrolla en una proxima etapa.",
  },
  "/control-ventas": {
    title: "Control de ventas",
    description:
      "Auditoria y control definitivo de ventas. Se desarrolla en una proxima etapa.",
  },
};

const PendingPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const meta = titles[location.pathname] ?? {
    title: "Modulo",
    description: "Se desarrolla en una proxima etapa.",
  };

  return (
    <div className="rounded-lg border border-background-200 bg-background-50 p-10 flex flex-col items-center justify-center text-center min-h-[420px]">
      <span className="w-16 h-16 rounded-full bg-background-100 text-foreground-500 flex items-center justify-center">
        <i className="ri-tools-line text-3xl" />
      </span>
      <h2 className="mt-4 text-xl font-semibold text-foreground-950">
        {meta.title}
      </h2>
      <p className="mt-2 text-sm text-foreground-500 max-w-md">
        Modulo pendiente para proxima etapa.
      </p>
      <p className="mt-1 text-xs text-foreground-400 max-w-md">
        {meta.description}
      </p>
      <div className="mt-6 flex items-center gap-2">
        <Button icon="ri-shopping-cart-2-line" onClick={() => navigate("/ventas")}>
          Ir a Caja de venta
        </Button>
        <Button
          variant="outline"
          icon="ri-dashboard-3-line"
          onClick={() => navigate("/")}
        >
          Volver al Inicio
        </Button>
      </div>
    </div>
  );
};

export default PendingPage;