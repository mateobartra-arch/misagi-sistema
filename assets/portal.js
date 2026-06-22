/* ==========================================================================
   MISAGI S.A.C. — Lógica del Portal (menú dinámico por rol)
   --------------------------------------------------------------------------
   Catálogo único de módulos. Para agregar un módulo nuevo basta con añadir
   una entrada aquí: aparecerá automáticamente para quien tenga el área.
   estado: 'activo' (enlaza al módulo) | 'proximamente' (deshabilitado).
   ========================================================================== */
const MISAGI_MODULOS = [
  {
    area: "operaciones", grupo: "Flota · Operaciones", icono: "🚚",
    apps: [
      { nombre: "Programación",        url: "flota/operaciones/programacion/", estado: "activo"      , desc: "Programación de vehículos" },
      { nombre: "Seguimiento",         url: "flota/operaciones/seguimiento/",  estado: "activo"      , desc: "Seguimiento de unidades" },
      { nombre: "Tracker",             url: "flota/operaciones/tracker/",       estado: "activo"      , desc: "Seguimiento de conductores" }
    ]
  },
  {
    area: "mantenimiento", grupo: "Flota · Mantenimiento", icono: "🔧",
    apps: [
      { nombre: "Mantenimiento",       url: "flota/mantenimiento/mantenimiento/", estado: "activo"      , desc: "Órdenes de mantenimiento" },
      { nombre: "Llantas",             url: "flota/mantenimiento/llantas/",       estado: "activo"      , desc: "Inspección de neumáticos" },
      { nombre: "Estatus de flota",    url: "flota/mantenimiento/estatus/",       estado: "activo"      , desc: "Estado general de la flota" }
    ]
  },
  {
    area: "rrhh", grupo: "Recursos Humanos", icono: "👥",
    apps: [
      { nombre: "Asistencia",          url: "rrhh/asistencia/",  estado: "activo",       desc: "Marcaje de entrada/salida" },
      { nombre: "Personal (RRHH)",     url: "rrhh/personal/",    estado: "activo"      , desc: "Legajos del personal" },
      { nombre: "CTS",                 url: "rrhh/cts/",         estado: "activo"      , desc: "Liquidación de CTS" }
    ]
  },
  {
    area: "imagen", grupo: "Imagen Institucional", icono: "📣",
    apps: [
      { nombre: "Imagen Institucional", url: "imagen-institucional/", estado: "activo"      , desc: "Comunicación y redes" }
    ]
  },
  {
    area: "finanzas", grupo: "Finanzas", icono: "💰",
    apps: [
      { nombre: "Deudas",  url: "finanzas/deudas/",  estado: "activo"      , desc: "Control de deudas" },
      { nombre: "Compras", url: "finanzas/compras/", estado: "activo"      , desc: "Registro de compras" }
    ]
  },
  {
    area: "proveedores", grupo: "Proveedores", icono: "🏭",
    apps: [
      { nombre: "Portal de Proveedores", url: "proveedores/", estado: "activo"      , desc: "Registro y gestión de proveedores" }
    ]
  },
  {
    area: "planificacion", grupo: "Planificación", icono: "🗓️",
    apps: [
      { nombre: "Plan Mensual", url: "planificacion/", estado: "activo"      , desc: "Plan de trabajo mensual" }
    ]
  }
];

function renderMenu(perfil) {
  const cont = document.getElementById("menu");
  cont.innerHTML = "";
  const visibles = MISAGI_MODULOS.filter(g => MISAGI.puedeVer(perfil, g.area));
  if (!visibles.length) {
    cont.innerHTML = '<p class="msg-alert error">No tienes módulos asignados. Contacta al administrador.</p>';
    return;
  }
  visibles.forEach(g => {
    const sec = document.createElement("section");
    sec.className = "grupo";
    sec.innerHTML = `<h2>${g.icono} ${g.grupo}</h2>`;
    const grid = document.createElement("div");
    grid.className = "grid";
    g.apps.forEach(app => {
      const activo = app.estado === "activo";
      const card = document.createElement(activo ? "a" : "div");
      card.className = "app-card" + (activo ? "" : " disabled");
      if (activo) {
        card.href = MISAGI.ROOT + app.url;
        card.setAttribute("aria-label", `Abrir ${app.nombre}: ${app.desc}`);
      } else {
        card.setAttribute("aria-disabled", "true");
        card.setAttribute("title", "Módulo en construcción");
      }
      card.innerHTML = `
        <div class="app-top"><span class="app-icon" aria-hidden="true">${g.icono}</span><span class="app-name">${app.nombre}</span></div>
        <div class="app-desc">${app.desc}</div>
        ${activo ? '<div class="app-tag">Abrir →</div>' : '<span class="pill-soon">Próximamente</span>'}`;
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    cont.appendChild(sec);
  });
}
