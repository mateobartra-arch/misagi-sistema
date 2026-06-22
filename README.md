# MISAGI S.A.C. — Sistema de Gestión Interna

Monorepo único que reemplaza los ~14 aplicativos sueltos por **un solo portal** con **login por rol** y **una sola base de datos** (Firebase).

## ¿Qué hace?

- **Portal con login** (`index.html`): la persona elige *Administrativo* o *Conductor*, ingresa correo y contraseña, y ve **solo los módulos de su área**.
- **Menú por rol**: definido en `assets/portal.js`. Agregar un módulo nuevo = una línea ahí.
- **Una base de datos**: Firebase Auth (identidad) + Firestore (datos), un solo proyecto para todo.
- **Módulo piloto funcional**: `rrhh/asistencia/` (marcaje + reporte para admins) — ya sin DNIs/PINs en el código.

## Estructura

```
misagi-sistema/
├── index.html                  Portal + login
├── assets/                     Código COMPARTIDO por todos los módulos
│   ├── theme.css               Marca y estilos (cambiar aquí = cambia todo)
│   ├── firebase-config.js      Config del proyecto Firebase (reemplazar)
│   ├── auth.js                 Login y permisos (única fuente de verdad)
│   └── portal.js               Catálogo de módulos + menú dinámico
├── flota/
│   ├── operaciones/   programacion · seguimiento · tracker
│   └── mantenimiento/ mantenimiento · llantas · estatus
├── rrhh/              asistencia (PILOTO) · personal · cts
├── imagen-institucional/
├── finanzas/          deudas · compras
├── proveedores/
├── planificacion/
├── migracion/         scripts de migración + reglas de seguridad
├── firebase.json      Hosting + reglas
└── .gitignore         Excluye claves de servicio (¡no subir secretos!)
```

Cada módulo es una carpeta con su `index.html` que reutiliza `assets/`. Los módulos aún no migrados muestran "Próximamente" pero ya están protegidos por login.

## Áreas / permisos

`operaciones, mantenimiento, rrhh, imagen, finanzas, proveedores, planificacion` y `admin` (ve todo). El acceso lo define el documento del usuario en Firestore (`usuarios/{uid}`), **no** la opción que elige en el login (eso es solo visual).

## Puesta en marcha (resumen)

1. Crear proyecto Firebase gratis → activar Authentication (correo/contraseña) y Firestore.
2. Pegar la config en `assets/firebase-config.js`.
3. `cd migracion && npm install firebase-admin`
4. Subir reglas: `firebase deploy --only firestore:rules`
5. Crear usuarios: `node migracion/usuarios-seed.js`
6. Migrar datos: `node migracion/migrar-firestore.js` y/o `migrar-sheets.js`
7. Abrir `index.html` (o publicar con GitHub Pages / Firebase Hosting).

Detalle completo en **[`ARQUITECTURA.md`](ARQUITECTURA.md)** y **[`migracion/README.md`](migracion/README.md)**.

## Probar en local

```bash
# desde la carpeta del proyecto
python -m http.server 8000
# abrir http://localhost:8000
```
(Hace falta haber configurado Firebase para que el login funcione.)

---

## Estado actual (avance)

Los **14 módulos están activos y funcionales** sobre el backend único:
- **Asistencia** (`rrhh/asistencia/`): lógica propia (marcaje + reporte admin).
- **Los otros 13** corren sobre el motor compartido `assets/crud.js` (listar, crear, editar, borrar y buscar), cada uno con sus campos. Sus datos se guardan en la colección de su área con un campo `modulo` que distingue la sub-app.

**Único pendiente para encender todo:** pegar la config de tu proyecto Firebase en `assets/firebase-config.js` (los 3 valores `REEMPLAZAR`). Nada más cambia.
