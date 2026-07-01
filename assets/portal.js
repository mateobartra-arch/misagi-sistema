/* ==========================================================================
   MISAGI S.A.C. — Lógica del Portal (menú dinámico por rol)
   --------------------------------------------------------------------------
   Catálogo único de módulos. Cada app tiene un "id" estable: el admin elige,
   por trabajador, qué módulos ve (perfil.modulos[]). Si un usuario no tiene
   "modulos" definido, se usa el respaldo por área (perfil.areas[]).
   estado: 'activo' | 'proximamente'.   soloAdmin: true -> solo el admin.
   ========================================================================== */

/* ---- Iconos de línea (lucide-style) ---- */
const ICONS = {
  home:    "M3 10.7 12 3l9 7.7V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  lock:    "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4 M12 15v3",
  truck:   "M10 17h4V5H3v12h2 M14 9h4l3 3v5h-2 M7.5 17a2 2 0 1 0 .01 0 M17.5 17a2 2 0 1 0 .01 0",
  wrench:  "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.1 2.1-2-2z",
  users:   "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8",
  mega:    "M3 11 17 4v16L3 13z M3 11v3 M7 19l1 3 M18 7a3 3 0 0 1 0 6",
  wallet:  "M3 8h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 8l2-4h11l2 4 M17 14h.01",
  factory: "M3 21V9l6-3v3l6-3v4l6-2v13z M7 21v-3 M11 21v-3 M15 21v-3",
  cal:     "M3 5h18v16H3z M3 9h18 M8 3v4 M16 3v4",
  pin:     "M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  ext:     "M14 3h7v7 M21 3l-9 9 M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5",
  chev:    "M9 6l6 6-6 6",
  user:    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  book:    "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M9 7h7 M9 11h7",
  shield:  "M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z",
  bag:     "M6 7h12l1 13H5z M9 7a3 3 0 0 1 6 0",
  chart:   "M4 20V10 M10 20V4 M16 20v-7 M21 20H3"
};
function msgIcon(name, cls) {
  return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICONS[name] || '') + '"/></svg>';
}

