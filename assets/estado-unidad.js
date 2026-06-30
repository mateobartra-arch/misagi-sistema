/* ==========================================================================
   MISAGI — Estado automático de unidades.
   Una unidad pasa a "En mantenimiento" (fuera de servicio) si:
     • tiene una falla GRAVE / MUY GRAVE abierta (correctivo no cerrado), o
     • tiene un documento CRÍTICO vencido (SOAT, Revisión Técnica, Habilitación MTC).
   Vuelve a "Operativo" cuando ya no hay causa. Nunca toca "Baja" (manual).
   No requiere Cloud Functions: se recalcula al guardar un correctivo y al abrir
   el tablero gerencial.
   ========================================================================== */
(function (global) {
  var db = function () { return firebase.firestore(); };
  var CRIT = ["SOAT", "REVISIÓN TÉCNICA", "REVISION TECNICA", "HABILITACIÓN MTC", "HABILITACION MTC"];
  function norm(s) { return String(s == null ? "" : s).toUpperCase().trim(); }
  function normPlaca(p) {
    var v = norm(p).replace(/[^A-Z0-9]/g, "");
    if (v.length === 6) v = v.slice(0, 3) + "-" + v.slice(3);
    return v;
  }
  function diasA(v) { if (!v) return null; var h = new Date(); h.setHours(0, 0, 0, 0); var d = new Date(v + "T00:00:00"); if (isNaN(d)) return null; return Math.round((d - h) / 86400000); }

  function causa(placa, correctivos, docs) {
    var p = normPlaca(placa);
    var grave = correctivos.some(function (r) { return normPlaca(r.placa) === p && /GRAVE/i.test(r.gravedad || "") && norm(r.estado) !== "CERRADO"; });
    if (grave) return "Falla grave abierta";
    var venc = docs.some(function (d) {
      return (d.categoria === "Unidad" || d.categoria == null) && normPlaca(d.entidad) === p &&
        CRIT.indexOf(norm(d.tipo)) >= 0 && diasA(d.vencimiento) != null && diasA(d.vencimiento) < 0;
    });
    if (venc) return "Documento crítico vencido";
    return null;
  }

  // Recalcula TODA la flota. cb(err, cambios[])
  function recomputarFlota(cb) {
    Promise.all([
      db().collection("operaciones").where("modulo", "==", "unidades").get(),
      db().collection("mantenimiento").where("modulo", "==", "correctivo").get(),
      db().collection("documentos").get()
    ]).then(function (r) {
      var unidocs = r[0].docs;
      var corr = r[1].docs.map(function (d) { return d.data(); });
      var docs = r[2].docs.map(function (d) { return d.data(); });
      var batch = db().batch(), cambios = [];
      unidocs.forEach(function (ud) {
        var u = ud.data();
        if (norm(u.estado) === "BAJA") return;                 // no tocar baja manual
        var motivo = causa(u.placa, corr, docs);
        var nuevo = motivo ? "En mantenimiento" : "Operativo";
        var actual = String(u.estado || "Operativo");
        if (actual !== nuevo && (norm(actual) === "OPERATIVO" || norm(actual) === "EN MANTENIMIENTO")) {
          batch.update(ud.ref, { estado: nuevo, estado_auto: !!motivo, estado_motivo: motivo || "" });
          cambios.push({ placa: u.placa, de: actual, a: nuevo, motivo: motivo || "sin causa" });
        }
      });
      if (!cambios.length) { if (cb) cb(null, []); return; }
      batch.commit().then(function () {
        if (global.MISAGI_MAESTROS && global.MISAGI_MAESTROS.limpiarCache) global.MISAGI_MAESTROS.limpiarCache();
        if (cb) cb(null, cambios);
      }).catch(function (e) { if (cb) cb(e); });
    }).catch(function (e) { if (cb) cb(e); });
  }

  global.MISAGI_ESTADO_UNIDAD = { recomputarFlota: recomputarFlota };
})(window);
