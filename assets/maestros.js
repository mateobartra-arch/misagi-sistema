/* ==========================================================================
   MISAGI — Maestros compartidos (única fuente de verdad).
   Unidades (placa) y Personas (DNI). Los módulos derivan de aquí.
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
    // Excluye externos (terceros): esos solo se usan en Programación, no en roster/combustible.
    return personas().then(function (a) { cache.conductores = a.filter(function (p) { return String(p.tipo || "conductor").toLowerCase() === "conductor" && p.externo !== true; }); return cache.conductores; });
  }

  function proveedores() {
    if (cache.proveedores) return Promise.resolve(cache.proveedores);
    return fx().collection("proveedores").get().then(function (s) {
      cache.proveedores = s.docs.map(function (d) { return d.data(); }).sort(function (a, b) { return String(a.razon || a.nombre || "").localeCompare(String(b.razon || b.nombre || "")); });
      return cache.proveedores;
    }).catch(function () { return []; });
  }
  function rutas() {
    if (cache.rutas) return Promise.resolve(cache.rutas);
    return fx().collection("operaciones").where("modulo", "==", "rutas").get().then(function (s) {
      cache.rutas = s.docs.map(function (d) { return d.data(); })
        .sort(function (a, b) { return String(a.nombre || "").localeCompare(String(b.nombre || "")); });
      return cache.rutas;
    }).catch(function () { return []; });
  }
  // Mapa razón social (cliente) -> {tarifa, moneda, igv} tomado del maestro de Rutas.
  function tarifasCliente() {
    return rutas().then(function (a) {
      var m = {};
      a.forEach(function (r) {
        if (r.activo === false) return;
        var k = String(r.cliente || "").trim().toUpperCase();
        if (k) m[k] = { tarifa: Number(r.tarifa) || 0, moneda: r.moneda || "USD", igv: (r.igv != null ? r.igv : 18) };
      });
      return m;
    });
  }
  function normPlaca(p) {
    var v = String(p == null ? "" : p).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (v.length === 6) v = v.slice(0, 3) + "-" + v.slice(3);
    return v;
  }
  function esBaja(u) { return String((u && u.estado) || "Operativo").toLowerCase() === "baja"; }

  function mapaUnidades() {
    return unidades().then(function (a) { var m = {}; a.forEach(function (u) { if (u.placa) m[normPlaca(u.placa)] = u; }); return m; });
  }
  function mapaPersonas() {
    return personas().then(function (a) { var m = {}; a.forEach(function (p) { if (p.dni) m[String(p.dni)] = p; }); return m; });
  }
  function infoUnidad(placa) { return mapaUnidades().then(function (m) { return m[normPlaca(placa)] || null; }); }
  function infoPersona(dni) { return mapaPersonas().then(function (m) { return m[String(dni)] || null; }); }

  function opciones(fuente) {
    if (fuente === "unidades") return unidades().then(function (a) { return a.filter(function (u) { return !esBaja(u); }).map(function (u) { return u.placa; }).filter(Boolean); });
    if (fuente === "conductores") return conductores().then(function (a) { return a.filter(function (c) { return c.activo !== false; }).map(function (c) { return c.nombre; }).filter(Boolean); });
    if (fuente === "proveedores") return proveedores().then(function (a) { return a.map(function (p) { return p.razon || p.nombre; }).filter(Boolean); });
    if (fuente === "rutas") return rutas().then(function (a) { return a.filter(function (r) { return r.activo !== false; }).map(function (r) { return r.nombre; }).filter(Boolean); });
    if (fuente === "personas") return personas().then(function (a) { return a.filter(function (c) { return c.activo !== false; }).map(function (c) { return c.nombre; }).filter(Boolean); });
    return Promise.resolve([]);
  }

  function limpiarCache() { cache.unidades = cache.personas = cache.conductores = cache.proveedores = cache.rutas = null; }

  global.MISAGI_MAESTROS = {
    unidades: unidades, conductores: conductores, personas: personas,
    mapaUnidades: mapaUnidades, mapaPersonas: mapaPersonas,
    infoUnidad: infoUnidad, infoPersona: infoPersona,
    normPlaca: normPlaca, proveedores: proveedores, rutas: rutas, tarifasCliente: tarifasCliente, opciones: opciones, limpiarCache: limpiarCache, _cache: cache
  };
})(window);