const MISAGI_MODULOS = [
  {
    area: "admin", grupo: "Administración", ik: "lock",
    apps: [
      { id: "admin.gerencia", nombre: "Tablero gerencial", url: "gerencia/", estado: "activo", desc: "Indicadores de flota, costos, mantenimiento y metas" },
      { id: "admin.utilidad", nombre: "Rentabilidad / Utilidad", url: "gerencia/utilidad/", estado: "activo", desc: "Ingresos, abastecimientos, gastos y utilidad por unidad" },
      { id: "admin.accesos", nombre: "Accesos del personal", url: "admin/accesos/", estado: "activo", desc: "Crear y gestionar los logins del equipo" },
      { id: "admin.enlaces", nombre: "Accesos directos (Drive)", url: "admin/enlaces/", estado: "activo", desc: "Gestionar enlaces y quién los ve" },
      { id: "admin.alertas", nombre: "Alertas / Vencimientos", url: "alertas/", estado: "activo", desc: "Documentos, EMO, mantenimiento y correctivos por vencer" },
      { id: "admin.solicitudes", nombre: "Solicitudes", url: "admin/solicitudes/", estado: "activo", desc: "Aprobar vacaciones y cambios del personal" },
      { id: "admin.consistencia", nombre: "Consistencia de maestros", url: "admin/consistencia/", estado: "activo", desc: "Detecta placas/personas registradas fuera del maestro" },
      { id: "admin.respaldo", nombre: "Respaldo de la base", url: "admin/respaldo/", estado: "activo", desc: "Descargar toda la información del sistema" }
    ]
  },
  {
    area: "operaciones", grupo: "Flota · Operaciones", ik: "truck",
    apps: [
      { id: "operaciones.programacion", nombre: "Programación", url: "flota/operaciones/programacion/", estado: "activo", desc: "Programación de vehículos" },
      { id: "operaciones.seguimiento",  nombre: "Seguimiento",  url: "flota/operaciones/seguimiento/",  estado: "activo", desc: "Seguimiento de unidades" },
      { id: "operaciones.tracker",      nombre: "Tracker",      url: "flota/operaciones/roster-dashboard/",      estado: "activo", desc: "Dashboard de conductores por operación (nativo)" },
      { id: "operaciones.roster",       nombre: "Roster",       url: "flota/operaciones/roster/",       estado: "activo", desc: "Días trabajados por conductor" },
      { id: "operaciones.combustible",  nombre: "Combustible",  url: "flota/operaciones/combustible/",  estado: "activo", desc: "Control de combustible por unidad" },
      { id: "operaciones.gnl",          nombre: "GNL (gas)",    url: "flota/operaciones/gnl/",          estado: "activo", desc: "Abastecimiento de gas natural (GNL)" },
      { id: "operaciones.lavado",       nombre: "Lavado y engrase", url: "flota/operaciones/lavado/",    estado: "activo", desc: "Registro de lavado y engrase" },
      { id: "operaciones.checklist",    nombre: "Check list",   url: "flota/operaciones/checklist/",    estado: "activo", desc: "Check list de conductores por cliente" },
      { id: "operaciones.documentos",   nombre: "Gestión documentaria", url: "documentos/", estado: "activo", desc: "Documentos y vencimientos de unidades/conductores" },
      { id: "operaciones.ficha",        nombre: "Ficha 360°",   url: "ficha/",                          estado: "activo", desc: "Todo de una unidad o conductor en un lugar" }
    ]
  },
  {
    area: "mantenimiento", grupo: "Flota · Mantenimiento", ik: "wrench",
    apps: [
      { id: "mantenimiento.estatus", nombre: "Estatus de flota", url: "flota/mantenimiento/estatus/", estado: "activo", desc: "Estado, llantas y mantenimiento de la flota" },
      { id: "mantenimiento.correctivos", nombre: "Correctivos", url: "flota/mantenimiento/correctivos/", estado: "activo", desc: "Reporte de fallas y reparaciones" },
      { id: "mantenimiento.preventivos", nombre: "Preventivos", url: "flota/mantenimiento/preventivos/", estado: "activo", desc: "Plan preventivo por unidad (km)" }
    ]
  },
  {
    area: "operaciones", grupo: "Maestros", ik: "factory",
    apps: [
      { id: "operaciones.unidades",    nombre: "Unidades (flota)", url: "flota/operaciones/unidades/",    estado: "activo", desc: "Tractos y tolvas (maestro)" },
      { id: "operaciones.personas",    nombre: "Personas",         url: "flota/operaciones/personas/",    estado: "activo", desc: "Directorio único: conductores y administrativos" },
      { id: "operaciones.rutas",       nombre: "Rutas y tarifas",  url: "flota/operaciones/rutas/",       estado: "activo", desc: "Maestro único: rutas + tarifa por TNE (fletes) y moneda" }
    ]
  },
  {
    area: "rrhh", grupo: "Recursos Humanos", ik: "users",
    apps: [
      { id: "rrhh.asistencia", nombre: "Asistencia",      url: "rrhh/asistencia/", estado: "activo", desc: "Marcaje de entrada/salida" },
      { id: "rrhh.personal",   nombre: "Personal (RRHH)", url: "rrhh/personal/",   estado: "activo", desc: "Legajos de todo el personal" },
      { id: "rrhh.cts",        nombre: "CTS",             url: "rrhh/cts/",        estado: "activo", desc: "Liquidación de CTS del personal" },
      { id: "rrhh.documentos", nombre: "Gestión documentaria", url: "documentos/", estado: "activo", desc: "Documentos y vencimientos del personal" }
    ]
  },
  {
    area: "imagen", grupo: "Imagen Institucional", ik: "mega",
    apps: [
      { id: "imagen.institucional", nombre: "Imagen Institucional", url: "imagen-institucional/", estado: "activo", desc: "Comunicación y redes" }
    ]
  },
  {
    area: "finanzas", grupo: "Finanzas", ik: "wallet",
    apps: [
      { id: "finanzas.deudas",  nombre: "Deudas",  url: "finanzas/deudas/",  estado: "activo", desc: "Control de deudas" },
      { id: "finanzas.compras", nombre: "Compras", url: "finanzas/compras/", estado: "activo", desc: "Registro de compras" }
    ]
  },
  {
    area: "contabilidad", grupo: "Contabilidad", ik: "book",
    apps: [
      { id: "contabilidad.guias", nombre: "Resumen de guías", url: "contabilidad/guias/", estado: "activo", desc: "Sube la guía PDF y extrae los datos automáticamente" },
      { id: "contabilidad.general", nombre: "Contabilidad", url: "contabilidad/", estado: "proximamente", desc: "Libros, comprobantes y reportes" }
    ]
  },
  {
    area: "proveedores", grupo: "Proveedores", ik: "factory",
    apps: [
      { id: "proveedores.portal", nombre: "Portal de Proveedores", url: "proveedores/", estado: "activo", desc: "Registro y gestión de proveedores" }
    ]
  },
  {
    area: "planificacion", grupo: "Planificación", ik: "cal",
    apps: [
      { id: "planificacion.plan", nombre: "Plan Mensual", url: "planificacion/", estado: "activo", desc: "Plan de trabajo mensual" }
    ]
  },
  {
    area: "ssoma", grupo: "Seguridad y Salud (SSOMA)", ik: "shield",
    apps: [
      { id: "ssoma.gastos", nombre: "Gastos SSOMA", url: "ssoma/gastos/", estado: "activo", desc: "Gastos de seguridad y salud" },
      { id: "ssoma.general", nombre: "SSOMA", url: "ssoma/", estado: "proximamente", desc: "Seguridad y salud ocupacional" }
    ]
  },
  {
    area: "comercial", grupo: "Comercial", ik: "bag",
    apps: [ { id: "comercial.general", nombre: "Comercial", url: "comercial/", estado: "proximamente", desc: "Gestión comercial" } ]
  },
  {
    area: "presupuesto", grupo: "Planeamiento y Presupuesto", ik: "chart",
    apps: [ { id: "presupuesto.general", nombre: "Planeamiento", url: "presupuesto/", estado: "proximamente", desc: "Planeamiento y control presupuestal" } ]
  }
];

