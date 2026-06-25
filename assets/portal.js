/* ==========================================================================
   MISAGI S.A.C. — Lógica del Portal (menú dinámico por rol)
   --------------------------------------------------------------------------
   Catálogo único de módulos. Para agregar un módulo nuevo basta con añadir
   una entrada aquí: aparecerá automáticamente para quien tenga el área.
   estado: 'activo' (enlaza al módulo) | 'proximamente' (deshabilitado).
   Cada grupo tiene "ik" = icono (línea, estilo lucide) usado en sidebar y cards.
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
  chev:    "M9 6l6 6-6 6"
};
function msgIcon(name, cls) {
  return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICONS[name] || '') + '"/></svg>';
}

const MISAGI_MODULOS = [
  {
    area: "admin", grupo: "Administración", ik: "lock",
    apps: [
      { nombre: "Accesos del personal", url: "admin/accesos/", estado: "activo", desc: "Crear y gestionar los logins del equipo" }
    ]
  },
  {
    area: "operaciones", grupo: "Flota · Operaciones", ik: "truck",
    apps: [
      { nombre: "Programación", url: "flota/operaciones/programacion/", estado: "activo", desc: "Programación de vehículos" },
      { nombre: "Seguimiento",  url: "flota/operaciones/seguimiento/",  estado: "activo", desc: "Seguimiento de unidades" },
      { nombre: "Tracker",      url: "flota/operaciones/tracker/",      estado: "activo", desc: "Seguimiento de conductores" }
    ]
  },
  {
    area: "mantenimiento", grupo: "Flota · Mantenimiento", ik: "wrench",
    apps: [
      { nombre: "Estatus de flota", url: "flota/mantenimiento/estatus/", estado: "activo", desc: "Estado, llantas y mantenimiento de la flota" }
    ]
  },
  {
    area: "rrhh", grupo: "Recursos Humanos", ik: "users",
    apps: [
      { nombre: "Asistencia",      url: "rrhh/asistencia/", estado: "activo", desc: "Marcaje de entrada/salida" },
      { nombre: "Personal (RRHH)", url: "rrhh/personal/",   estado: "activo", desc: "Legajos del personal" },
      { nombre: "CTS",             url: "rrhh/cts/",        estado: "activo", desc: "Liquidación de CTS" }
    ]
  },
  {
    area: "imagen", grupo: "Imagen Institucional", ik: "mega",
    apps: [
      { nombre: "Imagen Institucional", url: "imagen-institucional/", estado: "activo", desc: "Comunicación y redes" }
    ]
  },
  {
    area: "finanzas", grupo: "Finanzas", ik: "wallet",
    apps: [
      { nombre: "Deudas",  url: "finanzas/deudas/",  estado: "activo", desc: "Control de deudas" },
      { nombre: "Compras", url: "finanzas/compras/", estado: "activo", desc: "Registro de compras" }
    ]
  },
  {
    area: "proveedores", grupo: "Proveedores", ik: "factory",
    apps: [
      { nombre: "Portal de Proveedores", url: "proveedores/", estado: "activo", desc: "Registro y gestión de proveedores" }
    ]
  },
  {
    area: "planificacion", grupo: "Planificación", ik: "cal",
    apps: [
      { nombre: "Plan Mensual", url: "planificacion/", estado: "activo", desc: "Plan de trabajo mensual" }
    ]
  }
];

/* ---- Tarjetas del contenido (filtradas por rol, enlazan a módulos reales) ---- */
function renderMenu(perfil) {
  const cont = document.getElementById("menu");
  cont.innerHTML = "";
  const visibles = MISAGI_MODULOS.filter(g => MISAGI.puedeVer(perfil, g.area));
  if (!visibles.length) {
    cont.innerHTML = '<p class="empty-msg">No tienes módulos asignados. Contacta al administrador.</p>';
    return;
  }
  visibles.forEach(g => {
    const sec = document.createElement("section");
    sec.className = "group-block";
    const n = g.apps.length;
    sec.innerHTML =
      '<div class="gh">' +
        '<span class="gi">' + msgIcon(g.ik) + '</span>' +
        '<h2>' + g.grupo + '</h2>' +
        '<span class="count">' + n + ' ' + (n > 1 ? 'módulos' : 'módulo') + '</span>' +
      '</div>';
    const cards = document.createElement("div");
    cards.className = "cards";
    g.apps.forEach(app => {
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

/* ---- Navegación lateral (mismos módulos, filtrados por rol) ---- */
function renderSidebar(perfil) {
  const nav = document.getElementById("nav");
  if (!nav) return;
  nav.innerHTML = '<a class="nav-link active" href="#top">' + msgIcon('home') + '<span>Inicio</span></a>';
  const visibles = MISAGI_MODULOS.filter(g => MISAGI.puedeVer(perfil, g.area));
  visibles.forEach(g => {
    let html = '<div class="nav-group"><div class="gl">' + msgIcon(g.ik, 'gico') + g.grupo + '</div>';
    g.apps.forEach(app => {
      const activo = app.estado === "activo";
      if (activo) {
        html += '<a class="nav-link" href="' + MISAGI.ROOT + app.url + '">' + msgIcon(g.ik) + '<span>' + app.nombre + '</span></a>';
      } else {
        html += '<span class="nav-link disabled">' + msgIcon(g.ik) + '<span>' + app.nombre + '</span></span>';
      }
    });
    html += '</div>';
    nav.insertAdjacentHTML('beforeend', html);
  });
}
