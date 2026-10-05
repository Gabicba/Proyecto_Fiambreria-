import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import Login from "../pages/login/page";
import AppLayout from "../components/feature/AppLayout";
import RequireAuth from "../components/feature/RequireAuth";
import DashboardPage from "../pages/dashboard/page";
import SalesPage from "../pages/sales/page";
import ProductsPage from "../pages/products/page";
import PromotionsPage from "../pages/promotions/page";
import CashPage from "../pages/cash/page";
import ControlVentasPage from "../pages/control/page";
import SettingsPage from "../pages/settings/page";
import PendingPage from "../pages/pending/page";

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "ventas", element: <SalesPage /> },
      { path: "productos", element: <ProductsPage /> },
      { path: "precios", element: <PromotionsPage /> },
      { path: "caja", element: <CashPage /> },
      { path: "control-ventas", element: <ControlVentasPage /> },
      { path: "proveedores", element: <PendingPage /> },
      { path: "tesoreria", element: <PendingPage /> },
      { path: "reportes", element: <PendingPage /> },
      { path: "configuracion", element: <SettingsPage /> },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;