/* ---- "Mi espacio": autoservicio visible para TODO usuario con sesión ---- */
const MISAGI_SELF = {
  area: "self", grupo: "Mi espacio", ik: "user",
  apps: [
    { id: "self.datos",      nombre: "Mis datos",   url: "mi-espacio/#datos",      estado: "activo", desc: "Tu información y solicitar cambios" },
    { id: "self.boletas",    nombre: "Mis boletas", url: "mi-espacio/#boletas",    estado: "activo", desc: "Tus boletas de pago" },
    { id: "self.cts",        nombre: "Mi CTS",      url: "mi-espacio/#cts",        estado: "activo", desc: "Tus depósitos de CTS" },
    { id: "self.roster",     nombre: "Roster",      url: "mi-espacio/#roster",     estado: "activo", desc: "Tus días trabajados" },
    { id: "self.vacaciones", nombre: "Vacaciones",  url: "mi-espacio/#vacaciones", estado: "activo", desc: "Saldo y solicitar vacaciones" }
  ]
};

/* Lista plana de módulos asignables (sin self ni soloAdmin), para el panel de accesos. */
function modulosAsignables() {
  const out = [];
  MISAGI_MODULOS.forEach(function (g) {
    g.apps.forEach(function (a) {
      if (a.soloAdmin) return;
      out.push({ id: a.id, nombre: a.nombre, grupo: g.grupo, area: g.area, ik: g.ik });
    });
  });
  return out;
}

/* Apps visibles de un grupo según el perfil. */
function appsVisibles(grupo, perfil) {
  if (grupo.area === "self") return grupo.apps;            // autoservicio: todos
  if (MISAGI.esAdmin(perfil)) return grupo.apps;           // admin ve todo
  const porModulo = perfil && Array.isArray(perfil.modulos);
  return grupo.apps.filter(function (a) {
    if (a.soloAdmin) return false;                         // solo admin
    if (porModulo) return perfil.modulos.indexOf(a.id) >= 0;
    return MISAGI.puedeVer(perfil, grupo.area);            // respaldo por área
  });
}

