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
