# Cimientos del sistema MISAGI — el maestro manda

Regla única: **toda placa y toda persona sale de su maestro. Si no está en el maestro, no aparece ni se deriva en ningún módulo.**

## Maestros (única fuente de verdad)

| Maestro | Colección | Clave | Manda sobre |
|---|---|---|---|
| **Personas** | `personas` | DNI | conductores y administrativos, su `tipo`, estado activo. Alimenta roster, desplegables de conductor/responsable y la creación de accesos. |
| **Unidades** | `operaciones` (modulo=unidades) | PLACA (AAA-000) | tipo (tracto/tolva), `estado` (Operativo / En mantenimiento / Baja), conductor asignado, marca/año/MTC. |
| **Rutas** | `operaciones` (modulo=rutas) | nombre | rutas y distancias. |

El **Legajo** (RRHH, datos sensibles) referencia a Personas por el mismo DNI; no es un segundo padrón.

## Cómo lo usan los módulos (no reinventar)

- **Desplegables:** nunca texto libre. Se usan `fuente:"unidades"` / `fuente:"conductores"` / `fuente:"personas"`. Los desplegables ya excluyen unidades de **Baja** y personas inactivas.
- **Derivar, no duplicar:** un campo puede traerse del maestro con `auto:{padre:"placa",campo:"tipo"}` (motor `registro.js`). Así el tipo de unidad no se vuelve a teclear: lo pone el maestro.
- **Consultas:** `MISAGI_MAESTROS.infoUnidad(placa)` y `.infoPersona(dni)` devuelven el registro maestro para joins (ficha 360°, costos, dashboards).
- **Claves normalizadas:** `MISAGI_MAESTROS.normPlaca()` deja toda placa en `AAA-000` para que los cruces nunca fallen.

## Control de calidad

**Admin › Consistencia de maestros** revisa todos los registros y lista los huérfanos (placa o persona que no existe en el maestro). Objetivo permanente: **0 inconsistencias**.

## Para agregar un módulo nuevo

1. Captura placa/persona **solo** con `fuente:` (desplegable del maestro).
2. Lo que dependa de la unidad/persona (tipo, estado, etc.) **derívalo** con `auto:` o `infoUnidad/infoPersona`. No lo recaptures.
3. Guarda la clave (placa normalizada / DNI), no solo el nombre.
4. Revisa en **Consistencia** que quede en 0.
