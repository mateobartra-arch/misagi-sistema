/* ==========================================================================
   MISAGI S.A.C. — Alta inicial de usuarios (correo+contraseña) y perfiles
   --------------------------------------------------------------------------
   Crea cuentas en Firebase Auth y su documento en usuarios/{uid} con el área
   de acceso. Sustituye al listado de DNIs/PINs que estaba en el código (riesgo
   de seguridad). Ejecutar UNA vez para el arranque.

   USO:
     1) npm install firebase-admin
     2) Descarga la clave de servicio:
        Consola Firebase > Configuración > Cuentas de servicio > Generar clave
        privada  ->  guarda como  serviceAccountKey.json  (NO subir a GitHub).
     3) node usuarios-seed.js
   ========================================================================== */
const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.cert(require("./serviceAccountKey.json")) });
const auth = admin.auth();
const db = admin.firestore();

// Áreas válidas: operaciones, mantenimiento, rrhh, imagen, finanzas, proveedores, planificacion
// 'admin' = ve y administra TODO.
const USUARIOS = [
  { nombre: "Mateo Martín Bartra Juárez", email: "mateo@misagi.com", password: "CAMBIAR_2026", tipo: "administrativo", areas: ["admin"] },
  // Ejemplos (ajusta correos/áreas reales):
  { nombre: "Jefe de Operaciones",  email: "operaciones@misagi.com",  password: "CAMBIAR_2026", tipo: "administrativo", areas: ["operaciones"] },
  { nombre: "Jefe de Mantenimiento", email: "mantenimiento@misagi.com", password: "CAMBIAR_2026", tipo: "administrativo", areas: ["mantenimiento"] },
  { nombre: "Recursos Humanos",     email: "rrhh@misagi.com",         password: "CAMBIAR_2026", tipo: "administrativo", areas: ["rrhh", "finanzas"] },
  { nombre: "Conductor de ejemplo", email: "conductor1@misagi.com",   password: "CAMBIAR_2026", tipo: "conductor",      areas: ["rrhh"] } // solo marca asistencia
];

(async function run() {
  for (const u of USUARIOS) {
    try {
      let user;
      try { user = await auth.getUserByEmail(u.email); }
      catch { user = await auth.createUser({ email: u.email, password: u.password, displayName: u.nombre }); }
      await db.collection("usuarios").doc(user.uid).set({
        nombre: u.nombre, email: u.email, tipo: u.tipo, areas: u.areas, activo: true
      }, { merge: true });
      console.log("OK ->", u.email, "| áreas:", u.areas.join(", "));
    } catch (e) { console.error("ERROR ->", u.email, e.message); }
  }
  console.log("\nListo. Pide a cada usuario cambiar su contraseña en el primer ingreso.");
  process.exit(0);
})();