/* Grupos visibles: Mi espacio (siempre) + los que tengan al menos un módulo visible. */
function gruposVisibles(perfil) {
  return [MISAGI_SELF].concat(MISAGI_MODULOS).filter(function (g) {
    return appsVisibles(g, perfil).length > 0;
  });
}

/* ---- Tarjetas del contenido ---- */
function renderMenu(perfil) {
  const cont = document.getElementById("menu");
  cont.innerHTML = "";
  gruposVisibles(perfil).forEach(function (g) {
    const apps = appsVisibles(g, perfil);
    const sec = document.createElement("section");
    sec.className = "group-block";
    const n = apps.length;
    sec.innerHTML =
      '<div class="gh">' +
        '<span class="gi">' + msgIcon(g.ik) + '</span>' +
        '<h2>' + g.grupo + '</h2>' +
        '<span class="count">' + n + ' ' + (n > 1 ? 'módulos' : 'módulo') + '</span>' +
      '</div>';
    const cards = document.createElement("div");
    cards.className = "cards";
    apps.forEach(function (app) {
      const activo = app.estado === "activo";
      const card = document.createElement(activo ? "a" : "div");
      card.className = "app-card" + (activo ? "" : " disabled");
      card.setAttribute("data-name", app.nombre.toLowerCase());
      if (activo) {
        card.href = MISAGI.ROOT + app.url;
        card.setAttribute("aria-label", "Abrir " + app.nombre + ": " + app.desc);
      } else {
        card.setAttribute("aria-disabled", "true");
        card.setAttribute("title", "Módulo en construcción");
      }
      card.innerHTML =
        '<span class="ai">' + msgIcon(g.ik) + '</span>' +
        '<span class="an">' + app.nombre + '</span>' +
        '<span class="ad">' + app.desc + '</span>' +
        (activo
          ? '<span class="go">Abrir ' + msgIcon('chev') + '</span>'
          : '<span class="soon">Próximamente</span>');
      cards.appendChild(card);
    });
    sec.appendChild(cards);
    cont.appendChild(sec);
  });
}

/* ---- Navegación lateral ---- */
function renderSidebar(perfil) {
  const nav = document.getElementById("nav");
  if (!nav) return;
  nav.innerHTML = '<a class="nav-link active" href="#top">' + msgIcon('home') + '<span>Inicio</span></a>';
  let abiertos = {};
  try { abiertos = JSON.parse(localStorage.getItem('msg_nav_open') || '{}'); } catch (e) {}
  gruposVisibles(perfil).forEach(function (g) {
    const apps = appsVisibles(g, perfil);
    const open = abiertos[g.grupo] ? ' open' : '';
    let sub = apps.map(function (app) {
      const activo = app.estado === "activo";
      return activo
        ? '<a class="nav-link" href="' + MISAGI.ROOT + app.url + '">' + msgIcon(g.ik) + '<span>' + app.nombre + '</span></a>'
        : '<span class="nav-link disabled">' + msgIcon(g.ik) + '<span>' + app.nombre + '</span></span>';
    }).join("");
    let html = '<div class="nav-group' + open + '" data-g="' + g.grupo + '">' +
      '<button class="gl" type="button">' + msgIcon(g.ik, 'gico') +
        '<span class="glname">' + g.grupo + '</span>' +
        '<span class="gcount">' + apps.length + '</span>' + msgIcon('chev', 'gchev') +
      '</button><div class="nav-sub">' + sub + '</div></div>';
    nav.insertAdjacentHTML('beforeend', html);
  });
  nav.querySelectorAll('.nav-group .gl').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const grp = btn.parentNode; grp.classList.toggle('open');
      let ab = {}; try { ab = JSON.parse(localStorage.getItem('msg_nav_open') || '{}'); } catch (e) {}
      ab[grp.getAttribute('data-g')] = grp.classList.contains('open');
      try { localStorage.setItem('msg_nav_open', JSON.stringify(ab)); } catch (e) {}
    });
  });
}
