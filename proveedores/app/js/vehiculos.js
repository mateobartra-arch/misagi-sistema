/**
 * js/vehiculos.js
 * Módulo UI completo para la sección "Detalle Vehículos"
 * Soporta tipos de vehículo (Tracto/Encapsulado/Plataforma/Otro)
 * con documentos requeridos configurables por el admin.
 * MISAGI S.A.C. — Portal de Proveedores
 */

import {
  getVehiculos, addVehiculo, updateVehiculo, deleteVehiculo,
  getConfigDocumentos
} from "./firestore.js";
import { showToast, formatDate, escapeHtml } from "./ui.js";

/* ======================================================================
   CONSTANTES
   ====================================================================== */
export const TIPOS_VEHICULO = [
  { id: "tracto",      label: "Tracto" },
  { id: "encapsulado", label: "Encapsulado" },
  { id: "plataforma",  label: "Plataforma" },
  { id: "otro",        label: "Otro" },
];

const CONFIG_CONFIGS_TECNICAS = [
  "C2 — Camión simple", "C3 — Camión 3 ejes",
  "T2S2 — Tracto 4x2",  "T3S2 — Tracto 6x4", "T3S3 — Tracto 6x6",
  "T3S2R4 — Tren largo",
  "Semirremolque plataforma", "Semirremolque tolva",
  "Semirremolque furgón",     "Semirremolque cisterna",
  "Remolque", "Furgoneta", "Camioneta", "Otro",
];

/* ======================================================================
   ESTADO LOCAL
   ====================================================================== */
let vehiculosList     = [];
let idEmpresaActual   = null;
let editandoId        = null;
let configDocsCache   = {};   // { tipo: [...docs] }

/* ======================================================================
   PUNTO DE ENTRADA
   ====================================================================== */
export async function initVehiculos(idEmpresa) {
  idEmpresaActual = idEmpresa;
  await cargarYRenderizar();
  bindEventos();
}

/* ======================================================================
   CARGA DE DATOS
   ====================================================================== */
async function cargarYRenderizar() {
  mostrarLoader(true);
  try {
    vehiculosList = await getVehiculos(idEmpresaActual);
    renderTabla(vehiculosList);
  } catch (err) {
    console.error("Error cargando vehículos:", err);
    showToast("Error al cargar vehículos.", "error");
  } finally {
    mostrarLoader(false);
  }
}

/* ======================================================================
   RENDER DE TABLA
   ====================================================================== */
