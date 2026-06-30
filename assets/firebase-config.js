/* ==========================================================================
   MISAGI S.A.C. — Configuración Firebase ÚNICA (un solo proyecto para todo)
   --------------------------------------------------------------------------
   NOTA: la apiKey de Firebase web NO es un secreto (es pública por diseño).
   La seguridad real la dan las Security Rules en migracion/firestore.rules.
   ========================================================================== */
const MISAGI_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBQ4iUBB2DtSvypY3oDhMjRsneFdy2Qu3k",
  authDomain: "misagi-sistema.firebaseapp.com",
  projectId: "misagi-sistema",
  storageBucket: "misagi-sistema.firebasestorage.app",
  messagingSenderId: "114421817183",
  appId: "1:114421817183:web:7d965f273fdf347aee60ea"
};

// Inicializa Firebase (SDK compat cargado por <script> en cada página).
if (typeof firebase !== "undefined" && !firebase.apps.length) {
  firebase.initializeApp(MISAGI_FIREBASE_CONFIG);
}

// ---- App Check (protege la base del abuso externo con tu apiKey pública) ----
// 1) Consola Firebase > App Check > registra la app web con reCAPTCHA v3.
// 2) Copia la CLAVE DE SITIO (site key) de reCAPTCHA v3 y pégala abajo.
// 3) Cuando funcione, activa "Enforce" en Firestore y Storage.
// Mientras esté vacío, App Check queda INACTIVO y nada se rompe.
const MISAGI_APPCHECK_SITE_KEY = "";  // <-- pega aquí tu site key reCAPTCHA v3
if (MISAGI_APPCHECK_SITE_KEY && typeof firebase !== "undefined" && firebase.appCheck) {
  try { firebase.appCheck().activate(MISAGI_APPCHECK_SITE_KEY, true); }
  catch (e) { console.warn("App Check no se pudo activar:", e && e.message); }
}
