# Auditoría MISAGI Sistema — Fable 5

**Fecha:** 2026-07-01 · **Alcance:** repo `misagi-sistema` (código real leído, no supuesto) + repos históricos en `github.com/mateobartra-arch` + `GUIAS HUDBAY ene-jun 2026 (importar).xlsx`.
**Método:** ciclo Deming (PDCA) en 3 vueltas — *Planear* (leer código), *Hacer* (parches seguros), *Verificar* (`node --check`, CVEs, cruce de datos), *Actuar* (lista de acciones y preguntas de negocio).

---

## Resumen ejecutivo (10 líneas)

1. **El riesgo #1 no es el código: son las credenciales.** El repo es público y contiene correos (`nombre@misagi.com`) y DNIs, y la contraseña inicial *es* el DNI → cualquiera puede iniciar sesión como un empleado real.
2. Las **Security Rules de Firestore están bien diseñadas** (deny-by-default, sin escalada de privilegios): esa parte es sólida.
3. Pero **App Check está desactivado** (`site key` vacío), así que la base depende solo del login, y el login es débil por el punto 1.
4. Hay **4 proyectos Firebase viejos** (asistencia, deudas, transportes, rrhh) todavía vivos con GitHub Pages y datos reales expuestos.
5. **`pdf.js 3.11.174` y `xlsx 0.18.5` tienen CVEs conocidos**; el de pdf.js permite ejecutar JavaScript con una guía PDF maliciosa. Ya apliqué una mitigación segura.
6. El **motor de dinero (guías → tarifa vigente → IGV → utilidad USD→S/) es correcto**, con dos puntos frágiles: la *inferencia de moneda* al importar Excel y el *alquiler de tolva de tercero*.
7. El **alquiler de tolva** cobra 100 USD por guía a toda tolva que no esté en el maestro de Unidades → si el maestro está incompleto, sobreestima gastos.
8. La **consistencia placa/conductor/cliente es "blanda"** (se marca con ⚠ pero se guarda igual); el módulo de Consistencia existe y funciona, pero no bloquea.
9. Faltan por modelar: **detracción 4% automática, factoring, y el maestro de terceros (SERVOSA/SORDOSA)** como entidad, no como texto.
10. Roadmap: forzar cambio de clave, activar App Check, cerrar proyectos viejos, subir dependencias, y medir lo que hoy no se mide (margen por viaje, no solo por mes).

---

## 1) Auditoría de seguridad

### 1.1 Firestore rules (`migracion/firestore.rules`) — regla por regla

La estructura es **correcta y defensiva**. Puntos verificados:

- **Deny-by-default presente** (`firestore.rules:98` `match /{document=**} { allow read, write: if false; }`). ✔
- **Sin auto-escalada de privilegios:** `usuarios/{uid}` solo permite `create/update/delete` a `esAdmin()` (`firestore.rules:21`); un usuario no puede añadirse `areas:["admin"]` a sí mismo. ✔ Esto es lo más importante y está bien.
- **Lectura del propio perfil** correcta (`firestore.rules:20`).
- **`asistencia` / `solicitudes`**: cada quien crea con su propio `uid` y lee lo suyo (`firestore.rules:26`, `34-35`). ✔
- **`roster`**: el conductor solo lee sus días por DNI (`firestore.rules:54`). ✔

Hallazgos:

