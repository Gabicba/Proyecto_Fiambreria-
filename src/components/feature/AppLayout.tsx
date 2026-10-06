import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Inicio", subtitle: "Como esta el negocio hoy" },
  "/ventas": { title: "Caja de venta", subtitle: "Venta minorista y mayorista" },
  "/productos": {
    title: "Productos e Inventario",
    subtitle: "Productos, costos, precios y stock reunidos en una sola experiencia",
  },
  "/precios": {
    title: "Precios y Promociones",
    subtitle: "Tramos, combos y ofertas temporales",
  },
  "/caja": { title: "Caja del dia", subtitle: "Movimiento del dia" },
  "/control-ventas": {
    title: "Control de ventas",
    subtitle: "Caja/ADMIN recibe, controla y confirma las operaciones pendientes",
  },
  "/proveedores": { title: "Proveedores", subtitle: "Modulo pendiente para proxima etapa" },
  "/tesoreria": { title: "Tesoreria", subtitle: "Modulo pendiente para proxima etapa" },
  "/reportes": { title: "Reportes", subtitle: "Modulo pendiente para proxima etapa" },
  "/configuracion": {
    title: "Configuracion",
    subtitle: "Cuentas de cobro, medios de pago y comprobantes",
  },
};

const AppLayout = () => {
  const location = useLocation();
  const meta = titles[location.pathname] ?? {
    title: "El Chileno",
    subtitle: "Gestion comercial",
  };

  return (
    <div className="flex min-h-screen bg-background-100">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 shrink-0 bg-background-50 border-b border-background-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-semibold text-foreground-950 leading-tight">
              {meta.title}
            </h1>
            <p className="text-xs text-foreground-500">{meta.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-2 text-xs text-foreground-500 px-3 py-1.5 rounded-full bg-background-100">
              <i className="ri-database-2-line" />
              Datos mock de demostracion
            </span>
          </div>
        </header>
        <main className="flex-1 min-w-0 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;