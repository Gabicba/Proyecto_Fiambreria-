import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "@/components/base/Button";
import { useApp } from "@/store/AppContext";

const quickUsers = [
  { username: "admin", password: "admin123", label: "Administrador" },
  { username: "vendedor", password: "vende123", label: "Vendedor Minorista" },
  { username: "mayorista", password: "mayor123", label: "Vendedor Mayorista" },
];

const Login = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Completa usuario y contrasena para continuar.");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      const user = login(username, password);
      setLoading(false);
      if (user) {
        navigate(from, { replace: true });
      } else {
        setError("Usuario o contrasena incorrectos. Verifica los datos.");
      }
    }, 350);
  };

  const fill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  return (
    <div className="min-h-screen flex bg-background-100">
      <div className="hidden lg:flex w-1/2 bg-foreground-950 flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-md bg-primary-500 flex items-center justify-center">
            <i className="ri-store-2-line text-background-50 text-2xl" />
          </div>
          <div>
            <p className="text-background-50 font-semibold tracking-wide">
              EL CHILENO
            </p>
            <p className="text-xs text-foreground-400">Gestion Comercial</p>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-background-50 leading-snug max-w-md">
            Comprar bien, definir precio y vender rapido.
          </h1>
          <p className="mt-4 text-foreground-400 max-w-md text-sm leading-relaxed">
            Prototipo funcional del sistema de gestion: ventas por unidad y por
            kilogramo, minorista y mayorista, promociones por cantidad, combos y
            control de stock y caja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Ventas", "Stock", "Combos", "Caja del dia"].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 rounded-full bg-foreground-800/70 text-foreground-300 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-md bg-primary-500 flex items-center justify-center">
              <i className="ri-store-2-line text-background-50 text-xl" />
            </div>
            <div>
              <p className="font-semibold text-foreground-950">EL CHILENO</p>
              <p className="text-xs text-foreground-500">Gestion Comercial</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-foreground-950">
            Ingresar al sistema
          </h2>
          <p className="text-sm text-foreground-500 mt-1">
            Acceso para caja y administracion.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                Usuario
              </label>
              <div className="relative flex items-center">
                <i className="ri-user-line absolute left-3 text-foreground-400" />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: admin"
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground-700 mb-1.5">
                Contrasena
              </label>
              <div className="relative flex items-center">
                <i className="ri-lock-line absolute left-3 text-foreground-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contrasena"
                  className="w-full h-10 pl-10 pr-10 rounded-md border border-background-300 bg-background-50 text-sm text-foreground-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 w-7 h-7 flex items-center justify-center rounded text-foreground-400 hover:bg-background-100 cursor-pointer"
                  aria-label="Mostrar u ocultar contrasena"
                >
                  <i
                    className={
                      showPassword ? "ri-eye-off-line" : "ri-eye-line"
                    }
                  />
                </button>
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
                <i className="ri-error-warning-line mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading}
              icon={loading ? "ri-loader-4-line animate-spin" : "ri-login-circle-line"}
            >
              {loading ? "Ingresando..." : "INGRESAR"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-background-200">
            <p className="text-xs text-foreground-500 mb-2">
              Accesos de prueba (tocá para completar):
            </p>
            <div className="space-y-1.5">
              {quickUsers.map((u) => (
                <button
                  key={u.username}
                  type="button"
                  onClick={() => fill(u.username, u.password)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-background-200 hover:bg-background-100 text-left cursor-pointer"
                >
                  <span className="text-sm text-foreground-700">{u.label}</span>
                  <span className="text-xs text-foreground-400">
                    {u.username} / {u.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;