| # | Severidad | Regla / línea | Problema | Fix concreto |
|---|-----------|---------------|----------|--------------|
| S1 | **Medio** | `personas/{doc}` read `firestore.rules:65-66` | **Todo usuario logueado lee el directorio completo de personas (incluye DNIs).** Un conductor ve DNIs de todos. | Restringir lectura a `tieneArea('operaciones') || tieneArea('rrhh')`, y exponer a los demás solo un maestro reducido (nombre + placa) vía otra colección o Cloud Function. |
| S2 | **Medio** | `enlaces/{doc}` read `firestore.rules:42` | Cualquier logueado lee **todos** los enlaces de Drive; el filtro por área es solo en el cliente (`index.html:186`). Un usuario curioso puede leer la colección con la consola y ver enlaces de áreas que no le tocan. | Añadir campo `area` al doc y filtrar en la regla, o mover el filtrado a servidor. |
| S3 | **Bajo** | `operaciones` read `firestore.rules:82-83` | `resource.data.modulo == 'rutas'` deja leer tarifas a cualquier logueado. Es intencional (contabilidad las necesita), pero expone tarifas comerciales a todo el personal. | Aceptable si es deseado; si no, gatear por `tieneArea('contabilidad') || tieneArea('operaciones') || tieneArea('comercial')`. |
| S4 | **Bajo (funcional)** | Colecciones por área lock estricto | Un usuario **solo-contabilidad** que abre Guías no puede leer `operaciones/modulo==unidades` (no tiene el área), y `maestros.js:15` traga el error con `.catch(()=>[])` → los *badges* de MISAGI/tercero fallan en silencio. | Dar lectura del maestro de Unidades a `contabilidad` también, o crear un maestro público de solo lectura de placas. |

### 1.2 Storage rules (`migracion/storage.rules`)

- **Escritura ya endurecida** (solo operaciones/rrhh/admin, tope 15 MB, solo imagen/PDF) — bien hecho (`storage.rules:22-24`).
- **S5 — Medio:** `allow read: if request.auth != null` (`storage.rules:21`) deja que **cualquier** usuario autenticado descargue **cualquier** documento (licencias, DNIs escaneados, EMO de terceros). Fix: exigir al menos `activo()`, e idealmente gatear por área igual que la escritura.

### 1.3 App Check

- **S6 — Alto:** `MISAGI_APPCHECK_SITE_KEY = ""` (`assets/firebase-config.js:26`) → App Check **inactivo**. El SDK compat de App Check se carga en cada página pero nunca se llama `activate()`. Resultado: la única barrera real es el login. Fix: registrar reCAPTCHA v3, pegar la *site key*, y activar **Enforce** en Firestore y Storage (acción tuya en consola).

### 1.4 Flujo de creación de accesos (contraseña = DNI)

Código: `admin/accesos/index.html:224-234`. Usa una **app secundaria** (`altaApp()`, `admin/accesos/index.html:99-102`) para crear el usuario sin cerrar la sesión del admin — patrón correcto. El perfil se escribe con `serverTimestamp` y `signOut()` de la app secundaria. ✔ técnicamente.

Pero:

- **S7 — CRÍTICO:** **La contraseña inicial es el DNI y nada obliga a cambiarla.** El texto dice "la puede cambiar" (`admin/accesos/index.html:50, 61`) pero no hay `forzar cambio`. Como el correo es predecible (`nombre@misagi.com`) y el DNI aparece en el propio repo (`assets/seed-personal.js`, y en los PDFs de guías), **cualquiera con acceso al repo público puede autenticarse como un empleado real** y leer lo que su rol permita. Esto anula en la práctica gran parte de las Rules.
  **Fix:** (a) hacer el repo privado; (b) quitar DNIs de los seeds commiteados; (c) al primer login, forzar cambio de contraseña (marcar `mustChangePassword:true` en el perfil y bloquear en `auth.js`/`requireLogin` hasta que la cambie); (d) activar App Check; (e) resetear las contraseñas ya creadas con DNI.
- **S8 — Bajo:** el botón "Ver portal" (`?vercomo=`, `admin/accesos/index.html:160`, `index.html:303-305`) deja al admin ver el portal como otro usuario. Está **bien gateado** (solo `esAdmin`, y las Rules siguen aplicando del lado servidor, así que no da datos nuevos). Falta solo **log de auditoría** de quién impersona a quién.

---

## 2) Revisión de código (bugs, carreras, dinero)

### 2.1 Dinero