function renderTabla(lista) {
  const tbody = document.getElementById("vehiculosBody");
  const empty = document.getElementById("vehiculosEmpty");
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  tbody.innerHTML = lista.map(v => {
    // Recoger todos los documentos del vehículo para mostrar badges
    const docs = v.documentos ?? {};
    const badgesCols = Object.entries(docs).map(([key, val]) => `
      <td>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:2px;">${escapeHtml(key.replace(/_/g,' '))}</div>
        ${badgeVencimiento(val?.fecha_vencimiento)}
      </td>
    `).join("");

    const tipoLabel = TIPOS_VEHICULO.find(t => t.id === v.tipo_vehiculo)?.label
      ?? v.tipo_vehiculo ?? "—";
    const tipoDisplay = v.tipo_vehiculo === "otro" && v.tipo_otro
      ? `Otro: ${escapeHtml(v.tipo_otro)}`
      : tipoLabel;

    return `
    <tr>
      <td>
        <div class="cell-name">${escapeHtml(v.placa)}</div>
        <div class="cell-sub">${tipoDisplay}</div>
        <div class="cell-sub">${escapeHtml(v.configuracion_tecnica ?? "")}</div>
      </td>
      <td>${escapeHtml(v.marca ?? "—")}<br><span class="cell-sub">${escapeHtml(v.modelo ?? "")}</span></td>
      <td>${escapeHtml(String(v.anio ?? "—"))}</td>
      ${badgesCols || `<td><span class="expiry-badge expiry-badge--none">Sin docs</span></td>`}
      <td>
        <span class="badge ${v.estado === 'activo' ? 'badge--success' : 'badge--danger'}">
          ${v.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" title="Editar" data-action="editar" data-id="${v.id}">✏️</button>
          <button class="btn-icon btn-icon--danger" title="Eliminar" data-action="eliminar" data-id="${v.id}" data-placa="${escapeHtml(v.placa)}">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

/* ======================================================================
   BADGE DE VENCIMIENTO
   ====================================================================== */
function badgeVencimiento(fechaFirestore) {
  if (!fechaFirestore) return `<span class="expiry-badge expiry-badge--none">Sin fecha</span>`;
  const fecha = fechaFirestore?.toDate ? fechaFirestore.toDate() : new Date(fechaFirestore);
  const dias  = Math.floor((fecha - new Date()) / (1000 * 60 * 60 * 24));
  if (dias < 0)   return `<span class="expiry-badge expiry-badge--expired">🔴 Vencido ${formatDate(fechaFirestore)}</span>`;
  if (dias <= 30) return `<span class="expiry-badge expiry-badge--warning">🟡 ${formatDate(fechaFirestore)}</span>`;
  return               `<span class="expiry-badge expiry-badge--ok">🟢 ${formatDate(fechaFirestore)}</span>`;
}

/* ======================================================================
   DOCUMENTOS DINÁMICOS POR TIPO
   ====================================================================== */
async function cargarDocsParaTipo(tipo) {
  if (!tipo) { renderDocsForm([]); return; }
  if (!configDocsCache[tipo]) {
    configDocsCache[tipo] = await getConfigDocumentos(tipo);
  }
  renderDocsForm(configDocsCache[tipo]);
}

/** Renderiza los campos de documento dentro del modal */
function renderDocsForm(docs, valoresExistentes = {}) {
  const container = document.getElementById("vehiculoDocsContainer");
  if (!container) return;

  if (docs.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem 0;">
      Sin documentos configurados para este tipo. El admin puede agregarlos.
    </p>`;
    return;
  }

  container.innerHTML = docs
    .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99))
    .map(d => {
      const val     = valoresExistentes[d.id] ?? {};
      const requeridoBadge = d.requerido
        ? `<span class="badge badge--info" style="font-size:0.65rem;">Requerido</span>`
        : `<span class="badge badge--warning" style="font-size:0.65rem;">Opcional</span>`;

      return `
        <div class="modal-section" data-doc-id="${d.id}">
          <div class="modal-section__title" style="display:flex;align-items:center;gap:8px;">
            📄 ${escapeHtml(d.nombre)} ${requeridoBadge}
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="doc_num_${d.id}">N° / Código</label>
              <input class="form-input" type="text" id="doc_num_${d.id}"
                placeholder="Número del documento" maxlength="50"
                value="${escapeHtml(val.numero ?? '')}" />
            </div>
            ${d.con_vencimiento ? `
            <div class="form-group">
              <label class="form-label" for="doc_venc_${d.id}">Fecha de Vencimiento ${d.requerido ? '<span class="required">*</span>' : ''}</label>
              <input class="form-input" type="date" id="doc_venc_${d.id}"
                value="${toInputDate(val.fecha_vencimiento)}" />
            </div>` : `<div class="form-group"></div>`}
          </div>
        </div>`;
    }).join("");
}

/** Recolecta los valores de los campos dinámicos de documentos */
function recolectarDocs(docs) {
  const resultado = {};
  docs.forEach(d => {
    const num  = document.getElementById(`doc_num_${d.id}`)?.value?.trim() ?? "";
    const venc = d.con_vencimiento
      ? fromInputDate(document.getElementById(`doc_venc_${d.id}`)?.value ?? "")
      : null;
    resultado[d.id] = { numero: num, ...(d.con_vencimiento ? { fecha_vencimiento: venc } : {}) };
  });
  return resultado;
}

/* ======================================================================
   EVENTOS
   ====================================================================== */
