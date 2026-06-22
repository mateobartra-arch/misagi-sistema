/* ==========================================================================
   MISAGI S.A.C. — Migración Firestore -> Firestore (proyecto viejo a NUEVO)
   --------------------------------------------------------------------------
   Copia colecciones de cada proyecto Firebase antiguo (asistencia-fe374,
   misagi-rrhh, misagi-flota, misagi-deudas, misagi-programacion,
   misagi-transportes) al proyecto ÚNICO nuevo. Idempotente: conserva el ID
   del documento, así re-ejecutar no duplica.

   USO:
     1) npm install firebase-admin
     2) Descarga DOS claves de servicio:
          - origen-key.json   (proyecto viejo)
          - destino-key.json  (proyecto nuevo)
        (Consola Firebase de cada proyecto > Cuentas de servicio)
        NO subir esos .json a GitHub (ya están en .gitignore).
     3) Ajusta COLECCIONES abajo y ejecuta:  node migrar-firestore.js
   ========================================================================== */
const admin = require("firebase-admin");

const origen  = admin.initializeApp({ credential: admin.cert(require("./origen-key.json")) },  "origen");
const destino = admin.initializeApp({ credential: admin.cert(require("./destino-key.json")) }, "destino");
const dbO = origen.firestore();
const dbD = destino.firestore();

// Mapeo: colección en el proyecto viejo  ->  colección en el nuevo.
// Puedes transformar cada documento en `map` (p.ej. normalizar campos).
const COLECCIONES = [
  { de: "asistencia", a: "asistencia", map: (d) => d },
  // { de: "marcajes",  a: "asistencia", map: (d) => ({ ...d, accion: d.tipo }) },
  // { de: "deudas",    a: "finanzas",   map: (d) => ({ ...d, modulo: "deudas" }) },
];

async function copiar({ de, a, map }) {
  const snap = await dbO.collection(de).get();
  console.log(`\n${de} -> ${a}: ${snap.size} documentos`);
  let n = 0, lote = dbD.batch(), cont = 0;
  for (const doc of snap.docs) {
    lote.set(dbD.collection(a).doc(doc.id), map(doc.data()), { merge: true });
    if (++cont === 400) { await lote.commit(); lote = dbD.batch(); cont = 0; }
    n++;
  }
  if (cont) await lote.commit();
  console.log(`   migrados: ${n}`);
}

(async function run() {
  for (const c of COLECCIONES) await copiar(c);
  console.log("\nMigración completa.");
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
