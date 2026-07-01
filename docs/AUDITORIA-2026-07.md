# Auditoría del sistema MISAGI — 5 pasadas

_Fecha: 2026-07-01 · Alcance: 59 páginas, motores compartidos, reglas de seguridad._

Auditoría "relación tras relación": se recorrió el sistema en 5 pasadas, cada una revisando una dimensión distinta. Resultado global: **sistema sano**. Se corrigieron los hallazgos menores en el momento.

## Pasada 1 — Maestros → módulos (fuente única de verdad)
Regla del sistema: si una placa o persona no está en su maestro, no debería figurar.

- ✔ **Todos** los módulos que derivan de un maestro (placa/conductor) cargan `maestros.js`. Se corrigió que **Unidades, Deudas, Proveedores y Gastos SSOMA** no lo incluían (el desplegable de conductores en Unidades salía vacío).
- ✔ El motor de registros marca con ⚠ cualquier placa/conductor fuera del maestro (tabla, importación Excel y edición).
- ✔ 7 módulos derivan de maestro correctamente.

## Pasada 2 — Pipeline de ingreso (guías → tarifa → moneda → utilidad)
- ✔ Guías extraen datos por posición (orden de lectura real) y calculan **TNE × tarifa vigente por fecha**.
- ✔ **Tarifas con vigencia**: cada guía usa la tarifa que regía el día del traslado (ej. HUDBAY 39 hasta 11/03, 42 desde 12/03).
- ✔ Moneda por guía: HUDBAY en USD, Raciemsa en PEN; los totales se muestran separados por moneda.
- ✔ Utilidad convierte USD→S/ con **TC SUNAT congelado por mes** y descuenta alquiler de tolva de tercero (100 USD/guía).

## Pasada 3 — Reglas de seguridad ↔ colecciones
- ✔ Las 16 colecciones del front tienen su `match` en `firestore.rules`.
- ✔ `mail` no requiere regla: la escribe Cloud Functions con permisos de admin.
- ✔ Rutas/tarifas es maestro compartido: contabilidad lo **lee** (para las guías), solo operaciones/admin lo **escriben**.

## Pasada 4 — Includes y enlaces
- ✔ Todas las páginas de módulo cargan `firebase-config.js` y `auth.js`.
- ✔ Sin rutas rotas a `.js/.css` propios. (Único aviso: `LOGOMSG.png` en la app **externa** de Estatus de flota — es la excepción que se mantiene externa.)

## Pasada 5 — Validez de código
- ✔ Todo el JS (assets + inline de las 59 páginas) compila (`node --check`).
- ✔ Se **eliminó código muerto**: el viejo modal de tarifas en Guías (referenciaba una variable `IGV` sin declarar). 0 referencias restantes.

## Fusión Fletes → Rutas
Se unificaron los dos maestros de tarifa en **uno solo** ("Rutas y tarifas"). Guías lee de ahí; la página vieja de Fletes redirige; el auditor de consistencia apunta al maestro único.

## Refresh visual (marca MISAGI intacta)
Capa estética nueva en `theme.css`, sin tocar el HTML:
- **Aurora UI**: fondo de malla con manchas suaves en verdes/azules MISAGI.
- **Frost/Mica**: encabezado con vidrio esmerilado.
- **Glassmorphism + Bento**: tarjetas, tablas y modales translúcidos con esquinas redondeadas.
- **Claymorphism**: botón principal con volumen suave.

## Pendientes (no bloqueantes)
1. Republicar `firestore.rules` (lectura de rutas por contabilidad).
2. Cargar las vigencias de HUDBAY (39/42) en Rutas y tarifas.
3. Desplegar Cloud Functions para los correos de alerta.
4. Borrar `assets/theme.css.bak` (backup temporal del tema).

---

# Ciclo Deming (PDCA) — iteraciones con defectos encontrados y corregidos

La primera "auditoría" fue una foto. Aplicando mejora continua (Planificar–Hacer–Verificar–Actuar), cada vuelta buscó defectos más profundos y los corrigió:

**Vuelta 1 — Causa raíz del "HUDBAY en S/":**
- 🐛 *Condición de carrera:* en Guías, `cargar()` (pintar la tabla) corría **antes** de terminar de cargar las tarifas → la tabla no sabía la moneda → HUDBAY salía en S/. **Fix:** encadenar `cargar()` después de cargar tarifas.
- 🐛 *`tarifaDe` no determinista:* tomaba la **última** coincidencia de cliente. **Fix:** ahora toma la coincidencia **más específica** (clave más larga).

**Vuelta 2 — ¿El patrón de carrera se repite?**
- ✔ Revisados tablero gerencial, utilidad, roster-dashboard y días-efectivos: todos renderizan **dentro** del `.then` de sus datos. El bug era exclusivo de Guías.

**Vuelta 3 — Consistencia de normalización de placas:**
- ✔ Las 4 implementaciones (`normPlaca` en maestros y estado-unidad, `NP` en utilidad, `placaFmt` en guías) son **idénticas**. No hay desalineación que cobre mal el alquiler de tolva.

**Vuelta 4 — Defecto oculto (el más importante):**
- 🐛 El cambio de moneda en la **tabla de guías nunca se aplicó**: un `replace` no coincidió exacto y **falló en silencio**; los KPIs se corrigieron pero la tabla seguía usando `soles()` (S/ sobre USD). **Fix:** tabla, mensaje de extracción y progreso de lote ahora usan la moneda real (`montoMon`/`monedaDe`). _Lección: todo reemplazo ahora se hace con verificación (`assert` + recuento)._

**Vuelta 5 — Verificación final:**
- ✔ Helpers de moneda definidos, **todo el JS compila (0 errores)**, CSS balanceado.

**Conclusión PDCA:** 4 defectos reales encontrados y corregidos en las iteraciones (2 de ellos causaban el síntoma que reportaste). El proceso de "buscar–corregir–verificar–repetir" es lo que los destapó.