- **C1 — Alto (moneda):** al **importar Excel de guías**, si la fila no trae moneda se infiere del maestro y si el cliente no está, **cae a `"USD"` por defecto** (`contabilidad/guias/index.html:390`). En la Utilidad, el ingreso también asume USD por defecto (`gerencia/utilidad/index.html:148` `String(g.moneda||"USD")`). Para HUDBAY (39 USD/ton) es correcto, pero para un cliente nuevo facturado en soles, el sistema multiplicaría por el TC (~×3.7) e **inflaría el ingreso**. Fix propuesto (requiere tu OK porque toca cómo se interpreta el dinero): no asumir; si no hay tarifa en el maestro, dejar `moneda` vacía y marcar la guía como "sin moneda" hasta resolver.
- **C2 — Alto (alquiler tolva de tercero):** `gerencia/utilidad/index.html:151` cobra `ALQ_TOLVA` (100 USD por defecto) **por cada guía cuya tolva no esté en el maestro de Unidades** (`!MASTERU[NP(g.tolva)]`). Es la regla correcta *solo si* el maestro de Unidades contiene **todas** las tolvas propias. En el Excel hay ~18 tolvas distintas; si alguna propia no está registrada, se le cobra alquiler indebido, y si una de tercero sí está registrada, no se le cobra. **Depende 100% de la completitud del maestro.** (Ver pregunta P2 al final.)
- **C3 — Correcto:** tarifa vigente por fecha (`contabilidad/guias/index.html:148-158`): ordena vigencias por `desde` y toma la última con `desde <= fecha_traslado`. Lógica correcta. **Fragilidad menor (C3b, Bajo):** si la tarifa actual no tiene `tarifa_desde`, usa `"0000-00-00"` igual que una vigencia sin fecha (`:151-152`), y el orden entre dos "0000-00-00" queda indefinido. Fix: exigir `tarifa_desde` en el formulario de Rutas, o desempatar por tarifa más reciente.
- **C4 — Correcto:** IGV (`contabilidad/guias/index.html:194`, `flota/operaciones/rutas/index.html:139`) y utilidad pre-IGV (usa `precio_sin_igv`) están bien.
- **C5 — Falta (detracción):** el importe de detracción se captura **a mano** (`contabilidad/guias/index.html:101`); no se calcula el 4% (SPOT transporte de carga) ni se valida contra el total. No es un bug, es un modelado faltante (ver §4).

### 2.2 Condiciones de carrera y lógica

- **R1 — Medio:** en `flota/operaciones/seguimiento/app/app.js` y `tracker/app/app.js` hay `setInterval` de refresco sin esperar a que termine el fetch anterior → si la red tarda, los ciclos se solapan y se puede pintar data a medio cargar. Fix: reemplazar por `setTimeout` re-armado al final del `then`, o un flag `cargando`.
- **R2 — Bajo:** cálculos con `.reduce()` que suman `Number(x)` sobre campos que pueden venir `undefined` (p. ej. `seguimiento/app/data.js`), propagando `NaN`. `registro.js`, `guias` y `utilidad` ya se protegen con `num()`/`Number(x||0)`; el problema está en las apps de seguimiento/tracker. Fix: envolver con `Number(x)||0`.
- **R3 — Bajo:** en Guías, si sueltas un PDF **antes** de que carguen las tarifas (encadenadas en `contabilidad/guias/index.html:414-417`), `tarifaDe()` devuelve null y no auto-calcula. Es raro pero posible. Fix: deshabilitar el *drop* hasta que `TARIFAS` esté listo.

### 2.3 XSS

- Los módulos núcleo (`guias`, `utilidad`, `rutas`, `registro.js`, `accesos`, `consistencia`) **escapan** con `esc()` de forma consistente antes de `innerHTML`. ✔
- **X1 — Alto (regresión latente):** en `tracker/app/app.js` y `seguimiento/app/app.js` hay `innerHTML` con `driver.name`, `u.tracto`, `u.empresa` **sin escapar**. Hoy la data viene de fuentes controladas, pero si un nombre trae `<img onerror=...>` se ejecuta. Fix: aplicar la misma `esc()` que el resto del sistema.

