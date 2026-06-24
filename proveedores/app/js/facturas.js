/**
 * js/facturas.js
 * Módulo UI completo para la sección "Facturación"
 * Sube PDF/XML a Storage, guarda metadata en Firestore.
 * MISAGI S.A.C. — Portal de Proveedores
 */

import { addFactura, getFacturas, updateFactura } from "./firestore.js";
import { uploadFile, buildStoragePath, validateFile } from "./storage.js";
import { showToast, formatDate, formatCurrency, escapeHtml } from "./ui.js";

/* ======================================================================
   ESTADO LOCAL
   ====================================================================== */
let facturasList    = [];
let idEmpresaActual = null;
let filtroActual    = "todos";

/* ======================================================================
   PUNTO DE ENTRADA
   ====================================================================== */
export async function initFacturas(idEmpresa) {
  idEmpresaActual = idEmpresa;
  await cargarYRenderizar();
  bindEventos();
}

/* ======================================================================
   CARGA
   ====================================================================== */
async function cargarYRenderizar() {
  mostrarLoader(true);
  try {
    facturasList = await getFacturas(idEmpresaActual);
    actualizarContadores();
    renderTabla(filtrarLista(facturasList, filtroActual));
  } catch (err) {
    console.error("Error cargando facturas:", err);
    showToast("Error al cargar facturas.", "error");
  } finally {
    mostrarLoader(false);
  }
}

/* ======================================================================
   FILTROS
   ====================================================================== */
function filtrarLista(lista, filtro) {
  // Auto-actualizar estado a "vencido" en el frontend si aplica
  const ahora = new Date();
  lista.forEach(f => {
    if (f.estado === "pendiente" && f.tiempos?.fecha_vencimiento) {
      const venc = f.tiempos.fecha_vencimiento?.toDate
        ? f.tiempos.fecha_vencimiento.toDate()
        : new Date(f.tiempos.fecha_vencimiento);
      if (venc < ahora) f._vencida = true;
    }
  });

  if (filtro === "todos") return lista;
  if (filtro === "vencidas") return lista.filter(f => f._vencida || f.estado === "vencido");
  return lista.filter(f => f.estado === filtro);
}

function actualizarContadores() {
  const ahora  = new Date();
  const pend   = facturasList.filter(f => f.estado === "pendiente" && !estaVencida(f, ahora)).length;
  const pagadas = facturasList.filter(f => f.estado === "pagado").length;
  const venc   = facturasList.filter(f => f._vencida || f.estado === "vencido" || estaVencida(f, ahora)).length;

  setText("cnt-todos",    facturasList.length);
  setText("cnt-pendiente", pend);
  setText("cnt-pagado",    pagadas);
  setText("cnt-vencidas",  venc);

  // Actualizar KPI del dashboard si existe
  const kpi = document.getElementById("kpiFacturas");
  if (kpi) kpi.textContent = pend;
}

function estaVencida(f, ahora) {
  if (!f.tiempos?.fecha_vencimiento) return false;
  const venc = f.tiempos.fecha_vencimiento?.toDate
    ? f.tiempos.fecha_vencimiento.toDate()
    : new Date(f.tiempos.fecha_vencimiento);
  return venc < ahora && f.estado !== "pagado";
}

/* ======================================================================
   RENDER TABLA
   ====================================================================== */
