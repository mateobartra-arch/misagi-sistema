/* ==========================================================================
   MISAGI S.A.C. — Autenticación y autorización COMPARTIDA
   --------------------------------------------------------------------------
   Una sola fuente de verdad para login y permisos en todo el sistema.

   Modelo de permisos:
   - Firebase Auth (correo + contraseña) identifica a la persona.
   - Firestore  usuarios/{uid}  guarda: { nombre, tipo, areas[], activo }.
   - El "tipo" (conductor / administrativo) que la persona elige en el login
     es solo informativo para la UI; el ACCESO REAL lo determina el documento
     en la base. Así un conductor no obtiene permisos de admin por elegir otra
     opción.  La seguridad de los datos la refuerzan firestore.rules.
   ========================================================================== */
(function (global) {
  // Catálogo de áreas del sistema (debe coincidir con las carpetas/módulos)
  const AREAS = {
    operaciones:  { label: "Operaciones",          padre: "Flota" },
    mantenimiento:{ label: "Mantenimiento",        padre: "Flota" },
    rrhh:         { label: "Recursos Humanos",     padre: null },
    imagen:       { label: "Imagen Institucional", padre: null },
    finanzas:     { label: "Finanzas",             padre: null },
    contabilidad: { label: "Contabilidad",         padre: null },
    ssoma:        { label: "Seguridad y Salud (SSOMA)", padre: null },
    comercial:    { label: "Comercial",            padre: null },
    presupuesto:  { label: "Planeamiento y Presupuesto", padre: null },
    proveedores:  { label: "Proveedores",          padre: null },
    planificacion:{ label: "Planificación",        padre: null }
  };

  // Calcula la ruta a la raíz del sitio a partir de dónde está este script
  // (assets/auth.js -> raíz = un nivel arriba de assets/).
  function deriveRoot() {
    const s = document.currentScript || [...document.scripts].find(x => /auth\.js/.test(x.src));
    if (!s) return "/";
    const url = new URL(s.src, location.href);
    return url.href.replace(/assets\/auth\.js.*$/, "");
  }
  const ROOT = deriveRoot();

  const auth = () => firebase.auth();
  const db   = () => firebase.firestore();

  // Trae el documento de usuario (perfil + permisos)
  async function fetchPerfil(uid) {
    const snap = await db().collection("usuarios").doc(uid).get();
    return snap.exists ? snap.data() : null;
  }

  function esAdmin(perfil) {
    return perfil && Array.isArray(perfil.areas) && perfil.areas.includes("admin");
  }
  function puedeVer(perfil, area) {
    if (!perfil || perfil.activo === false) return false;
    if (esAdmin(perfil)) return true;
    return Array.isArray(perfil.areas) && perfil.areas.includes(area);
  }

  // Inicia sesión. `tipo` es informativo (conductor/administrativo).
  async function login(email, password) {
    const cred = await auth().signInWithEmailAndPassword(email.trim(), password);
    const perfil = await fetchPerfil(cred.user.uid);
    if (!perfil || perfil.activo === false) {
      await auth().signOut();
      throw new Error("Tu usuario no está activo. Contacta al administrador.");
    }
    return { user: cred.user, perfil };
  }

  function logout() { return auth().signOut().then(() => location.href = ROOT + "index.html"); }

  // Para páginas de módulo: exige sesión y permiso sobre un área.
  // Si no cumple, redirige al portal. Devuelve { user, perfil } si cumple.
  function requireAccess(area) {
    return new Promise((resolve) => {
      auth().onAuthStateChanged(async (user) => {
        if (!user) { location.href = ROOT + "index.html"; return; }
        const perfil = await fetchPerfil(user.uid);
        if (!puedeVer(perfil, area)) {
          alert("No tienes acceso a este módulo.");
          location.href = ROOT + "index.html";
          return;
        }
        resolve({ user, perfil });
      });
    });
  }

  // Para páginas de autoservicio (Mi espacio): exige solo sesión iniciada,
  // sin requerir un área concreta. Devuelve { user, perfil }.
  function requireLogin() {
    return new Promise((resolve) => {
      auth().onAuthStateChanged(async (user) => {
        if (!user) { location.href = ROOT + "index.html"; return; }
        const perfil = await fetchPerfil(user.uid);
        if (!perfil || perfil.activo === false) {
          await auth().signOut();
          location.href = ROOT + "index.html";
          return;
        }
        resolve({ user, perfil });
      });
    });
  }

  // Observa el estado de sesión (para el portal)
  function onUser(cb) {
    auth().onAuthStateChanged(async (user) => {
      cb(user ? { user, perfil: await fetchPerfil(user.uid) } : null);
    });
  }

  global.MISAGI = { AREAS, ROOT, login, logout, requireAccess, requireLogin, onUser, puedeVer, esAdmin, fetchPerfil };
})(window);
