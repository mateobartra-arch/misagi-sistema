# MISAGI S.A.C. — Dossier para auditoría externa

Documento de entrega para un auditor de **arquitectura y seguridad**. Resume el sistema, qué material recibir, qué revisar y qué NO se debe compartir.

---

## 1. Qué es el sistema

Plataforma interna única (“Portal MISAGI”) que reemplaza ~14 aplicativos sueltos por **un solo portal web con login por rol y una sola base de datos**. Empresa: MISAGI S.A.C. (transporte, Perú). Usuarios: personal administrativo y conductores.

- **Frontend:** HTML/CSS/JS sin framework, servido como sitio estático.
- **Backend:** Firebase (Authentication + Cloud Firestore), un único proyecto: `misagi-sistema`.
- **Hosting (previsto):** GitHub Pages o Firebase Hosting; dominio propio a futuro.
- **Estado:** fundación + módulo piloto (Asistencia) en producción; resto de módulos funcionales sobre un motor CRUD compartido, pendientes de migrar datos reales.

---

## 2. Qué ENTREGAR al auditor

1. **Acceso de solo lectura al repositorio** del sistema nuevo (`misagi-sistema`). En GitHub: *Settings → Collaborators → Read*. No dar permisos de escritura ni admin.
2. **Estos documentos** (ya en el repo):
   - `ARQUITECTURA.md` — diseño, módulos, escalabilidad, hoja de ruta.
   - `migracion/firestore.rules` — reglas de seguridad de la base.
   - `migracion/README.md` — plan de migración de datos.
   - `README.md` — estructura y puesta en marcha.
   - Este `AUDITORIA-dossier.md`.
3. **Informe previo de análisis** de los 15 repositorios antiguos (riesgos detectados) — pídemelo y te lo adjunto como PDF.
4. **Acceso de solo lectura (rol Viewer) al proyecto Firebase** `misagi-sistema`, si el auditor necesita revisar reglas y configuración en consola. En Firebase: *Configuración → Usuarios y permisos → Agregar → rol Viewer*.
5. **Lista de los proyectos/repos antiguos** que aún operan en paralelo (para que evalúe la transición sin cortar operaciones).

## 3. Qué NO entregar (importante)

- **Claves de servicio** de Firebase (`*-key.json`, `serviceAccountKey.json`). Son secretas; el auditor no las necesita.
- **Contraseñas** de usuarios ni la del administrador.
- **Tokens / API keys de pago** (p. ej. la de ElevenLabs del antiguo `Salvador_IA`).
- Nota: la *config web* de Firebase (`assets/firebase-config.js`) **sí** puede verse; es pública por diseño. La seguridad real la dan las reglas.

---

## 4. Arquitectura (resumen)

```
Navegador (estático)  ──►  Firebase Auth  (identidad: correo+contraseña)
        │
        └──►  Cloud Firestore  (datos, una colección por área)
                 reglas: migracion/firestore.rules  (cerrado por defecto)
```

- Código compartido en `assets/`: `theme.css` (marca), `firebase-config.js`, `auth.js` (login + permisos), `portal.js` (menú por rol), `crud.js` (motor de módulos).
- Cada módulo = carpeta con su `index.html` que reutiliza `assets/`.

## 5. Modelo de datos

- Colección **`usuarios/{uid}`**: `{ nombre, email, tipo: "administrativo"|"conductor", areas: [..], activo: bool }`. El `uid` es el de Firebase Auth.
- Colecciones por área: `asistencia`, `operaciones`, `mantenimiento`, `rrhh`, `finanzas`, `proveedores`, `planificacion`, `imagen`. Dentro de cada una, el campo `modulo` distingue la sub-app.

## 6. Modelo de seguridad

- **Autenticación:** Firebase Auth (correo/contraseña).
- **Autorización:** el documento `usuarios/{uid}` define `areas`; `admin` ve todo. El selector “conductor/administrativo” del login es solo visual: el acceso real sale de la base.
- **Reglas Firestore** (`firestore.rules`): nada accesible sin sesión; cada área solo la lee/escribe quien la tiene; alta/baja de usuarios solo admin; todo lo no declarado, bloqueado.

---

## 7. Hallazgos abiertos / deuda conocida (para que el auditor verifique)

Heredados del ecosistema antiguo (en migración):

1. **Clave de ElevenLabs en texto plano** en el repo antiguo `Salvador_IA` → debe rotarse y moverse a proxy.
2. **DNIs/PINs de empleados** en el cliente del antiguo `MISAGI-ASISTENCIA` → ya resuelto en el sistema nuevo (Firebase Auth), confirmar retiro del viejo.
3. **6 proyectos Firebase antiguos** y **6 endpoints Google Apps Script `/exec`** abiertos → revisar reglas/permisos hasta apagarlos.
4. **Uso de `innerHTML`** con datos de usuario en apps antiguas → riesgo XSS.

En el sistema nuevo, a validar:
- Eficacia de `firestore.rules` (idealmente con pruebas en el emulador de Firestore).
- Que el `.gitignore` impida subir claves de servicio.
- Hosting y futura migración a organización GitHub + dominio.

## 8. Alcance sugerido de la auditoría

Pídele que se pronuncie sobre: (a) solidez de las reglas de seguridad y del modelo de roles; (b) gestión de secretos; (c) plan de migración de datos sin downtime; (d) escalabilidad de la arquitectura; (e) prácticas de despliegue (ramas, revisión, backups); (f) cumplimiento de datos personales (Ley N.° 29733 de Protección de Datos Personales, Perú).

## 9. Checklist de acceso a otorgar

- [ ] Repo `misagi-sistema`: colaborador **Read**.
- [ ] Firebase `misagi-sistema`: rol **Viewer**.
- [ ] Lista de repos/proyectos antiguos aún activos.
- [ ] Documentos de este repo (ya incluidos).
- [ ] (No) claves de servicio · (No) contraseñas · (No) API keys de pago.
