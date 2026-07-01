# Arquitectura interna y flujo de datos — MISAGI sistema

Documento de arquitecto: cómo fluye el dato, qué alimenta cada automatización (inputs/outputs) y **qué falta cargar** para encenderlas.

---

## 1. Capas (de abajo hacia arriba)

1. **Identidad y acceso** — Firebase Auth (correo+clave) · `usuarios/{uid}` = `{ areas[], activo, dni }` · Reglas de Firestore/Storage · App Check.
2. **Maestros (única fuente)** — `personas` (clave DNI), `unidades` (clave placa, con estado), `rutas`. Si algo no está aquí, no aparece ni se deriva.
3. **Captura** — Motor `registro.js` → escribe en colecciones por área (`operaciones`, `mantenimiento`, `rrhh`) con un campo `modulo`. Los desplegables salen siempre de los maestros (nada de texto libre).
4. **Proceso / automatización** — `estado-unidad.js`, hooks `onGuardado`, panel Consistencia, Alertas.
5. **Salidas** — Tablero gerencial, Días efectivos, Rendimiento combustible, Ficha 360°, Alertas.

---

## 2. Modelo de datos (colecciones y claves)

| Colección | Clave / id | Campos clave | Estado |
|---|---|---|---|
| `usuarios` | uid | areas[], activo, dni | ✅ |
| `personas` | DNI | nombre, tipo, cargo, activo | ⬆ importar (19) |
| `operaciones` (modulo=unidades) | auto | placa, tipo, **estado**, conductor | ⬆ importar (21) |
| `operaciones` (modulo=rutas) | auto | nombre, cliente, km | ⬆ importar (2) |
| `operaciones` (modulo=combustible) | auto | placa, conductor, galones, litros, costo, **km** | ✅ 300 · **km vacío** |
| `operaciones` (modulo=gnl) | auto | placa, kg, costo, fecha | ✅ pocos |
| `operaciones` (modulo=lavado) | auto | placa, tipo, costo | ✅ 157 |
| `operaciones` (modulo=checklist) | auto | unidad, conductor, estado | ▢ vacío |
| `mantenimiento` (modulo=correctivo) | auto | placa, gravedad, estado, costo, fecha | ✅ 103 |
| `mantenimiento` (modulo=preventivo) | auto | placa, km_proximo, dias_faltantes | ✅ 10 |
| `roster` | dni_fecha | dni, nombre, fecha, **estado (código)** | ✅ 872 |
| `documentos` | auto | entidad(placa/dni), categoria, tipo, **vencimiento** | ▢ vacío |
| `solicitudes` / `asistencia` | auto | uid, … (serverTimestamp) | ✅ flujo |

---

## 3. Automatizaciones: entrada → proceso → salida → qué falta

### A. Estados automáticos de unidad
- **Inputs:** `mantenimiento/correctivo` (gravedad, estado) ✅ · `documentos` críticos (SOAT, Rev. Técnica, Habilitación MTC) con `vencimiento` ▢.
- **Proceso:** `estado-unidad.js` → si hay falla grave abierta o doc crítico vencido ⇒ `unidad.estado = "En mantenimiento"`; si no, `Operativo`. Nunca toca "Baja".
- **Output:** `unidades.estado` → excluye la unidad de los desplegables + la marca en el Tablero.
- **Falta:** cargar **documentos de unidades con fecha de vencimiento**. (La parte de fallas ya funciona.)

### B. Rendimiento de combustible (km/galón, costo/km)
- **Inputs:** `combustible` con `km`, `galones`, `costo`.
- **Proceso:** por unidad y fecha, Δkm / galones consumidos.
- **Output:** km/galón por unidad, costo/km, alertas de caída (robo/fuga).
- **Falta:** **capturar el kilometraje en cada carga** (el campo ya existe en el formulario). Las anomalías de precio/consumo ya funcionan sin km.

### C. Tablero gerencial
- **Inputs:** unidades, combustible+gnl+lavado+correctivo (costos), documentos, gnl, personas.
- **Output:** disponibilidad de flota, costo de operación/mes, correctivos abiertos, meta GNL, etc.
- **Falta:** nada para lo básico. Costo/km y rendimiento se activan con el km (B).

### D. Alertas / vencimientos (y correo)
- **Inputs:** `documentos.vencimiento` ▢ · `personal.vcto_emo` / licencia ▢ · `preventivo.dias_faltantes` ✅.
- **Output:** lista de "vencidos / por vencer" + (con Cloud Function) correo 7 días antes.
- **Falta:** cargar **documentos con fecha** y **EMO/licencia con fecha**; **desplegar la Cloud Function** + SendGrid para el correo.

### E. Días efectivos (roster → planilla)
- **Inputs:** `roster.estado` (códigos) ✅.
- **Proceso:** ruta + presente + ½ medio día (P se paga igual que ruta).
- **Output:** días efectivos por conductor + días-conductor por cliente · Excel.
- **Falta:** nada. Funciona.

### F. Consistencia de maestros
- **Inputs:** todos los módulos + maestros.
- **Output:** lista de placas/personas registradas fuera del maestro.
- **Falta:** nada. Meta: 0 inconsistencias.

---

## 4. Qué cargar para desbloquear (prioridad)

1. **Importar maestros** — Personas (19) y Unidades (21). Base de todo.
2. **Kilometraje en combustible** — empezar a capturarlo en cada carga ⇒ enciende rendimiento y costo/km.
3. **Documentos de unidades con vencimiento** — SOAT, Rev. Técnica, Habilitación MTC ⇒ enciende estados automáticos + alertas.
4. **EMO / licencia de conductores con fecha** ⇒ alertas de personal.
5. **Desplegar Cloud Function + SendGrid** ⇒ correos automáticos (paso en Cloud Shell).

---

## 5. Convenciones (para no romper nada al crecer)

- **Claves estables:** placa normalizada `AAA-000` (`MISAGI_MAESTROS.normPlaca`), persona por DNI.
- **Derivar, no duplicar:** usar `infoUnidad(placa)` / `infoPersona(dni)` o `auto:{padre,campo}` en el motor.
- **Desplegables solo desde maestros** (`fuente:"unidades"|"conductores"|"personas"`).
- **Seguridad siempre en backend** (Reglas), nunca confiar en el menú del cliente.
- Todo módulo nuevo: capturar por lista → derivar del maestro → verificar en Consistencia (0).