function renderTabla(lista) {
  const tbody = document.getElementById("facturasBody");
  const empty = document.getElementById("facturasEmpty");
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  tbody.innerHTML = lista.map(f => {
    const montoFmt  = formatCurrency(parseFloat(f.monto_total ?? 0), f.moneda ?? "PEN");
    const vencBadge = badgeVencimiento(f);
    const estadoBadge = badgeEstado(f);

    const archivos = `
      ${f.archivos?.pdf_url
        ? `<a href="${f.archivos.pdf_url}" target="_blank" class="btn-icon" title="Descargar PDF" style="text-decoration:none;">📄</a>`
        : `<span style="color:var(--text-muted);font-size:0.75rem;">Sin PDF</span>`}
      ${f.archivos?.xml_url
        ? `<a href="${f.archivos.xml_url}" target="_blank" class="btn-icon" title="Descargar XML" style="text-decoration:none;">📋</a>`
        : ""}
    `;

    return `
    <tr>
      <td>
        <div class="cell-name">${escapeHtml(f.numero_factura ?? "—")}</div>
        <div class="cell-sub">${formatDate(f.tiempos?.fecha_carga)}</div>
      </td>
      <td>
        <div style="font-weight:700;color:var(--text-primary);">${escapeHtml(montoFmt)}</div>
        <div class="cell-sub">${escapeHtml(f.moneda ?? "PEN")}</div>
      </td>
      <td>${escapeHtml(String(f.tiempos?.dias_credito ?? "—"))} días</td>
      <td>${vencBadge}</td>
      <td>${estadoBadge}</td>
      <td><div style="display:flex;align-items:center;gap:4px;">${archivos}</div></td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" title="Ver detalle" data-action="detalle" data-id="${f.id}">👁️</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

/* ======================================================================
   BADGES
   ====================================================================== */
function badgeVencimiento(f) {
  const fvenc = f.tiempos?.fecha_vencimiento;
  if (!fvenc) return `<span class="expiry-badge expiry-badge--none">—</span>`;
  const fecha = fvenc?.toDate ? fvenc.toDate() : new Date(fvenc);
  const dias  = Math.floor((fecha - new Date()) / (1000 * 60 * 60 * 24));
  if (f.estado === "pagado") return `<span class="expiry-badge expiry-badge--ok">✅ ${formatDate(fvenc)}</span>`;
  if (dias < 0)    return `<span class="expiry-badge expiry-badge--expired">🔴 ${formatDate(fvenc)}</span>`;
  if (dias <= 7)   return `<span class="expiry-badge expiry-badge--warning">🟡 ${formatDate(fvenc)} (${dias}d)</span>`;
  return              `<span class="expiry-badge expiry-badge--ok">🟢 ${formatDate(fvenc)}</span>`;
}

function badgeEstado(f) {
  const estado = f._vencida && f.estado !== "pagado" ? "vencido" : (f.estado ?? "pendiente");
  const map = {
    pendiente:   `<span class="badge badge--warning">⏳ Pendiente</span>`,
    en_revision: `<span class="badge badge--info">🔍 En revisión</span>`,
    pagado:      `<span class="badge badge--success">✅ Pagado</span>`,
    vencido:     `<span class="badge badge--danger">🔴 Vencido</span>`,
  };
  return map[estado] ?? `<span class="badge badge--info">${escapeHtml(estado)}</span>`;
}

/* ======================================================================
   EVENTOS
   ====================================================================== */
function bindEventos() {
  const section = document.getElementById("section-facturacion");
  if (section?.dataset.bound === "1") return;
  if (section) section.dataset.bound = "1";

  // Botón subir factura
  document.getElementById("btnSubirFactura")
    ?.addEventListener("click", abrirModalSubir);

  // Delegación tabla
  document.getElementById("facturasBody")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (btn?.dataset.action === "detalle") abrirDetalle(btn.dataset.id);
    });

  // Filtros tabs
  document.querySelectorAll(".factura-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".factura-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      filtroActual = tab.dataset.filtro;
      renderTabla(filtrarLista(facturasList, filtroActual));
    });
  });

  // Búsqueda
  document.getElementById("buscarFactura")
    ?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const base = filtrarLista(facturasList, filtroActual);
      renderTabla(q
        ? base.filter(f => f.numero_factura?.toLowerCase().includes(q))
        : base
      );
    });

  // Modal subir — cerrar
  document.getElementById("modalFacturaBackdrop")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "modalFacturaBackdrop") cerrarModalSubir();
    });
  document.getElementById("btnCerrarModalFactura")?.addEventListener("click", cerrarModalSubir);
  document.getElementById("btnCancelarFactura")?.addEventListener("click", cerrarModalSubir);
  document.getElementById("formFactura")?.addEventListener("submit", subirFactura);

  // Modal detalle — cerrar
  document.getElementById("modalDetalleBackdrop")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "modalDetalleBackdrop") cerrarDetalle();
    });
  document.getElementById("btnCerrarDetalle")?.addEventListener("click", cerrarDetalle);

  // Calcular fecha vencimiento automáticamente
  ["f_fecha_emision", "f_dias_credito"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", calcularFechaVenc);
  });

  // Preview nombre de archivos
  document.getElementById("f_pdf")?.addEventListener("change", (e) => {
    setText("f_pdf_name", e.target.files[0]?.name ?? "");
  });
  document.getElementById("f_xml")?.addEventListener("change", (e) => {
    setText("f_xml_name", e.target.files[0]?.name ?? "");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { cerrarModalSubir(); cerrarDetalle(); }
  });
}

/* ======================================================================
   MODAL SUBIR FACTURA
   ====================================================================== */
function abrirModalSubir() {
  document.getElementById("formFactura")?.reset();
  setText("f_pdf_name", "");
  setText("f_xml_name", "");
  ocultarProgress();
  document.getElementById("modalFacturaBackdrop").classList.add("open");
  document.getElementById("f_numero")?.focus();
}

function cerrarModalSubir() {
  document.getElementById("modalFacturaBackdrop").classList.remove("open");
}

function calcularFechaVenc() {
  const fechaVal = document.getElementById("f_fecha_emision")?.value;
  const dias     = parseInt(document.getElementById("f_dias_credito")?.value ?? "0");
  if (!fechaVal || !dias) return;
  const fecha = new Date(fechaVal + "T00:00:00");
  fecha.setDate(fecha.getDate() + dias);
  const vencEl = document.getElementById("f_fecha_vencimiento");
  if (vencEl) vencEl.value = fecha.toISOString().split("T")[0];
}

/* ======================================================================
   SUBIR FACTURA → STORAGE + FIRESTORE
   ====================================================================== */
async function subirFactura(e) {
  e.preventDefault();
  if (!validarFormFactura()) return;

  const btn = document.getElementById("btnGuardarFactura");
  btn.disabled    = true;
  btn.textContent = "Subiendo...";
  mostrarProgress(0);

  const pdfFile = document.getElementById("f_pdf").files[0];
  const xmlFile = document.getElementById("f_xml").files[0];

  // Validar archivos
  const valPdf = validateFile(pdfFile, ["application/pdf"], 20);
  if (!valPdf.valid) {
    showToast(valPdf.error, "error");
    btn.disabled = false; btn.textContent = "Subir Factura";
    ocultarProgress();
    return;
  }
  if (xmlFile) {
    const valXml = validateFile(xmlFile, ["text/xml","application/xml"], 5);
    if (!valXml.valid) {
      showToast(valXml.error, "error");
      btn.disabled = false; btn.textContent = "Subir Factura";
      ocultarProgress();
      return;
    }
  }

  try {
    // Subir PDF (obligatorio)
    const pathPdf = buildStoragePath("facturas", idEmpresaActual, pdfFile.name);
    mostrarProgress(5, "Subiendo PDF...");
    const pdfUrl = await uploadFile(pdfFile, pathPdf, (p) => mostrarProgress(Math.round(p * 0.6), "Subiendo PDF..."));

    // Subir XML (opcional)
    let xmlUrl = null;
    if (xmlFile) {
      const pathXml = buildStoragePath("facturas", idEmpresaActual, xmlFile.name);
      mostrarProgress(65, "Subiendo XML...");
      xmlUrl = await uploadFile(xmlFile, pathXml, (p) => mostrarProgress(65 + Math.round(p * 0.25), "Subiendo XML..."));
    }

    mostrarProgress(92, "Guardando en base de datos...");

    // Construir objeto factura
    const fechaEmision   = new Date(document.getElementById("f_fecha_emision").value + "T00:00:00");
    const fechaVencValue = document.getElementById("f_fecha_vencimiento")?.value;
    const fechaVenc      = fechaVencValue ? new Date(fechaVencValue + "T00:00:00") : null;

    const facturaData = {
      numero_factura: document.getElementById("f_numero").value.trim(),
      moneda:         document.getElementById("f_moneda").value,
      monto_total:    parseFloat(document.getElementById("f_monto").value),
      archivos: {
        pdf_url:   pdfUrl,
        pdf_nombre: pdfFile.name,
        ...(xmlUrl ? { xml_url: xmlUrl, xml_nombre: xmlFile.name } : {}),
      },
      tiempos: {
        fecha_emision:    fechaEmision,
        dias_credito:     parseInt(document.getElementById("f_dias_credito").value),
        fecha_vencimiento: fechaVenc,
        fecha_carga:      new Date(),
      },
      descripcion:    document.getElementById("f_descripcion")?.value?.trim() ?? "",
      estado:         "pendiente",
      auditoria_pago: { voucher: null, comentarios: "" },
    };

    await addFactura(idEmpresaActual, facturaData);
    mostrarProgress(100, "¡Listo!");

    showToast("Factura subida correctamente.", "success");
    cerrarModalSubir();
    await cargarYRenderizar();
  } catch (err) {
    console.error("Error subiendo factura:", err);
    showToast("Error al subir la factura. Intenta de nuevo.", "error");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Subir Factura";
    setTimeout(ocultarProgress, 1500);
  }
}

/* ======================================================================
   MODAL DETALLE
   ====================================================================== */
function abrirDetalle(id) {
  const f = facturasList.find(x => x.id === id);
  if (!f) return;

  const estado = f._vencida && f.estado !== "pagado" ? "vencido" : (f.estado ?? "pendiente");
  const montoFmt = formatCurrency(parseFloat(f.monto_total ?? 0), f.moneda ?? "PEN");

  document.getElementById("detalleBody").innerHTML = `
    <div class="review-section">
      <h3 class="review-section__title">📄 Datos de la Factura</h3>
      <div class="review-grid">
        <div class="review-item"><span>N° Factura</span><strong>${escapeHtml(f.numero_factura ?? "—")}</strong></div>
        <div class="review-item"><span>Moneda</span><strong>${escapeHtml(f.moneda ?? "—")}</strong></div>
        <div class="review-item"><span>Monto Total</span><strong>${escapeHtml(montoFmt)}</strong></div>
        <div class="review-item"><span>Días de Crédito</span><strong>${escapeHtml(String(f.tiempos?.dias_credito ?? "—"))}</strong></div>
        <div class="review-item"><span>Fecha Emisión</span><strong>${formatDate(f.tiempos?.fecha_emision)}</strong></div>
        <div class="review-item"><span>Fecha Vencimiento</span><strong>${formatDate(f.tiempos?.fecha_vencimiento)}</strong></div>
        <div class="review-item"><span>Fecha de Carga</span><strong>${formatDate(f.tiempos?.fecha_carga)}</strong></div>
        <div class="review-item"><span>Estado</span><strong>${badgeEstado(f)}</strong></div>
        ${f.descripcion ? `<div class="review-item" style="grid-column:1/-1;"><span>Descripción</span><strong>${escapeHtml(f.descripcion)}</strong></div>` : ""}
      </div>
    </div>

    <div class="review-section">
      <h3 class="review-section__title">📎 Archivos Adjuntos</h3>
      <div style="display:flex;gap:0.8rem;flex-wrap:wrap;margin-top:0.5rem;">
        ${f.archivos?.pdf_url
          ? `<a href="${f.archivos.pdf_url}" target="_blank" class="btn btn-ghost" style="font-size:0.82rem;">📄 Descargar PDF</a>`
          : `<span style="color:var(--text-muted);font-size:0.85rem;">Sin PDF</span>`}
        ${f.archivos?.xml_url
          ? `<a href="${f.archivos.xml_url}" target="_blank" class="btn btn-ghost" style="font-size:0.82rem;">📋 Descargar XML</a>`
          : ""}
      </div>
    </div>

    ${estado === "pagado" ? `
    <div class="review-section">
      <h3 class="review-section__title">✅ Auditoría de Pago</h3>
      <div class="review-grid">
        ${f.auditoria_pago?.voucher
          ? `<div class="review-item" style="grid-column:1/-1;">
              <span>Voucher</span>
              <a href="${f.auditoria_pago.voucher}" target="_blank" class="btn btn-ghost" style="font-size:0.8rem;display:inline-flex;margin-top:4px;">📎 Ver Voucher</a>
            </div>`
          : ""}
        ${f.auditoria_pago?.comentarios
          ? `<div class="review-item" style="grid-column:1/-1;"><span>Comentarios</span><strong>${escapeHtml(f.auditoria_pago.comentarios)}</strong></div>`
          : ""}
        ${f.auditoria_pago?.fecha_pago
          ? `<div class="review-item"><span>Fecha de Pago</span><strong>${formatDate(f.auditoria_pago.fecha_pago)}</strong></div>`
          : ""}
      </div>
    </div>` : ""}
  `;

  document.getElementById("modalDetalleBackdrop").classList.add("open");
}

function cerrarDetalle() {
  document.getElementById("modalDetalleBackdrop").classList.remove("open");
}

/* ======================================================================
   VALIDACIÓN
   ====================================================================== */
const CAMPOS_REQ_FACT = [
  { id: "f_numero",         msg: "Ingresa el número de factura.",     test: v => v.length >= 2 },
  { id: "f_monto",          msg: "Ingresa un monto válido.",          test: v => !isNaN(v) && parseFloat(v) > 0 },
  { id: "f_fecha_emision",  msg: "Selecciona la fecha de emisión.",   test: v => v !== "" },
  { id: "f_dias_credito",   msg: "Selecciona los días de crédito.",   test: v => v !== "" },
];

function validarFormFactura() {
  let ok = true;
  document.querySelectorAll("#formFactura .form-error").forEach(el => {
    el.textContent = ""; el.classList.remove("visible");
  });
  document.querySelectorAll("#formFactura .input-error").forEach(el =>
    el.classList.remove("input-error")
  );

  CAMPOS_REQ_FACT.forEach(({ id, msg, test }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(`err-${id}`);
    if (!test(el?.value?.trim() ?? "")) {
      if (err) { err.textContent = msg; err.classList.add("visible"); }
      el?.classList.add("input-error");
      ok = false;
    }
  });

  // PDF obligatorio
  const pdfFile = document.getElementById("f_pdf")?.files[0];
  const errPdf  = document.getElementById("err-f_pdf");
  if (!pdfFile) {
    if (errPdf) { errPdf.textContent = "Debes adjuntar el archivo PDF de la factura."; errPdf.classList.add("visible"); }
    ok = false;
  }
  return ok;
}

/* ======================================================================
   BARRA DE PROGRESO
   ====================================================================== */
function mostrarProgress(pct, msg = "") {
  const wrap = document.getElementById("uploadProgressWrap");
  const bar  = document.getElementById("uploadProgressBar");
  const txt  = document.getElementById("uploadProgressText");
  if (!wrap) return;
  wrap.style.display = "block";
  if (bar) bar.style.width = `${pct}%`;
  if (txt) txt.textContent = msg || `${pct}%`;
}

function ocultarProgress() {
  const wrap = document.getElementById("uploadProgressWrap");
  if (wrap) wrap.style.display = "none";
}

/* ======================================================================
   HELPERS
   ====================================================================== */
function mostrarLoader(show) {
  const el = document.getElementById("facturasLoader");
  if (el) el.style.display = show ? "flex" : "none";
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
