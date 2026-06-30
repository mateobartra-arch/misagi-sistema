/* ==========================================================================
   MISAGI — Maestros compartidos (cache): unidades, conductores.
   Permite a cualquier módulo poblar desplegables con la misma fuente.
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
  function conductores() {
    if (cache.conductores) return Promise.resolve(cache.conductores);
    return fx().collection("roster_conductores").get().then(function (s) {
      cache.conductores = s.docs.map(function (d) { return d.data(); })
        .sort(function (a, b) { return String(a.nombre || "").localeCompare(String(b.nombre || "")); });
      return cache.conductores;
    }).catch(function () { return []; });
  }
  // Devuelve lista de strings para un desplegable
  function opciones(fuente) {
    if (fuente === "unidades") return unidades().then(function (a) { return a.map(function (u) { return u.placa; }).filter(Boolean); });
    if (fuente === "conductores") return conductores().then(function (a) { return a.map(function (c) { return c.nombre; }).filter(Boolean); });
    return Promise.resolve([]);
  }
  global.MISAGI_MAESTROS = { unidades: unidades, conductores: conductores, opciones: opciones, _cache: cache };
})(window);