function bindEventos() {
  const section = document.getElementById("section-vehiculos");
  if (section?.dataset.bound === "1") return;
  if (section) section.dataset.bound = "1";

  document.getElementById("btnAgregarVehiculo")
    ?.addEventListener("click", () => abrirModal());

  document.getElementById("vehiculosBody")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "editar")   abrirModal(btn.dataset.id);
      if (btn.dataset.action === "eliminar") abrirConfirm(btn.dataset.id, btn.dataset.placa);
    });

  document.getElementById("buscarVehiculo")
    ?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtrado = vehiculosList.filter(v =>
        v.placa.toLowerCase().includes(q) ||
        v.tipo_vehiculo?.toLowerCase().includes(q) ||
        v.tipo_otro?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q)
      );
      renderTabla(filtrado);
    });

  // Cambio de tipo → cargar docs dinámicos
  document.getElementById("v_tipo_vehiculo")
    ?.addEventListener("change", (e) => {
      const tipo = e.target.value;
      // Mostrar/ocultar campo "Otro"
      const otroGroup = document.getElementById("v_tipo_otro_group");
      if (otroGroup) otroGroup.style.display = tipo === "otro" ? "flex" : "none";
      cargarDocsParaTipo(tipo);
    });

  // Modal cerrar
  document.getElementById("modalVehiculoBackdrop")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "modalVehiculoBackdrop") cerrarModal();
    });
  document.getElementById("btnCerrarModalVehiculo")?.addEventListener("click", cerrarModal);
  document.getElementById("btnCancelarVehiculo")?.addEventListener("click", cerrarModal);
  document.getElementById("formVehiculo")?.addEventListener("submit", guardarVehiculo);

  // Confirm eliminar
  document.getElementById("btnCancelarEliminarVehiculo")?.addEventListener("click", cerrarConfirm);
  document.getElementById("btnConfirmarEliminarVehiculo")?.addEventListener("click", eliminarVehiculo);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { cerrarModal(); cerrarConfirm(); }
  });
}

/* ======================================================================
   MODAL — ALTA / EDICIÓN
   ====================================================================== */
async function abrirModal(id = null) {
  editandoId = id;
  const modal  = document.getElementById("modalVehiculoBackdrop");
  const titulo = document.getElementById("modalVehiculoTitulo");
  const form   = document.getElementById("formVehiculo");

  form.reset();
  limpiarErroresModal();
  // Ocultar campo "Otro" por default
  const otroGroup = document.getElementById("v_tipo_otro_group");
  if (otroGroup) otroGroup.style.display = "none";
  // Limpiar docs dinámicos
  const container = document.getElementById("vehiculoDocsContainer");
  if (container) container.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;padding:1rem 0;">Selecciona el tipo de vehículo para ver los documentos requeridos.</p>`;

  if (id) {
    const v = vehiculosList.find(x => x.id === id);
    if (!v) return;
    titulo.textContent = "Editar Vehículo";
    setVal("v_placa",              v.placa);
    setVal("v_tipo_vehiculo",      v.tipo_vehiculo ?? "");
    setVal("v_tipo_otro",          v.tipo_otro ?? "");
    setVal("v_configuracion_tecnica", v.configuracion_tecnica ?? "");
    setVal("v_marca",              v.marca ?? "");
    setVal("v_modelo",             v.modelo ?? "");
    setVal("v_anio",               v.anio ?? "");
    setVal("v_color",              v.color ?? "");
    setVal("v_estado",             v.estado ?? "activo");

    if (v.tipo_vehiculo) {
      if (otroGroup) otroGroup.style.display = v.tipo_vehiculo === "otro" ? "flex" : "none";
      // Cargar config y poblar con valores existentes
      if (!configDocsCache[v.tipo_vehiculo]) {
        configDocsCache[v.tipo_vehiculo] = await getConfigDocumentos(v.tipo_vehiculo);
      }
      renderDocsForm(configDocsCache[v.tipo_vehiculo], v.documentos ?? {});
    }
  } else {
    titulo.textContent = "Nuevo Vehículo";
  }

  modal?.classList.add("open");
  document.getElementById("v_placa")?.focus();
}

function cerrarModal() {
  document.getElementById("modalVehiculoBackdrop")?.classList.remove("open");
  editandoId = null;
}

/* ======================================================================
   GUARDAR
   ====================================================================== */
