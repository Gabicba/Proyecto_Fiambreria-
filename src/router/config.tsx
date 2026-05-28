import type { RouteObject } from "react-router-dom";
import NotFound from "../pages/NotFound";
import CajaMinorista from "../pages/caja-minorista/page";
import CajaMayorista from "../pages/caja-mayorista/page";
import AdminPage from "../pages/admin/page";
import CajaDia from "../pages/caja-dia/page";
import Tesoreria from "../pages/tesoreria/page";
import Proveedores from "../pages/proveedores/page";
import Productos from "../pages/productos/page";
import ReglasPrecios from "../pages/reglas-precios/page";
import Dashboard from "../pages/dashboard/page";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <CajaMinorista />,
  },
  {
    path: "/caja-mayorista",
    element: <CajaMayorista />,
  },
  {
    path: "/admin",
    element: <AdminPage />,
  },
  {
    path: "/caja-dia",
    element: <CajaDia />,
  },
  {
    path: "/tesoreria",
    element: <Tesoreria />,
  },
  {
    path: "/proveedores",
    element: <Proveedores />,
  },
  {
    path: "/productos",
    element: <Productos />,
  },
  {
    path: "/reglas-precios",
    element: <ReglasPrecios />,
  },
  {
    path: "/dashboard",
    element: <Dashboard />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;