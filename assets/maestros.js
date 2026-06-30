/* ==========================================================================
   MISAGI — Maestros compartidos (única fuente de verdad).
   --------------------------------------------------------------------------
   Cualquier módulo puebla sus desplegables y DERIVA datos (tipo, estado…)
   desde aquí. Regla: si algo no está en el maestro, no aparece ni se deriva.

   Entidades maestras:
     • Unidades  (operaciones/modulo=unidades)  — clave: PLACA (AAA-000)
     • Personas  (personas)                      — clave: DNI
   Helpers de consulta:
     unidades(), conductores(), personas()
     mapaUnidades()  -> { PLACA: {…} }     infoUnidad(placa)
     mapaPersonas()  -> { DNI: {…} }       infoPersona(dni)
     opciones(fuente) -> [string]          (solo activos / no-baja)
   ========================================================================== */
(function (global) {
  var fx = function () { return firebase.firestore(); };
  var cache = {};

  function unidades() {
    if (cache.unidades) return Promise.resolve(cache.unidades);
    return fx().collection("operaciones").where("modulo", "==", "unidades").get().then(function (s) {
      cache.unidades = s.docs.map(function (d) { return d.data(); })
        .sort(function (a, b) { return String(a.placa || "").localeCompare(String(b.placa || "")); });
      return cache.unidades;
    }).catch(function () { return []; });
  }
  function personas() {
    if (cache.personas) return Promise.resolve(cache.personas);
    return fx().collection("personas").get().then(function (s) {
      var arr = s.docs.map(function (d) { return d.data(); });
      if (!arr.length) {
        return fx().collection("roster_conductores").get().then(function (s2) {
          cache.personas = s2.docs.map(function (d) { var o = d.data(); o.tipo = o.tipo || "conductor"; return o; });
          return cache.personas;
        }).catch(function () { cache.personas = []; return cache.personas; });
      }
      cache.personas = arr.sort(function (a, b) { return String(a.nombre || "").localeCompare(String(b.nombre || "")); });
      return cache.personas;
    }).catch(function () { return []; });
  }
  function conductores() {
    if (cache.conductores) return Promise.resolve(cache.conductores);
    return personas().then(function (a) { cache.conductores = a.filter(function (p) { return String(p.tipo || "conductor").toLowerCase() === "conductor"; }); return cache.conductores; });
  }

  // ---- Normalizadores de clave (para que los joins nunca fallen) ----
  function normPlaca(p) {
    var v = String(p == null ? "" : p).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length === 6) v = v.slice(0, 3) + "-" + v.slice(3);
    return v;
  }
  function esBaja(u) { return String((u && u.estado) || "Operativo").toLowerCase() === "baja"; }

  // ---- Mapas de consulta (clave normalizada) ----
  function mapaUnidades() {
    return unidades().then(function (a) { var m = {}; a.forEach(function (u) { if (u.placa) m[normPlaca(u.placa)] = u; }); return m; });
  }
  function mapaPersonas() {
    return personas().then(function (a) { var m = {}; a.forEach(function (p) { if (p.dni) m[String(p.dni)] = p; }); return m; });
  }
  function infoUnidad(placa) { return mapaUnidades().then(function (m) { return m[normPlaca(placa)] || null; }); }
  function infoPersona(dni) { return mapaPersonas().then(function (m) { return m[String(dni)] || null; }); }

  // ---- Desplegables: SOLO activos (excluye unidades de baja) ----
  function opciones(fuente) {
    if (fuente === "unidades") return unidades().then(function (a) { return a.filter(function (u) { return !esBaja(u); }).map(function (u) { return u.placa; }).filter(Boolean); });
    if (fuente === "conductores") return conductores().then(function (a) { return a.filter(function (c) { return c.activo !== false; }).map(function (c) { return c.nombre; }).filter(Boolean); });
    if (fuente === "personas") return personas().then(function (a) { return a.filter(function (c) { return c.activo !== false; }).map(function (c) { return c.nombre; }).filter(Boolean); });
    return Promise.resolve([]);
  }

  function limpiarCache() { cache.unidades = cache.personas = cache.conductores = null; }

  global.MISAGI_MAESTROS = {
    unidades: unidades, conductores: conductores, personas: personas,
    mapaUnidades: mapaUnidades, mapaPersonas: mapaPersonas,
    infoUnidad: infoUnidad, infoPersona: infoPersona,
    normPlaca: normPlaca, opciones: opciones, limpiarCache: limpiarCache, _cache: cache
  };
})(window);
