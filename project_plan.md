# EL CHILENO — GESTIÓN COMERCIAL

## 1. Descripción del proyecto

Prototipo funcional y navegable de un sistema ERP/POS para una fiambrería/comercio de
alimentos. El objetivo es representar cómo trabaja realmente el negocio: comprar bien,
conocer el costo, definir rentabilidad, fijar precio, vender (por unidad y por kilogramo,
minorista y mayorista), aplicar promociones por cantidad, packs, combos y ofertas
temporales, cobrar, controlar stock y saber dónde está el dinero.

En esta etapa (Sprint 1) el prototipo funciona **100% con datos mock** persistidos en el
navegador. La prioridad es la **lógica de negocio y la velocidad operativa**, no la
infraestructura real.

### Regla de oro
Ante cualquier conflicto entre una solución genérica de ERP y las reglas de negocio de
El Chileno, **siempre priorizan las reglas de El Chileno**.

## 2. Estructura de páginas

- `/login` — Acceso (usuario / contraseña). Datos mock por rol.
- `/` — Inicio / Dashboard (jerarquía de KPIs, tendencias, alertas).
- `/ventas` — Caja de venta (minorista / mayorista, búsqueda inteligente, teclado, preventas, cobro).
- `/productos` — Productos e Inventario (listado + ficha, costos/precios/stock, movimientos, actualización masiva).
- `/precios` — Precios y Promociones (tramos por unidad, tramos por kg, combos, ofertas temporales).
- `/caja` — Caja del día (KPIs, ingresos por método, detalle de ventas).
- `/control-ventas` — Control de ventas / Caja ADMIN (operaciones pendientes, control de pago y confirmación).
- `/proveedores` — Placeholder "Módulo pendiente para próxima etapa".
- `/tesoreria` — Placeholder.
- `/reportes` — Placeholder.
- `/configuracion` — Placeholder.

## 3. Funcionalidades núcleo (Sprint 1)

- [x] Login con roles (Administrador, Vendedor Minorista, Vendedor Mayorista).
- [x] Layout con sidebar oscuro fijo y persistencia de sesión.
- [x] Ventas: minorista/mayorista, búsqueda inteligente (parcial, cualquier orden, combos), flujo por teclado, kg/unidad, stock negativo permitido con advertencia.
- [x] Carrito con edición de cantidad sin eliminar productos; solo se elimina con acción explícita.
- [x] Preventas (guardar / recuperar) que NO afectan stock ni dinero.
- [x] Pago simple y pago mixto (una sola venta, múltiples cobros).
- [x] Productos e Inventario: listado, ficha completa, costo/IVA/precio, markup/margen/multiplicador, stock y stock mínimo.
- [x] Movimientos de stock trazables (venta, ajuste, combo).
- [x] Modo selección masiva + actualización masiva con previsualización editable.
- [x] Precios y Promociones: tramos por cantidad, tramos escalonados por kg, combos multiproducto, ofertas temporales básicas.
- [x] Caja del día: ventas de hoy, ingresos, cantidad, items, ganancia estimada, detalle de ventas y detalle de venta.
- [x] Auditoría básica (fecha, usuario, acción, valor anterior/nuevo, origen).
- [x] Consistencia "una sola vez": una venta descuenta stock y registra cobro exactamente una vez.

### Fuera de Sprint 1 (visible pero pendiente)
Tesorería, Proveedores, Reportes avanzados, Configuración completa, Control de ventas
definitivo, facturación electrónica, ARCA/AFIP, integración real con balanza.

## 4. Modelo de datos (mock local)

Se persiste en el navegador (localStorage) para mantener la sesión del prototipo.

| Entidad | Campos principales |
|---------|--------------------|
| User | id, nombre, usuario, contraseña, rol |
| Product | id, nombre, marca, categoría, código barras, código interno, proveedores, unidad, costo sin IVA, IVA %, precio minorista, precio mayorista, mismoPrecio, stock, stock mínimo |
| Category | id, nombre, activa |
| Supplier | id, nombre, CUIT, contacto |
| Account | id, nombre, tipo, activa, saldo inicial |
| PaymentMethod | id, nombre, tipo, activo |
| PricingRule | id, producto, tipo (tramo-unidad / tramo-kg / oferta-temporal), canal, tramos, activa |
| Combo | id, nombre, canal, componentes (producto + cantidad), precio, activo |
| Sale | id, número, fecha, vendedor, canal, cliente, items, cobros, total, ganancia estimada |
| HeldSale (preventa) | id, fecha, vendedor, canal, cliente, items |
| StockMovement | id, producto, cantidad firmada, tipo, fecha, usuario, origen |
| FinanceMovement | id, cuenta, tipo, importe, fecha, origen/venta |
| AuditEntry | id, fecha, usuario, acción, valor anterior, valor nuevo, origen |

