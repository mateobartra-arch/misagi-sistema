/* ==========================================================================
   MISAGI — Exportador Excel con formato de marca (encabezado + título + fecha).
   Uso:  MISAGI_XLS.descargar({ nombre:"combustible", titulo:"Control de combustible",
           columnas:["Fecha","Placa",...], filas:[[...],[...]], totales:[...opcional] });
   Genera un .xlsx real (SheetJS 0.20.3), con cabecera MISAGI, anchos de columna y
   una fila de totales opcional. Carga SheetJS bajo demanda si no está presente.
   ========================================================================== */
(function (g) {
  var CDN = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
  function ensure(cb) {
    if (g.XLSX) return cb();
    var s = document.createElement("script");
    s.src = CDN; s.onload = function () { cb(); };
    s.onerror = function () { alert("No se pudo cargar el generador de Excel."); };
    document.head.appendChild(s);
  }
  function fechaTxt() {
    try { return new Date().toLocaleString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return new Date().toISOString().slice(0, 16).replace("T", " "); }
  }
  function descargar(cfg) {
    cfg = cfg || {};
    ensure(function () {
      var XLSX = g.XLSX;
      var cols = (cfg.columnas || []).map(function (c) { return String(c); });
      var filas = (cfg.filas || []).map(function (r) { return (r || []).map(function (c) { return c == null ? "" : c; }); });
      var nc = Math.max(cols.length, 1);
      var aoa = [
        ["MISAGI S.A.C."],
        [cfg.titulo || "Reporte"],
        ["RUC 20610685847   ·   Generado: " + fechaTxt() + (cfg.subtitulo ? ("   ·   " + cfg.subtitulo) : "")],
        []
      ];
      aoa.push(cols);
      filas.forEach(function (r) { aoa.push(r); });
      if (cfg.totales && cfg.totales.length) aoa.push(cfg.totales);

      var ws = XLSX.utils.aoa_to_sheet(aoa);
      // Combinar las 3 filas de cabecera a lo ancho de todas las columnas
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: nc - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: nc - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: nc - 1 } }
      ];
      // Anchos de columna según contenido
      ws["!cols"] = cols.map(function (h, i) {
        var w = String(h).length;
        for (var k = 0; k < filas.length; k++) { var v = filas[k][i]; if (v != null) w = Math.max(w, String(v).length); }
        return { wch: Math.min(Math.max(w + 2, 10), 42) };
      });
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, String(cfg.hoja || "Reporte").slice(0, 28) || "Reporte");
      var nombre = (cfg.nombre || "reporte") + "-MISAGI.xlsx";
      XLSX.writeFile(wb, nombre);
    });
  }
  g.MISAGI_XLS = { descargar: descargar, ensure: ensure };
})(window);
