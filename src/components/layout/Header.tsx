import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Caja Minorista', icon: 'ri-store-2-line' },
  { path: '/caja-mayorista', label: 'Caja Mayorista', icon: 'ri-building-2-line' },
  { path: '/admin', label: 'ADMIN', icon: 'ri-shield-star-line' },
  { path: '/caja-dia', label: 'Caja del día', icon: 'ri-safe-2-line' },
  { path: '/tesoreria', label: 'Tesorería', icon: 'ri-safe-fill' },
  { path: '/proveedores', label: 'Proveedores', icon: 'ri-truck-line' },
  { path: '/productos', label: 'Productos', icon: 'ri-box-3-line' },
  { path: '/reglas-precios', label: 'Reglas', icon: 'ri-percent-line' },
  { path: '/dashboard', label: 'Dashboard', icon: 'ri-dashboard-line' },
];

export default function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentDate = new Date().toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="bg-verde-900 text-white sticky top-0 z-40">
      <div className="flex items-center h-14 px-4 md:px-6 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span className="w-8 h-8 flex items-center justify-center bg-naranja-500 rounded-lg">
            <i className="ri-store-3-line text-white text-base" />
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-tight tracking-tight">Gestión Pro</p>
            <p className="text-[10px] text-verde-300 leading-tight">Fiambrería</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-verde-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className={item.icon} />
                </span>
                {item.label}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-naranja-400 ml-0.5" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-verde-100">
            <span className="w-1.5 h-1.5 rounded-full bg-naranja-400" />
            Minorista
          </span>
          <span className="hidden lg:block text-xs text-verde-300">{currentDate}</span>
          <div className="flex items-center gap-2 pl-3 border-l border-verde-700">
            <span className="w-7 h-7 rounded-full bg-naranja-500 flex items-center justify-center text-white text-xs font-bold">
              US
            </span>
            <span className="hidden lg:block text-sm text-verde-100 font-medium">Usuario</span>
            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center text-verde-300 hover:text-white transition-colors rounded cursor-pointer"
              title="Cerrar sesión"
            >
              <i className="ri-logout-box-r-line text-sm" />
            </button>
          </div>
          <button
            type="button"
            className="lg:hidden w-8 h-8 flex items-center justify-center text-verde-200 cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <i className="ri-menu-line text-lg" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-verde-700 px-4 py-3 space-y-1 max-h-80 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-verde-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="w-4 h-4 flex items-center justify-center">
                  <i className={item.icon} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}