### Fórmulas de rentabilidad
- Costo con IVA = Costo sin IVA × (1 + IVA % / 100)
- Multiplicador = Precio / Costo con IVA
- Markup = (Precio − Costo con IVA) / Costo con IVA × 100
- Margen = (Precio − Costo con IVA) / Precio × 100
- Ganancia = Precio − Costo con IVA

> NOTA (REQUIERE VALIDACIÓN TÉCNICA): la base de cálculo usada para markup/margen es el
> **costo con IVA**. Si el negocio define otra base, se ajusta sin cambiar el resto.

## 7. Sprint 1 — Correcciones funcionales (flujo de control de ventas)

Cambio fundamental del circuito: el vendedor ya no finaliza la venta al terminar
de cargarla; la **envía a Control de Caja** y recién Caja/ADMIN la confirma.

### Estados de operación (`Sale.status`)
- `pendiente` — PENDIENTE DE CONTROL (enviada por el vendedor).
- `finalizada` — PAGADA (confirmada por Caja/ADMIN): único estado con impacto definitivo.
- `rechazada` — devuelta al vendedor para corrección.
- `cancelada` — anulada por Caja.

### Momento de impacto (regla corregida)
- NO se descuenta stock al enviar a control, ni al guardar una preventa.
- El **stock se descuenta y el cobro se registra únicamente al confirmar** desde Control de ventas.
- No existe "stock reservado".
- El impacto real (stock, movimientos, finanzas, caja, ofertas consumidas) ocurre **una sola vez**.

### Responsabilidades
- **Vendedor:** atiende, carga productos/cantidades, aplica promociones, informa método de pago
  (con "paga con" opcional + vuelto) y ENVÍA A CAJA.
- **Caja/ADMIN:** recibe pendientes, controla productos/importes/vendedor, verifica transferencia,
  carga efectivo recibido y vuelto, y CONFIRMA, DEVUELVE o CANCELA.

### Otros ajustes de esta etapa
- Ticket imprimible de venta PAGADA (sello PAGADO, cajero, efectivo recibido y vuelto).
- Actualización masiva corregida: base = valor original (no acumula), multiplicadores
  minorista/mayorista independientes, ganancia visible y previsualización reactiva.
- Ajuste de stock ampliado: nuevo stock total, motivo, costo opcional y previsualización económica antes/después.
- Tooltips en botones de icono (editar, inventario, eliminar, etc.).
- Ficha de producto: accesos rápidos "Armar combo" y "Crear regla de precio" con precarga.
- Teclado: Enter con el buscador vacío abre el cobro.

### Pendiente de definición (NO resuelto arbitrariamente)
- Detalle de la sección 42 en adelante del documento de correcciones (mensaje cortado).

## 5. Backend / Integraciones

- Base de datos: **no conectada** — se usan datos mock locales (decisión del Sprint 1).
- Cuando el cliente valide el prototipo, se puede conectar el Backend integrado (Readdy
  Backend) o SaaS Supabase para persistencia real, autenticación y reportes.
- Shopify / Stripe / balanza / ARCA: no integrados en esta etapa.

## 6. Plan de desarrollo por etapas (Sprint 1)

### Etapa 1: Base del sistema
- Goal: estructura visual, navegación, login, store mock persistente.
- Deliverable: login + layout con sidebar + navegación.

### Etapa 2: Ventas
- Goal: circuito de venta completo con búsqueda inteligente, teclado, preventas y cobro.
- Deliverable: Caja de venta funcional.

### Etapa 3: Productos e Inventario
- Goal: gestión de productos, costos, precios, stock y movimientos.
- Deliverable: listado + ficha + actualización masiva.

### Etapa 4: Precios y Promociones
- Goal: tramos por unidad/kg, combos y ofertas temporales integradas a la venta.
- Deliverable: módulo de promociones operativo.

### Etapa 5: Caja del día + Inicio
- Goal: comprobar que las ventas impactan y ver el estado del negocio.
- Deliverable: Caja del día y dashboard.

### Etapa 6: Auditoría y pulido
- Goal: consistencia, responsive, rendimiento y revisión funcional.
- Deliverable: Sprint 1 cerrado para validación del cliente.