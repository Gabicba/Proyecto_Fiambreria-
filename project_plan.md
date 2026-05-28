# Gestión Fiambrería Pro — Plan de Evolución V2

## 1. Descripción del Proyecto
Sistema de gestión integral para fiambrerías, quioscos y comercios minoristas. MVP V1 cubre caja minorista con carrito y catálogo. V2 evoluciona hacia un sistema completo de punto de venta con flujo de pagos, reglas de precios, báscula, tesorería separada, dashboard y gestión avanzada de inventario/proveedores.

## 2. Estructura de Páginas
- `/` — Caja Minorista (POS retail con pago, cliente, báscula)
- `/caja-mayorista` — Caja Mayorista (POS wholesale)
- `/admin` — Panel ADMIN (confirmar ventas, configurar intereses, reglas de precio)
- `/caja-dia` — Caja del Día (movimientos diarios de caja)
- `/tesoreria` — Tesorería (fondos acumulados del negocio)
- `/proveedores` — Gestión de proveedores
- `/productos` — Catálogo de productos con costo, precios, stock, vencimiento, ingreso rápido de stock, actualización masiva por proveedor o búsqueda, ajuste rápido por código de barras
- `/dashboard` — Métricas: más vendidos, rentabilidad, alertas, balances
- `/reglas-precios` — Reglas de precios avanzadas (promos, combos, descuentos)

## 3. Core Features
- [ ] Flujo de pago con selección de método (efectivo, débito, crédito, transferencia, Mercado Pago, mixto)
- [ ] Configuración de intereses por cuotas (crédito) y por método de pago
- [ ] Campo opcional de nombre de cliente
- [ ] ADMIN recibe venta: confirma pago, calcula vuelto, imprime ticket, finaliza
- [ ] Reglas de precios: crear, editar, activar/desactivar, eliminar, rangos de fecha, condiciones
- [ ] Integración de báscula Systel Cuora 30 (lectura automática de PLU, peso, monto)
- [ ] Flujo de código de barras: ventas, búsqueda, inventario, compras, creación de productos
- [ ] Módulo de tesorería separado de caja diaria (movimientos de entrada/salida)
- [ ] Dashboard con productos más vendidos, rentables, alertas de stock, vencimientos, balance
- [ ] Estructura de productos actualizada: costo, precio minorista/mayorista, impuestos, margen, stock mínimo, vencimiento
- [ ] Productos: CRUD completo, búsqueda por nombre/código/barras, ingreso rápido de stock, actualización masiva por proveedor o búsqueda con preview y selección, ajuste rápido por código de barras, alertas de vencimiento

## 4. Modelo de Datos

### Product (actualizado)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Identificador único |
| code | string | Código interno |
| barcode | string | Código de barras |
| name | string | Nombre del producto |
| category | string | Categoría |
| unit | string | Unidad (kg, un, etc.) |
| purchasePrice | number | Precio de compra |
| retailPrice | number | Precio minorista |
| wholesalePrice | number | Precio mayorista |
| taxRate | number | % impuestos |
| profitMargin | number | % margen de ganancia |
| minStock | number | Stock mínimo de alerta |
| expirationDate | string | Fecha de vencimiento |
| currentStock | number | Stock actual |
| pluCode | string | Código PLU para báscula |

### Sale
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Identificador único |
| items | CartItem[] | Productos vendidos |
| customerName | string | Nombre del cliente (opcional) |
| paymentMethod | string | Método de pago |
| installments | number | Cuotas (si aplica) |
| interestRate | number | % de interés aplicado |
| subtotal | number | Subtotal |
| finalAmount | number | Monto final |
| origin | string | Retail / Wholesale |
| sellerName | string | Nombre del vendedor |
| status | string | pendiente / confirmada / finalizada |
| createdAt | string | Fecha de creación |

### PricingRule
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Identificador único |
| name | string | Nombre de la regla |
| type | string | Tipo (descuento_cantidad, 3x2, combo, promo_categoria, promo_proveedor, promo_manual) |
| condition | object | Condición (cantidad mínima, categoría, proveedor, productos) |
| discount | number | % o monto de descuento |
| startDate | string | Fecha inicio |
| endDate | string | Fecha fin |
| appliesTo | string | retail / wholesale / both |
| isActive | boolean | Activa o no |

### TreasuryMovement
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | string | Identificador único |
| type | string | entrada / salida |
| category | string | categoría (proveedor, gasto, retiro, ajuste, depósito, ganancia) |
| amount | number | Monto |
| description | string | Descripción |
| date | string | Fecha |

### PaymentMethodConfig
| Campo | Tipo | Descripción |
|-------|------|-------------|
| method | string | Método de pago |
| interestRates | object[] | Configuración de cuotas e intereses |
| fixedFee | number | Comisión fija (si aplica) |

## 5. Integraciones Backend
- **Supabase**: Recomendado para producción. Auth, base de datos, edge functions.
- **Actual**: Persistencia via localStorage para demostración funcional sin backend.

## 6. Plan de Fases de Desarrollo

### Phase 1: Flujo de Pago + Estructura de Productos Actualizada (COMPLETADO)
- Actualizar modelo de productos con costo, precios, impuestos, margen, stock, vencimiento
- Implementar selección de método de pago en carrito (efectivo, débito, crédito, transferencia, Mercado Pago, mixto)
- Campo cliente opcional
- Configuración de intereses por cuotas y método de pago
- Enviar venta a ADMIN con todos los datos
- Tabla de ventas pendientes en ADMIN
- **Entregable**: POS minorista funcional con pago completo

### Phase 2: Panel ADMIN + Módulos Restantes (COMPLETADO)
- Lista de ventas pendientes recibidas con confirmar pago, calcular vuelto, imprimir ticket, finalizar
- Caja del Día con ventas finalizadas y desglose por método de pago
- Proveedores con productos asociados y totales
- Caja Mayorista funcional con precios mayoristas
- **Entregable**: Todos los módulos operativos

### Phase 3: Reglas de Precios + Dashboard + Tesorería + Productos avanzado (COMPLETADO)
- CRUD de reglas de precios con activar/desactivar, rangos de fecha, condiciones
- Dashboard con métricas: más vendidos, rentables, alertas de stock, vencimientos, balances
- Tesorería separada de caja diaria con movimientos de entrada/salida
- Productos: CRUD completo, búsqueda por nombre/código/barras, ingreso rápido de stock, actualización masiva por proveedor o búsqueda con preview, selección individual, edición inline, ajuste rápido por código de barras, alertas de vencimiento
- **Entregable**: Control completo del negocio