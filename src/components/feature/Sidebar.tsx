import { NavLink, useNavigate } from "react-router-dom";
import { useApp } from "@/store/AppContext";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  pending?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", label: "Inicio", icon: "ri-dashboard-3-line" },
  { to: "/ventas", label: "Ventas", icon: "ri-shopping-cart-2-line" },
  {
    to: "/productos",
    label: "Productos e Inventario",
    icon: "ri-archive-2-line",
  },
  {
    to: "/precios",
    label: "Precios y Promociones",
    icon: "ri-price-tag-3-line",
  },
  { to: "/proveedores", label: "Proveedores", icon: "ri-truck-line", pending: true },
  { to: "/caja", label: "Caja del dia", icon: "ri-cash-line" },
  {
    to: "/tesoreria",
    label: "Tesoreria",
    icon: "ri-bank-card-line",
    pending: true,
  },
  { to: "/reportes", label: "Reportes", icon: "ri-bar-chart-2-line", pending: true },
  {
    to: "/configuracion",
    label: "Configuracion",
    icon: "ri-settings-3-line",
  },
  {
    to: "/control-ventas",
    label: "Control de ventas",
    icon: "ri-file-list-3-line",
  },
];

const Sidebar = () => {
  const { currentUser, logout, state } = useApp();
  const navigate = useNavigate();

  const pendingCount = state.sales.filter((s) => s.status === "pendiente").length;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-foreground-950 flex flex-col">
      <div className="px-5 py-5 border-b border-foreground-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-primary-500 flex items-center justify-center">
            <i className="ri-store-2-line text-background-50 text-xl" />
          </div>
          <div className="min-w-0">
            <p className="text-background-50 font-semibold leading-tight tracking-wide">
              EL CHILENO
            </p>
            <p className="text-[11px] text-foreground-400 leading-tight">
              Gestion Comercial
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <p className="px-2 pb-2 text-[10px] uppercase tracking-widest text-foreground-500">
          Operacion
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-primary-500 text-background-50"
                      : "text-foreground-300 hover:bg-foreground-800/60 hover:text-background-50"
                  }`
                }
              >
                <span className="w-6 h-6 flex items-center justify-center shrink-0">
                  <i className={`${item.icon} text-lg`} />
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.pending ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning-soft text-warning font-semibold">
                    PROX
                  </span>
                ) : null}
                {item.to === "/control-ventas" && pendingCount > 0 ? (
                  <span className="text-[9px] min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-foreground-950 font-bold flex items-center justify-center tabular-nums">
                    {pendingCount}
                  </span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-foreground-800/60 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-foreground-800 flex items-center justify-center text-background-50 font-semibold text-sm">
            {currentUser?.name?.charAt(0) ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-background-50 truncate">
              {currentUser?.name ?? "Sin sesion"}
            </p>
            <p className="text-[11px] text-foreground-500 truncate">
              {currentUser?.roleLabel ?? ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground-300 hover:bg-foreground-800/60 hover:text-background-50 cursor-pointer"
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-logout-box-r-line" />
          </span>
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;