---

## 3) Dependencias

| Librería | Versión usada | Estado | Riesgo | Recomendación |
|----------|---------------|--------|--------|---------------|
| **pdf.js** | 3.11.174 (`contabilidad/guias/index.html:128`) | **Vulnerable** | **CVE-2024-4367**: ejecución de JS arbitrario al abrir un PDF malicioso (corregido en 4.2.67). Y aquí se parsean **PDFs subidos por el usuario**. | ✅ **Ya mitigado**: añadí `isEvalSupported:false` en `getDocument` (`contabilidad/guias/index.html:218`), que desactiva la ruta vulnerable sin actualizar. Ideal: subir a pdf.js ≥ 4.2.67 (requiere probar el parser de guías). |
| **xlsx (SheetJS)** | 0.18.5 (cdnjs) | **Vulnerable** | **CVE-2023-30533** (prototype pollution, fix 0.19.3) y **CVE-2024-22363** (ReDoS, fix 0.20.2). cdnjs no pasa de 0.18.5. | Cambiar el CDN a `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` (0.20.3). Afecta a `guias`, `rutas`, `registro.js`, y las apps que exportan Excel. |
| **Firebase JS SDK** | Mezcla: **9.22.0, 10.12.0, 10.12.2, 10.14.1** (varias páginas) | Desactualizado + fragmentado | Sin CVE crítico conocido, pero 4 versiones distintas es deuda de mantenimiento. | Unificar todo a una sola versión 10.x (p. ej. 10.14.1, ya presente) y planear 11.x con pruebas. |
| **Chart.js** | 4.4.0 (`gerencia/utilidad/index.html:86`) | Al día | Sin CVE relevante. | Opcional subir a 4.4.x más reciente. |
| **html2pdf.js** | 0.10.3 (`rrhh/cts/app/index.html:8`) | Antiguo | Bajo. | Revisar al tocar CTS. |

> Nota: la `apiKey` de Firebase web **no es un secreto** (es pública por diseño, correctamente comentado en `firebase-config.js:4`). El riesgo no es la key, son las Rules + App Check + credenciales.

---

## 4) Realidad del negocio — qué falta modelar

Contrastando el sistema con la operación real (transporte de concentrado de cobre, HUDBAY, subcontratado vía SERVOSA):

- **Terceros (SERVOSA/SORDOSA) como entidad, no como texto.** Hoy aparecen como string en `pagador_flete`/`transportista` y como "tolva fuera del maestro". Falta un **maestro de Terceros** (RUC, razón social, unidades/tolvas que aportan, tarifa de alquiler pactada). Esto conecta directo con C2 (alquiler de tolva): en vez de "100 USD si no está en el maestro", debería ser "tarifa del tercero dueño de esa tolva".
- **Detracción (SPOT 4%) y factoring.** Se capturan a mano (`guias`: `importe_detraccion`, `estado_factura: FACTORING`). Falta: cálculo automático del 4%, control de constancia, y un flujo de factoring (a quién se cedió, con qué descuento, fecha de pago). Es dinero real que hoy no se concilia.
- **Moneda por cliente con vigencia.** El maestro de Rutas ya tiene tarifa + vigencias, pero la **moneda** no tiene la misma robustez (C1). Modelar moneda como parte de la tarifa vigente, no como default.
- **Roster por cliente.** Hoy el roster es global; HUDBAY exige conductores habilitados/homologados. Falta marcar qué conductor está habilitado para qué cliente (y su vencimiento de homologación) — encaja con las alertas que ya existen (`functions/index.js`).
- **TNE facturada vs TNE transportada.** El cliente puede pagar por peso pactado, no el real de la guía. Hoy se cobra TNE × tarifa directo (`contabilidad/guias/index.html:193`). Confirmar si hay merma/tolerancia.

