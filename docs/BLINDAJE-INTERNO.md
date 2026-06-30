# Blindaje interno — MISAGI sistema

Endurecimiento de seguridad y mantenibilidad para uso interno (una sola empresa). No es multi-tenant: eso queda para un eventual proyecto comercial.

---

## 1. Auditoría de Reglas

### Firestore (`migracion/firestore.rules`) — **sólido, sin huecos**
- Nada es accesible sin sesión; el `match /{document=**} { if false }` final bloquea todo lo no declarado.
- Cada área solo ve su colección (`tieneArea` exige además que el usuario esté **activo**, así una baja se corta en todo el sistema).
- `usuarios`: cada quien lee solo su perfil; altas/bajas solo admin → no hay forma de auto-asignarse permisos ni de enumerar usuarios.
- `asistencia` y `solicitudes`: cada quien crea/lee solo lo suyo (validado por `uid == request.auth.uid`); solo admin resuelve.
- `roster`: el conductor lee solo sus propios días (por DNI).
- **Resultado: aprobado.** No requiere cambios.

### Storage (`migracion/storage.rules`) — **se encontró y corrigió 1 debilidad**
- Antes: *cualquier* usuario con sesión podía subir archivos.
- Ahora: solo **Operaciones / RRHH / Admin** pueden subir, **solo imágenes y PDF**, hasta **15 MB** (se valida contra el perfil en Firestore).
- **Acción:** publicar la nueva versión en consola → Storage → Rules → Publicar.

---

## 2. App Check (protege tu base del abuso externo)

Tu `apiKey` es pública por diseño; lo que impide que alguien la use para golpear la base por fuera de tu app es **App Check**. Ya quedó el SDK integrado en las 39 páginas y la activación central en `firebase-config.js` (inactiva hasta que pegues tu clave, así nada se rompe).

**Pasos en consola (una vez):**
1. [console.firebase.google.com](https://console.firebase.google.com) → proyecto **misagi-sistema** → **App Check**.
2. En la app **Web**, registra el proveedor **reCAPTCHA v3**. Google te da una **clave de sitio (site key)**.
3. Abre `assets/firebase-config.js` y pega esa clave en `MISAGI_APPCHECK_SITE_KEY = "..."`. Push.
4. Prueba el sistema unos días con App Check **sin “Enforce”** (modo monitoreo).
5. Cuando veas tráfico verificado, activa **Enforce** en **Firestore** y **Storage**. Listo.

> Si algo dejara de cargar tras “Enforce”, basta con desactivarlo y revisar; nunca toques esto en hora pico.

---

## 3. Modularización del frontend (hecho)

El `index.html` pasó de monolítico a separado:
- `assets/css/variables.css` — tokens de diseño + base.
- `assets/css/login.css` — pantalla de acceso.
- `assets/css/portal.css` — sidebar, topbar, tarjetas.

Beneficio: el navegador **cachea** el CSS (carga más rápida en visitas siguientes) y los cambios de estilo ya no obligan a tocar el HTML. El comportamiento es idéntico.

---

## 4. Respaldo automático

Además del botón manual (**Admin › Respaldo de la base**), activa los **backups nativos de Firestore** (automáticos, sin código):

1. Consola → Firestore Database → pestaña **Backups**.
2. **Create schedule** → frecuencia **Diaria**, retención p. ej. **7 días**.
3. Guardar. Firestore hará una copia diaria recuperable ante cualquier error.

> Requiere plan Blaze (ya lo tienes). El costo de los backups es mínimo para tu volumen.

Recomendación combinada: backups nativos diarios + un respaldo manual en Excel (botón) antes de cambios grandes.
