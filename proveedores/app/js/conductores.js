/**
 * js/conductores.js
 * Módulo UI completo para la sección "Detalle Conductores"
 * MISAGI S.A.C. — Portal de Proveedores
 */

import { getConductores, addConductor, updateConductor, deleteConductor }
  from "./firestore.js";
import { showToast, formatDate, escapeHtml } from "./ui.js";

/* ======================================================================
   ESTADO LOCAL
   ====================================================================== */
let conductoresList  = [];   // cache de conductores cargados
let idEmpresaActual  = null;
let editandoId       = null; // null = alta nueva, string = edición

/* ======================================================================
   PUNTO DE ENTRADA
   ====================================================================== */

/**
 * Inicializa la sección de conductores.
 * Debe llamarse cuando el usuario navega a #conductores y se conoce idEmpresa.
 * @param {string} idEmpresa
 */
export async function initConductores(idEmpresa) {
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
    conductoresList = await getConductores(idEmpresaActual);
    renderTabla(conductoresList);
  } catch (err) {
    console.error("Error cargando conductores:", err);
    showToast("Error al cargar conductores.", "error");
  } finally {
    mostrarLoader(false);
  }
}

/* ======================================================================
   RENDER DE TABLA
   ====================================================================== */
function renderTabla(lista) {
  const tbody = document.getElementById("conductoresBody");
  const empty = document.getElementById("conductoresEmpty");
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  tbody.innerHTML = lista.map(c => `
    <tr>
      <td>
        <div class="cell-name">${escapeHtml(c.nombres)} ${escapeHtml(c.apellidos ?? "")}</div>
        <div class="cell-sub">DNI: ${escapeHtml(c.dni)}</div>
      </td>
      <td>${escapeHtml(c.telefono ?? "—")}</td>
      <td>
        <div class="doc-status">
          <span class="cell-sub">N° ${escapeHtml(c.documentos?.licencia?.numero ?? "—")}</span>
          <span class="cell-sub">Cat. ${escapeHtml(c.documentos?.licencia?.categoria ?? "—")}</span>
          ${badgeVencimiento(c.documentos?.licencia?.fecha_vencimiento)}
        </div>
      </td>
      <td>
        ${badgeVencimiento(c.documentos?.examen_medico?.fecha_vencimiento)}
      </td>
      <td>
        <span class="badge ${c.estado === 'activo' ? 'badge--success' : 'badge--danger'}">
          ${c.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" title="Editar" data-action="editar" data-id="${c.id}" aria-label="Editar conductor">✏️</button>
          <button class="btn-icon btn-icon--danger" title="Eliminar" data-action="eliminar" data-id="${c.id}" data-nombre="${escapeHtml(c.nombres)}" aria-label="Eliminar conductor">🗑️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

/* ======================================================================
   BADGE DE VENCIMIENTO
   ====================================================================== */
function badgeVencimiento(fechaFirestore) {
  if (!fechaFirestore) {
    return `<span class="expiry-badge expiry-badge--none">Sin fecha</span>`;
  }

  const fecha = fechaFirestore?.toDate ? fechaFirestore.toDate() : new Date(fechaFirestore);
  const hoy   = new Date();
  const dias  = Math.floor((fecha - hoy) / (1000 * 60 * 60 * 24));

  if (dias < 0) {
    return `<span class="expiry-badge expiry-badge--expired">🔴 Vencido ${formatDate(fechaFirestore)}</span>`;
  } else if (dias <= 30) {
    return `<span class="expiry-badge expiry-badge--warning">🟡 Vence ${formatDate(fechaFirestore)}</span>`;
  } else {
    return `<span class="expiry-badge expiry-badge--ok">🟢 ${formatDate(fechaFirestore)}</span>`;
  }
}

/* ======================================================================
   EVENTOS
   ====================================================================== */
function bindEventos() {
  // Evitar registrar listeners duplicados al navegar varias veces
  const section = document.getElementById("section-conductores");
  if (section?.dataset.bound === "1") return;
  if (section) section.dataset.bound = "1";

  // Botón "Agregar conductor"
  document.getElementById("btnAgregarConductor")
    ?.addEventListener("click", () => abrirModal());

  // Acciones en filas (editar / eliminar) — delegación
  document.getElementById("conductoresBody")
    ?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const { action, id, nombre } = btn.dataset;
      if (action === "editar")   abrirModal(id);
      if (action === "eliminar") abrirConfirm(id, nombre);
    });

  // Búsqueda en tiempo real
  document.getElementById("buscarConductor")
    ?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtrado = conductoresList.filter(c =>
        c.nombres.toLowerCase().includes(q) ||
        c.apellidos?.toLowerCase().includes(q) ||
        c.dni.includes(q)
      );
      renderTabla(filtrado);
    });

  // Modal — cerrar
  document.getElementById("modalConductorBackdrop")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "modalConductorBackdrop") cerrarModal();
    });
  document.getElementById("btnCerrarModalConductor")
    ?.addEventListener("click", cerrarModal);
  document.getElementById("btnCancelarConductor")
    ?.addEventListener("click", cerrarModal);

  // Modal — guardar
  document.getElementById("formConductor")
    ?.addEventListener("submit", guardarConductor);

  // Confirm dialog — cancelar / confirmar
  document.getElementById("btnCancelarEliminar")
    ?.addEventListener("click", cerrarConfirm);
  document.getElementById("btnConfirmarEliminar")
    ?.addEventListener("click", eliminarConductor);

  // Cerrar modales con Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { cerrarModal(); cerrarConfirm(); }
  });
}

/* ======================================================================
   MODAL — ALTA / EDICIÓN
   ====================================================================== */
function abrirModal(id = null) {
  editandoId = id;
  const modal   = document.getElementById("modalConductorBackdrop");
  const titulo  = document.getElementById("modalConductorTitulo");
  const form    = document.getElementById("formConductor");

  form.reset();
  limpiarErroresModal();

  if (id) {
    const c = conductoresList.find(x => x.id === id);
    if (!c) return;
    titulo.textContent = "Editar Conductor";
    // Datos personales
    setVal("c_dni",       c.dni);
    setVal("c_nombres",   c.nombres);
    setVal("c_apellidos", c.apellidos ?? "");
    setVal("c_telefono",  c.telefono ?? "");
    setVal("c_estado",    c.estado ?? "activo");
    // Licencia
    setVal("c_lic_numero",    c.documentos?.licencia?.numero ?? "");
    setVal("c_lic_categoria", c.documentos?.licencia?.categoria ?? "");
    setVal("c_lic_venc",      toInputDate(c.documentos?.licencia?.fecha_vencimiento));
    // Examen médico
    setVal("c_med_venc", toInputDate(c.documentos?.examen_medico?.fecha_vencimiento));
  } else {
    titulo.textContent = "Nuevo Conductor";
  }

  modal?.classList.add("open");
  document.getElementById("c_dni")?.focus();
}

function cerrarModal() {
  document.getElementById("modalConductorBackdrop")?.classList.remove("open");
  editandoId = null;
}

/* ======================================================================
   GUARDAR (alta o edición)
   ====================================================================== */
async function guardarConductor(e) {
  e.preventDefault();
  if (!validarFormConductor()) return;

  const btnGuardar = document.getElementById("btnGuardarConductor");
  btnGuardar.disabled     = true;
  btnGuardar.textContent  = "Guardando...";

  const data = {
    dni:       getVal("c_dni"),
    nombres:   getVal("c_nombres"),
    apellidos: getVal("c_apellidos"),
    telefono:  getVal("c_telefono"),
    estado:    getVal("c_estado"),
    documentos: {
      licencia: {
        numero:            getVal("c_lic_numero"),
        categoria:         getVal("c_lic_categoria"),
        fecha_vencimiento: fromInputDate(getVal("c_lic_venc")),
      },
      examen_medico: {
        fecha_vencimiento: fromInputDate(getVal("c_med_venc")),
      },
    },
  };

  try {
    if (editandoId) {
      await updateConductor(editandoId, data);
      showToast("Conductor actualizado correctamente.", "success");
    } else {
      await addConductor(idEmpresaActual, data);
      showToast("Conductor registrado correctamente.", "success");
    }
    cerrarModal();
    await cargarYRenderizar();
  } catch (err) {
    console.error("Error guardando conductor:", err);
    showToast("Error al guardar. Intenta de nuevo.", "error");
  } finally {
    btnGuardar.disabled    = false;
    btnGuardar.textContent = "Guardar";
  }
}

/* ======================================================================
   ELIMINAR
   ====================================================================== */
let eliminandoId = null;

function abrirConfirm(id, nombre) {
  eliminandoId = id;
  const el = document.getElementById("confirmNombreConductor");
  if (el) el.textContent = nombre;
  document.getElementById("confirmConductorBackdrop")?.classList.add("open");
}

function cerrarConfirm() {
  document.getElementById("confirmConductorBackdrop")?.classList.remove("open");
  eliminandoId = null;
}

async function eliminarConductor() {
  if (!eliminandoId) return;
  const btn = document.getElementById("btnConfirmarEliminar");
  btn.disabled    = true;
  btn.textContent = "Eliminando...";

  try {
    await deleteConductor(eliminandoId);
    showToast("Conductor eliminado.", "success");
    cerrarConfirm();
    await cargarYRenderizar();
  } catch (err) {
    console.error("Error eliminando:", err);
    showToast("Error al eliminar.", "error");
  } finally {
    btn.disabled    = false;
    btn.textContent = "Sí, eliminar";
  }
}

/* ======================================================================
   VALIDACIÓN DEL FORMULARIO
   ====================================================================== */
const CAMPOS_REQUERIDOS = [
  { id: "c_dni",      msg: "El DNI debe tener 8 dígitos.", test: v => /^\d{8}$/.test(v) },
  { id: "c_nombres",  msg: "Ingresa los nombres.",         test: v => v.length >= 2 },
  { id: "c_apellidos",msg: "Ingresa los apellidos.",        test: v => v.length >= 2 },
];

function validarFormConductor() {
  let ok = true;
  limpiarErroresModal();
  CAMPOS_REQUERIDOS.forEach(({ id, msg, test }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(`err-${id}`);
    if (!test(el?.value?.trim() ?? "")) {
      if (err) { err.textContent = msg; err.classList.add("visible"); }
      el?.classList.add("input-error");
      ok = false;
    }
  });
  return ok;
}

function limpiarErroresModal() {
  document.querySelectorAll("#formConductor .form-error").forEach(el => {
    el.textContent = "";
    el.classList.remove("visible");
  });
  document.querySelectorAll("#formConductor .input-error").forEach(el =>
    el.classList.remove("input-error")
  );
}

/* ======================================================================
   LOADER
   ====================================================================== */
function mostrarLoader(show) {
  const el = document.getElementById("conductoresLoader");
  if (el) el.style.display = show ? "flex" : "none";
}

/* ======================================================================
   HELPERS
   ====================================================================== */
function getVal(id)       { return document.getElementById(id)?.value?.trim() ?? ""; }
function setVal(id, val)  { const el = document.getElementById(id); if (el) el.value = val; }

/** Convierte Timestamp de Firestore o Date a string "YYYY-MM-DD" para input[type=date] */
function toInputDate(v) {
  if (!v) return "";
  const d = v?.toDate ? v.toDate() : new Date(v);
  return d.toISOString().split("T")[0];
}

/** Convierte string "YYYY-MM-DD" a objeto Date (o null) */
function fromInputDate(str) {
  if (!str) return null;
  return new Date(str + "T00:00:00");
}