---

## 5) Consistencia de datos (Excel HUDBAY vs maestros)

Verifiqué el archivo `GUIAS HUDBAY ene-jun 2026 (importar).xlsx` (hoja DESPACHO, **237 filas de datos**):

- **Cliente:** único, `HUDBAY PERU SAC`. Debe existir en Rutas/tarifas con la clave que haga *match* por substring `HUDBAY` (`maestros.js:58`, `guias:145`). ✔ si está registrado.
- **Placas inconsistentes en origen:** el mismo tracto/tolva aparece con y sin guion (`BWU-917` y `BWU917`, `CDI-829` y `CDI829`, `CJS724`…). **El importador lo corrige**: `placaFmt`/`normPlaca` normaliza a `XXX-999` al guardar (`guias:388`, `maestros.js:64`). ✔ No genera duplicados en Firestore… *siempre que* el maestro de Unidades también esté normalizado (lo está).
- **Tolvas:** ~18 distintas tras normalizar (AFO-999, AFP-988, AFQ-984/988, ANF-995, BCZ-999, BDA-983, BDZ-976, BHX-988, BSJ-970, BWM-974, BWN-981, BWO-980/982, BWS-971, BXH-988, VGI-993, Z3P-982). **Cada una que no esté en el maestro de Unidades se factura como alquiler de tercero (C2).** → Es imprescindible clasificarlas propias vs terceros (P2).
- **Conductores:** 49 nombres distintos. Deben coincidir con el maestro de Personas por nombre en MAYÚSCULAS (`consistencia:91`). Los que no, saldrán con ⚠.

**El módulo de Consistencia (`admin/consistencia/index.html`) ya hace exactamente este cruce** para placas, conductores, DNIs y cliente-sin-tarifa — está bien construido. Lo que falta son **validaciones que bloqueen** en la captura, no solo que marquen:

- En `registro.js` la placa se normaliza pero el conductor es texto libre (solo ⚠ visual, `registro.js:39-40, 84`). Propuesta (requiere tu OK, P1): convertir conductor/placa/cliente en **`select` obligatorio desde maestro** en los módulos de captura manual, dejando texto libre solo para importaciones históricas.

---

## 6) Roadmap — 10 mejoras priorizadas (impacto/esfuerzo)

| # | Mejora | Impacto | Esfuerzo | Tipo |
|---|--------|---------|----------|------|
| 1 | Forzar cambio de contraseña al primer login + resetear las creadas con DNI | Crítico | Bajo | Control de accesos |
| 2 | Activar App Check (reCAPTCHA v3 + Enforce) | Crítico | Bajo | Seguridad |
| 3 | Repo privado + quitar DNIs de seeds commiteados | Crítico | Bajo | Seguridad |
| 4 | Cerrar/limitar los 4 proyectos Firebase viejos + despublicar Sheets + apagar Pages | Alto | Medio | Seguridad |
| 5 | Subir xlsx a 0.20.3 y unificar Firebase SDK; planear pdf.js 4.x | Alto | Medio | Dependencias |
| 6 | Maestro de Terceros (SERVOSA/SORDOSA) y alquiler de tolva por tercero, no flat 100 | Alto | Medio | Modelado/Reportes |
| 7 | Detracción 4% automática + módulo de factoring/cobranzas | Alto | Medio | Automatización |
| 8 | Validación dura (select desde maestro) en captura manual | Medio | Medio | Consistencia |
| 9 | Respaldo automático programado de Firestore (Cloud Function → Storage/GCS) con log | Medio | Medio | Respaldos |
| 10 | Escapar innerHTML en seguimiento/tracker + arreglar setInterval solapado | Medio | Bajo | Código |

**Qué medir que hoy no se mide:**