async function guardarVehiculo(e) {
  e.preventDefault();
  if (!validarForm()) return;

  const btn = document.getElementById("btnGuardarVehiculo");
  btn.disabled    = true;
  btn.textContent = "Guardando...";

  const tipo = getVal("v_tipo_vehiculo");
  const docs = configDocsCache[tipo] ?? [];

  const data = {
    placa:                getVal("v_placa").toUpperCase(),
    tipo_vehiculo:        tipo,
    tipo_otro:            tipo === "otro" ? getVal("v_tipo_otro") : "",
    configuracion_tecnica: getVal("v_configuracion_tecnica"),
    marca:                getVal("v_marca"),
    modelo:               getVal("v_modelo"),
    anio:                 getVal("v_anio"),
    color:                getVal("v_color"),
    estado:               getVal("v_estado"),
    documentos:           recolectarDocs(docs),
  };

  try {
    if (editandoId) {
      await updateVehiculo(editandoId, data);
      showToast("Vehículo actualizado correctamente.", "success");
    } else {
      await addVehiculo(idEmpresaActual, data);
      showToast("Vehículo registrado correctamente.", "success");
    }
    cerrarModal();
    await cargarYRenderizar();
  } catch (err) {
    console.error("Error guardando vehículo:", err);
    showToast("Error al guardar. Intenta de nuevo.", "error");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Guardar";
  }
}

/* ======================================================================
   ELIMINAR
   ====================================================================== */
let eliminandoId = null;

function abrirConfirm(id, placa) {
  eliminandoId = id;
  const el = document.getElementById("confirmPlacaVehiculo");
  if (el) el.textContent = placa;
  document.getElementById("confirmVehiculoBackdrop")?.classList.add("open");
}
function cerrarConfirm() {
  document.getElementById("confirmVehiculoBackdrop")?.classList.remove("open");
  eliminandoId = null;
}
async function eliminarVehiculo() {
  if (!eliminandoId) return;
  const btn = document.getElementById("btnConfirmarEliminarVehiculo");
  btn.disabled = true; btn.textContent = "Eliminando...";
  try {
    await deleteVehiculo(eliminandoId);
    showToast("Vehículo eliminado.", "success");
    cerrarConfirm();
    await cargarYRenderizar();
  } catch {
    showToast("Error al eliminar.", "error");
  } finally {
    btn.disabled = false; btn.textContent = "Sí, eliminar";
  }
}

/* ======================================================================
   VALIDACIÓN
   ====================================================================== */
const CAMPOS_REQ = [
  { id: "v_placa",        msg: "Ingresa la placa (mín. 6 caracteres).", test: v => v.length >= 6 },
  { id: "v_tipo_vehiculo",msg: "Selecciona el tipo de vehículo.",        test: v => v !== "" },
];

function validarForm() {
  let ok = true;
  limpiarErroresModal();
  CAMPOS_REQ.forEach(({ id, msg, test }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(`err-${id}`);
    if (!test(el?.value?.trim() ?? "")) {
      if (err) { err.textContent = msg; err.classList.add("visible"); }
      el?.classList.add("input-error");
      ok = false;
    }
  });
  // Validar "Otro" si aplica
  if (getVal("v_tipo_vehiculo") === "otro" && !getVal("v_tipo_otro")) {
    const err = document.getElementById("err-v_tipo_otro");
    if (err) { err.textContent = "Especifica el tipo de vehículo."; err.classList.add("visible"); }
    document.getElementById("v_tipo_otro")?.classList.add("input-error");
    ok = false;
  }
  return ok;
}

function limpiarErroresModal() {
  document.querySelectorAll("#formVehiculo .form-error").forEach(el => {
    el.textContent = ""; el.classList.remove("visible");
  });
  document.querySelectorAll("#formVehiculo .input-error").forEach(el =>
    el.classList.remove("input-error")
  );
}

/* ======================================================================
   HELPERS
   ====================================================================== */
function mostrarLoader(show) {
  const el = document.getElementById("vehiculosLoader");
  if (el) el.style.display = show ? "flex" : "none";
}
function getVal(id)      { return document.getElementById(id)?.value?.trim() ?? ""; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function toInputDate(v)  {
  if (!v) return "";
  const d = v?.toDate ? v.toDate() : new Date(v);
  return isNaN(d) ? "" : d.toISOString().split("T")[0];
}
function fromInputDate(str) {
  if (!str) return null;
  return new Date(str + "T00:00:00");
}
