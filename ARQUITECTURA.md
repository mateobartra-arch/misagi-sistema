# Arquitectura del Sistema MISAGI — diseño y hoja de ruta

Este documento explica cómo está pensado el sistema único, por qué es escalable, cómo migrar los datos actuales y cómo llevarlo fuera de tu cuenta personal hacia un dominio propio.

## 1. Idea central

Hoy tienes ~14 aplicativos, cada uno con su HTML gigante, su login (o ninguno) y su backend (6 proyectos Firebase + 6 hojas con Apps Script). El sistema nuevo lo invierte: **un solo repositorio, un solo portal con login, una sola base de datos**, y cada aplicativo pasa a ser un *módulo* dentro de esa carcasa común. Lo compartido (marca, login, permisos, conexión a la base) vive una sola vez en `assets/`; los módulos solo aportan su pantalla y su lógica propia.

Beneficio directo: cambias el logo o una regla de seguridad **una vez** y aplica a todo; un conductor o un dato existe **una sola vez** y lo usan todos los módulos.

## 2. Mapa de módulos (tu taxonomía)

```
PORTAL MISAGI  (login único: Administrativo / Conductor + correo + contraseña)
│
├── FLOTA
│   ├── Operaciones .......... Programación · Seguimiento · Tracker
│   └── Mantenimiento ........ Mantenimiento · Llantas · Estatus de flota
│
├── RECURSOS HUMANOS ......... Asistencia (PILOTO) · Personal · CTS
│
├── IMAGEN INSTITUCIONAL ..... (comunicación / redes)
│
├── FINANZAS ................. Deudas · Compras
│
├── PROVEEDORES ............. Portal de Proveedores
│
└── PLANIFICACIÓN ........... Plan Mensual
```

Cada bloque es un **área**. Las carpetas del repo siguen exactamente esta estructura, así que el código y el organigrama coinciden.

## 3. Identidad y permisos (cómo funciona el acceso)

La persona inicia sesión con **correo y contraseña** (Firebase Auth). Su documento en `usuarios/{uid}` guarda:

```
{ nombre, email, tipo: "administrativo"|"conductor", areas: ["rrhh", ...], activo: true }
```

Al entrar, el portal lee ese documento y **muestra solo los módulos de sus áreas**. Si tienes `["admin"]`, ves todo. El selector "Conductor / Administrativo" del login es **solo informativo**: aunque alguien elija otra opción, sus permisos reales salen de la base, no del botón. Y como refuerzo, las **reglas de Firestore** (`migracion/firestore.rules`) impiden que alguien lea datos de un área que no le toca aunque intente saltarse la pantalla.

Esto resuelve dos hallazgos de la auditoría: ya **no hay DNIs/PINs en el código** (problema de datos personales) y el acceso a datos queda **cerrado por defecto** (problema de reglas abiertas).

## 4. Por qué es escalable

- **Monorepo**: todo en una carpeta/repositorio. Un solo lugar que clonar, versionar y, el día de mañana, transferir a una organización.
- **Código compartido factorizado**: marca, login y conexión a datos no se repiten en cada app.
- **Catálogo declarativo de módulos** (`portal.js`): sumar un aplicativo nuevo es añadir una entrada; aparece solo a quien tiene el área.
- **Sin paso de compilación**: HTML/CSS/JS plano, hospedable gratis (GitHub Pages o Firebase Hosting). No te atas a herramientas ni a costos.
- **Una base de datos con áreas**: las colecciones están separadas por área y protegidas por reglas; crece por módulos sin rehacer la base.
- **Secretos fuera del cliente**: el patrón es que toda clave de pago (ej. la de voz de Salvador IA) va detrás de un proxy, nunca en el HTML.

## 5. Migración de datos (que la información actual "se jale" al nuevo sistema)

La carpeta `migracion/` trae los scripts. El flujo es:

1. Creas el proyecto Firebase nuevo (gratis) y subes las reglas.
2. `usuarios-seed.js` da de alta a las personas con correo/contraseña y su área.
3. `migrar-firestore.js` copia los datos de cada proyecto Firebase viejo al nuevo, **conservando los IDs** (re-ejecutar no duplica).
4. `migrar-sheets.js` importa los aplicativos que hoy viven en Google Sheets (publicas la hoja como CSV y el script la sube a Firestore).

Es una migración **única** por fuente (lo correcto: mover el dato una vez y dejar de usar el origen viejo). Si necesitas convivencia temporal, los scripts se pueden volver a correr para re-sincronizar mientras apagas lo antiguo.

## 6. Salir de tu cuenta personal → organización y dominio

Ruta recomendada, por etapas, sin rehacer nada:

1. **Ahora**: monorepo bajo tu cuenta `mateobartra-arch`, hospedaje GitHub Pages, Firebase plan gratuito. Cero costo.
2. **Organización GitHub** (gratis): crear una *organization* tipo `misagi-sac` y **transferir el repositorio** ahí (Settings → Transfer). Conserva historial y enlaces. Así el código deja de figurar a tu nombre y otros pueden colaborar con permisos.
3. **Dominio propio**: comprar p. ej. `misagi.com` (o `.pe`) y apuntarlo a GitHub Pages **o** a Firebase Hosting (ambos dan HTTPS gratis con dominio propio). Firebase Hosting integra mejor si ya usas Firebase para datos.
4. **Correos corporativos**: con el dominio, usar `nombre@misagi.com` para los usuarios del sistema (coincide con los correos de `usuarios-seed.js`).

Nada de esto obliga a cambiar el código: solo cambia *dónde* vive el repo y *qué dirección* lo sirve. Por eso conviene partir ya con el monorepo.

> Nota: crear cuentas (GitHub Org, Firebase), comprar dominios y generar claves de servicio son pasos que debes hacer tú desde tus consolas; yo te dejo el código, las reglas y los scripts listos, y te guío en cada paso.

## 7. Repos actuales: qué hacer con cada uno

- **Borrar**: `TIKTOK` (vacío) y los que ya no uses.
- **Migrar y luego archivar** (no borrar hasta verificar datos): MISASI-S.A.C., CTS, REGISTRO_COMPRAS, MANTENIMIENTO_LLANTAS, PLAN-MENSUAL, SEGUIMIENTO-DE-UNIDADES-MSG, TRACKER, MISAGI-ASISTENCIA, RRHH, misagi-deudas, PROGRAMACION-, MANTENIMIENTO-STATUS, PORTALPROVEEEDOR, Salvador_IA.
- **Acción de seguridad inmediata, independiente de la migración**: rotar la clave de ElevenLabs de `Salvador_IA` (está publicada).

Recomendación: archiva (no borres) los repos viejos hasta confirmar que sus datos ya están en el sistema nuevo y funcionando. GitHub permite *Archive* (solo lectura) sin perder nada.

## 8. Roadmap sugerido

1. **Fundación + Asistencia** (esta entrega) → configurar Firebase y probar el login por rol de punta a punta.
2. Migrar **Mantenimiento** (estatus + llantas + mantenimiento) — área con varios aplicativos parecidos, buen segundo paso.
3. Migrar **Operaciones** (programación + seguimiento + tracker).
4. Migrar **Finanzas** y **RRHH** (personal, CTS).
5. **Proveedores** (ya usa Auth, fácil de adaptar) y **Planificación**.
6. **Salvador IA** como asistente transversal sobre la base ya unificada.
7. Transferir a organización + dominio propio.
