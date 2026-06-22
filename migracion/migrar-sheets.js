/* ==========================================================================
   MISAGI S.A.C. — Migración Google Sheets -> Firestore (proyecto NUEVO)
   --------------------------------------------------------------------------
   Para los aplicativos que hoy usan Google Apps Script + Sheets
   (MISASI-S.A.C., CTS, REGISTRO_COMPRAS, MANTENIMIENTO_LLANTAS, PLAN-MENSUAL,
   SEGUIMIENTO, TRACKER). Lee la hoja publicada como CSV y la sube a Firestore.

   Cómo obtener el CSV de una hoja:
     Google Sheets > Archivo > Compartir > Publicar en la web >
       elige la hoja, formato "Valores separados por comas (.csv)" > Publicar.
     Copia esa URL (termina en  /pub?gid=...&single=true&output=csv ).

   USO:
     1) npm install firebase-admin
     2) destino-key.json = clave de servicio del proyecto nuevo
     3) Ajusta FUENTES abajo y ejecuta:  node migrar-sheets.js
   ========================================================================== */
const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.cert(require("./destino-key.json")) });
const db = admin.firestore();

const FUENTES = [
  // { url: "https://docs.google.com/.../pub?gid=0&single=true&output=csv", coleccion: "finanzas", modulo: "compras" },
  // { url: "https://docs.google.com/.../pub?gid=0&single=true&output=csv", coleccion: "rrhh", modulo: "cts" },
];

function parseCSV(texto) {
  const filas = texto.trim().split(/\r?\n/).map(l => l.split(",").map(c => c.replace(/^"|"$/g, "")));
  const cabe = filas.shift();
  return filas.map(f => Object.fromEntries(cabe.map((h, i) => [h.trim() || ("col" + i), (f[i] || "").trim()])));
}

async function importar({ url, coleccion, modulo }) {
  const res = await fetch(url);                 // Node 18+ trae fetch
  if (!res.ok) throw new Error("No se pudo leer la hoja: " + res.status);
  const filas = parseCSV(await res.text());
  console.log(`\n${modulo} -> ${coleccion}: ${filas.length} filas`);
  let lote = db.batch(), cont = 0;
  for (const fila of filas) {
    lote.set(db.collection(coleccion).doc(), { ...fila, modulo, _origen: "sheets" });
    if (++cont === 400) { await lote.commit(); lote = db.batch(); cont = 0; }
  }
  if (cont) await lote.commit();
  console.log("   importadas:", filas.length);
}

(async function run() {
  if (!FUENTES.length) { console.log("Agrega tus hojas en FUENTES y vuelve a ejecutar."); process.exit(0); }
  for (const f of FUENTES) await importar(f);
  console.log("\nImportación completa.");
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