- **Margen por viaje/guía** (hoy la utilidad es mensual agregada; falta S//viaje y S//tonelada por unidad).
- **Ciclo de cobro**: días entre fecha de guía → factura → detracción → pago (con `estado_factura`/`estado_detraccion` que ya se capturan).
- **Costo por km** por unidad (combustible+GNL+mantenimiento ÷ km), ya tienes distancia en Rutas.
- **Días de homologación/documento por vencer por conductor y por cliente** (extiende las alertas actuales).
- **Auditoría de accesos**: quién impersonó (`?vercomo`), quién exportó respaldos, altas/bajas de usuarios.

---

## Parches

**Aplicado (seguro, sin tocar relaciones de datos, validado con `node --check`):**

- `contabilidad/guias/index.html:218` — `pdfjsLib.getDocument({data:reader.result, isEvalSupported:false})` → mitiga CVE-2024-4367 (pdf.js). Verificado: JS inline válido.

**Propuestos (no aplicados — requieren tu decisión o despliegue tuyo):**

- Storage rules S5: `allow read: if activo();` en `storage.rules:21`.
- Firestore rules S1: restringir lectura de `personas`.
- Dependencia xlsx: cambiar CDN a SheetJS 0.20.3.
- C1/C2/§5: cambios de modelado (moneda, alquiler de tolva, validación dura) — **ver preguntas abajo**.

---

## Preguntas para ti (tocan cómo se relacionan tus datos — no las cambio sin tu OK)

- **P1 — Validación dura:** ¿convierto conductor/placa/cliente en `select` obligatorio desde el maestro en los módulos de *captura manual* (dejando texto libre solo para importaciones)? ¿O prefieres seguir con el marcado ⚠ blando actual?
- **P2 — Tolvas propias vs terceros:** ¿cuáles de las ~18 tolvas del Excel son de MISAGI y cuáles de SERVOSA/SORDOSA? Con eso arreglo C2 para que el alquiler (100 USD/guía hoy) se cobre solo a las de tercero y por su tarifa real.
- **P3 — Moneda:** ¿HUDBAY factura siempre en USD? ¿Habrá clientes en soles? Según respondas, cambio la inferencia de moneda (C1) para que no asuma USD.
- **P4 — Detracción:** ¿el 4% SPOT aplica a todos los servicios? ¿Lo calculo automático sobre el total con IGV?

---

## Acciones que debes hacer tú (yo no puedo tocar tu Firebase/GitHub)

1. **Publicar las reglas** si decides los cambios propuestos: `firebase deploy --only firestore:rules` y pegar `storage.rules` en Consola → Storage → Rules → Publicar.
2. **App Check:** Consola → App Check → registrar app web con reCAPTCHA v3 → pegar la *site key* en `assets/firebase-config.js:26` → activar **Enforce** en Firestore y Storage.
3. **Contraseñas:** resetear las cuentas creadas con DNI (o forzar reset masivo) una vez implementemos el "cambio obligatorio al primer login".
4. **Repo privado:** cambiar `misagi-sistema` a privado en GitHub y **purgar el historial** con DNIs (borrar el repo no borra lo ya cacheado/indexado; asume que esos DNIs fueron públicos).
5. **Proyectos viejos:** en `asistencia-fe374`, `misagi-deudas`, `misagi-transportes`, `misagi-rrhh` → revisar/cerrar Rules o desactivar el proyecto; **despublicar** los Google Sheets de TRACKER/SEGUIMIENTO; **apagar GitHub Pages** de los repos viejos antes de borrarlos.
6. **Desplegar functions** si tocamos alertas: `firebase deploy --only functions`.
7. **Dependencias:** confirmar que puedo cambiar el CDN de xlsx a SheetJS 0.20.3 y unificar el SDK de Firebase (lo hago yo, tú solo revisas que todo siga funcionando).

---
*Auditoría generada leyendo el código real, con cada afirmación anclada a archivo:línea. Verificaciones: `node --check` en los 7 motores JS (OK) y en el inline de Guías tras el parche (OK); CVEs contrastados con fuentes públicas.*
