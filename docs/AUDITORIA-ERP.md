# Auditoría MISAGI + Hoja de ruta hacia un ERP

_Fecha: 2026-07-01 · Objetivo: detectar inconsistencias/olvidos y definir qué falta conectar para que sea un ERP personalizado de transporte._

---

## Parte A — Inconsistencias, botones "por gusto" y olvidos tras cambios

| # | Hallazgo | Dónde | Acción |
|---|----------|-------|--------|
| A1 | **Menú lleva a páginas que no existen** (`comercial/`, `presupuesto/`) → clic = pantalla en blanco/404. | `assets/portal.js` | Que los módulos "próximamente" **no naveguen** (mostrar chip y bloquear clic) o crear su página. |
| A2 | **Etiquetas "próximamente" desactualizadas**: Contabilidad figura "proximamente" pero ya tiene Guías y Rutas/Tarifas **activos**; SSOMA igual (ya hay Gastos SSOMA). | `assets/portal.js` | Marcar Contabilidad y SSOMA como **activos**. |
| A3 | **Carpetas `app/` legacy huérfanas**: `finanzas/compras/app`, `finanzas/deudas/app`, `rrhh/cts/app`, `proveedores/app` ya son nativos (registro.js) → esas `app/` sobran. | repo | **Borrar** esas 4 carpetas `app/`. `seguimiento/`, `tracker/`, `estatus/`, `planificacion/` se mantienen (parked/externas). |
| A4 | **Página `contabilidad/fletes/`** quedó solo como redirección tras la fusión con Rutas. | repo | Se puede eliminar (o dejar como redirección). |
| A5 | **Dos fuentes de personal**: el maestro nuevo es `personas` (20, seed-personas.js), pero **el roster, Accesos (precargados) y RRHH/Personal siguen leyendo el seed viejo** `MISAGI_SEED_PERSONAL`. | roster, accesos, rrhh/personal | Unificar: que todos lean del **maestro `personas`**. El seed viejo debe quedar solo como respaldo. |
| A6 | **RRHH › Personal (Legajos) duplica** al maestro Personas: importa el seed viejo en vez de leer `personas`. | `rrhh/personal/` | Definir: Personas = maestro (datos); RRHH/Personal = **legajo documental** que lee de personas, no otra base. |
| A7 | `assets/theme.css.bak` (backup temporal del tema) quedó en el repo. | assets | Borrar. |
| A8 | Comentario "Maestro de Fletes" en el auditor (cosmético). | `admin/consistencia` | Renombrar comentario. |

_Nada de esto rompe el uso diario hoy, pero son puntas sueltas que un ERP no debe tener._

---

## Parte B — Mapa ERP: qué hay, qué falta y qué falta CONECTAR

Un ERP son **ciclos conectados**, no módulos sueltos. Estado por ciclo:

### 1. Ventas / Ingresos — 🟡 a medias
- **Hay:** Guías → ingreso (TNE × tarifa vigente, moneda, IGV), Maestro de Rutas/Tarifas.
- **Falta:** Facturación (emitir/registrar factura ligada a la guía), **Cuentas por Cobrar** (qué facturas están pendientes/pagadas por cliente), **Cobranza**, control de **Detracción** y **Factoring**.
- **Conexión que falta:** `Guía → Factura → Cuenta por cobrar → Cobranza`. Hoy corta en la guía (factura/detracción son campos sueltos, sin panel de CxC).

### 2. Compras / Egresos — 🟡 a medias
- **Hay:** Compras, Deudas, Proveedores (nativos), y gastos (combustible, GNL, lavado, mantenimiento).
- **Falta:** **Cuentas por Pagar** (qué le debes a cada proveedor y vencimientos), **Almacén/Inventario** de repuestos y llantas.
- **Conexión que falta:** `Compra → Proveedor → Cuenta por pagar → Pago`. Hoy son listas sueltas.

### 3. Tesorería / Caja–Bancos — 🔴 no existe (lo más crítico para un ERP)
- **Falta todo:** saldos de caja y bancos, movimientos, conciliación, **flujo de caja** (ingresos cobrados vs egresos pagados).
- **Conexión que falta:** que Cobranzas y Pagos alimenten un **libro de caja/bancos** → foto real de liquidez. Es el corazón de un ERP.

### 4. RRHH / Planilla — 🟡 a medias
- **Hay:** Personas (maestro), Asistencia, Roster, Vacaciones (con "V" y saldo), CTS, Boletas (Mi espacio), antigüedad.
- **Falta:** **Planilla/Nómina** (cálculo de sueldo, aportes, descuentos), y que **Asistencia/Roster alimenten el cálculo del pago**.
- **Conexión que falta:** `Asistencia/Roster → Planilla → Boleta`. Hoy boletas y CTS son listas, no cálculo.

### 5. Flota / Activos — 🟢 fuerte
- **Hay:** Unidades, Mantenimiento (correctivo/preventivo), Documentos, Estados automáticos, Combustible, GNL, Lavado, Checklist, Roster, Programación, rendimiento.
- **Falta:** **Inventario de repuestos/llantas** (vida útil de llantas por km), **depreciación de activos**, plan de mantenimiento por km automático.
- **Conexión que falta:** `Mantenimiento → consume Inventario`.

### 6. Contabilidad / Finanzas — 🟡 a medias
- **Hay:** Guías (ingreso), Utilidad (P&L operativo con IGV), Rutas/Tarifas, TC por mes.
- **Falta:** **Estado de resultados formal**, **utilidad neta (Impuesto a la Renta)**, **libro de IGV** (ventas−compras), **Presupuesto vs Real**, e integración con **SUNAT** (facturación electrónica, SIRE).

### 7. Gerencia / BI — 🟢 bien
- **Hay:** Tablero gerencial (tarjetas clickeables), Utilidad, consistencia de maestros.
- **Falta:** proyecciones, comparativo mes vs mes, y **desplegar las Cloud Functions** de alertas (hoy sin desplegar).

---

## Parte C — Roadmap priorizado para llegar a ERP

**Fase 0 — Limpieza (rápido, esta semana):** A1–A8 de arriba (menú, carpetas huérfanas, fuente única de personal, backup).

**Fase 1 — Cerrar el ciclo de dinero (alto impacto):**
1. **Cuentas por Cobrar**: panel de facturas por cliente (pendiente/pagada/factoring) partiendo de las guías.
2. **Cuentas por Pagar**: lo mismo con proveedores/compras.
3. **Caja y Bancos + Flujo de caja**: libro de movimientos que una cobranzas y pagos.

**Fase 2 — Formalizar contabilidad:**
4. Estado de resultados + **utilidad neta** (agregar renta).
5. Libro de IGV (ventas − compras) y control de detracciones.

**Fase 3 — RRHH y almacén:**
6. **Planilla** conectada a asistencia/roster → boleta calculada.
7. **Inventario** de repuestos/llantas conectado a mantenimiento.

**Fase 4 — Integraciones externas:**
8. **SUNAT** (facturación electrónica / SIRE), **GPS/telemetría** (seguimiento), correos automáticos (functions).

Con la Fase 1 completa, MISAGI ya se comporta como un ERP (dinero conectado de punta a punta). Las fases 2–4 lo llevan a nivel comercializable.

---

## Prioridad inmediata sugerida
1. Limpieza Fase 0 (lo hago yo, es rápido).
2. **Cuentas por Cobrar** (Fase 1.1) — es lo que más te falta hoy: saber cuánto te deben y en qué estado está cada factura/detracción.
