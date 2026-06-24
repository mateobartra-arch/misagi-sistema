/**
 * js/firestore.js
 * Capa de acceso a datos — Firestore V10
 * Centraliza todas las operaciones CRUD para el portal MISAGI S.A.C.
 */

import { db } from "../firebase-config.js";
import {
  collection, doc, getDocs, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit,
  serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ======================================================================
   EMPRESAS PROVEEDORAS — CREAR
   ====================================================================== */

/**
 * Crea una nueva empresa proveedora en Firestore.
 * @param {Object} data      - Datos del formulario de registro
 * @param {string} uidUsuario - UID del usuario propietario
 * @returns {Promise<DocumentReference>}
 */
export async function createEmpresa(data, uidUsuario) {
  return addDoc(collection(db, "empresas_proveedoras"), {
    ...data,
    uid_usuario: uidUsuario,
    estado: "pendiente_verificacion",
    fecha_creacion: serverTimestamp(),
  });
}

/**
 * Vincula una empresa al perfil del usuario en la colección `usuarios`.
 * Se llama una sola vez tras completar el registro de empresa.
 * @param {string} uid       - UID del usuario en Firebase Auth
 * @param {string} idEmpresa - ID del documento en `empresas_proveedoras`
 * @param {string} email     - Email del usuario
 */
export async function linkEmpresaToUser(uid, idEmpresa, email) {
  await setDoc(doc(db, "usuarios", uid), {
    id_empresa:     idEmpresa,
    email:          email,
    rol:            "proveedor",
    fecha_creacion: serverTimestamp(),
  });
}

/* ======================================================================
   USUARIOS
   ====================================================================== */

/**
 * Obtiene el perfil de usuario desde Firestore.
 * @param {string} uid
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "usuarios", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Crea o actualiza el perfil de usuario.
 * @param {string} uid
 * @param {{ rol: string, email: string, id_empresa: string }} data
 */
export async function upsertUserProfile(uid, data) {
  await updateDoc(doc(db, "usuarios", uid), {
    ...data,
    fecha_actualizacion: serverTimestamp(),
  });
}

/* ======================================================================
   EMPRESAS PROVEEDORAS
   ====================================================================== */

export async function getEmpresa(idEmpresa) {
  const snap = await getDoc(doc(db, "empresas_proveedoras", idEmpresa));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateEmpresa(idEmpresa, data) {
  await updateDoc(doc(db, "empresas_proveedoras", idEmpresa), {
    ...data,
    fecha_actualizacion: serverTimestamp(),
  });
}

/* ======================================================================
   VEHÍCULOS
   ====================================================================== */

/**
 * @param {string} idEmpresa
 * @returns {Promise<Array>}
 */
export async function getVehiculos(idEmpresa) {
  const q    = query(collection(db, "vehiculos"), where("id_empresa", "==", idEmpresa));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addVehiculo(idEmpresa, data) {
  return addDoc(collection(db, "vehiculos"), {
    ...data,
    id_empresa: idEmpresa,
    fecha_creacion: serverTimestamp(),
  });
}

export async function updateVehiculo(idVehiculo, data) {
  await updateDoc(doc(db, "vehiculos", idVehiculo), {
    ...data,
    fecha_actualizacion: serverTimestamp(),
  });
}

export async function deleteVehiculo(idVehiculo) {
  await deleteDoc(doc(db, "vehiculos", idVehiculo));
}

/* ======================================================================
   CONDUCTORES
   ====================================================================== */

/**
 * @param {string} idEmpresa
 * @returns {Promise<Array>}
 */
export async function getConductores(idEmpresa) {
  const q    = query(collection(db, "conductores"), where("id_empresa", "==", idEmpresa));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addConductor(idEmpresa, data) {
  return addDoc(collection(db, "conductores"), {
    ...data,
    id_empresa: idEmpresa,
    fecha_creacion: serverTimestamp(),
  });
}

export async function updateConductor(idConductor, data) {
  await updateDoc(doc(db, "conductores", idConductor), {
    ...data,
    fecha_actualizacion: serverTimestamp(),
  });
}

export async function deleteConductor(idConductor) {
  await deleteDoc(doc(db, "conductores", idConductor));
}

/* ======================================================================
   FACTURAS
   ====================================================================== */

/**
 * @param {string} idEmpresa
 * @param {'pendiente'|'pagado'|'vencido'|null} estado - Filtra por estado. Null = todos.
 * @returns {Promise<Array>}
 */
export async function getFacturas(idEmpresa, estado = null) {
  const constraints = [where("id_empresa", "==", idEmpresa), orderBy("fecha_carga", "desc")];
  if (estado) constraints.splice(1, 0, where("estado", "==", estado));

  const q    = query(collection(db, "facturas"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addFactura(idEmpresa, data) {
  return addDoc(collection(db, "facturas"), {
    ...data,
    id_empresa: idEmpresa,
    estado: "pendiente",
    fecha_carga: serverTimestamp(),
  });
}

export async function updateFactura(idFactura, data) {
  await updateDoc(doc(db, "facturas", idFactura), {
    ...data,
    fecha_actualizacion: serverTimestamp(),
  });
}

/* ======================================================================
   UTILIDADES
   ====================================================================== */

/**
 * Detecta documentos próximos a vencer en los próximos N días.
 * @param {Array<{documentos: Object}>} items
 * @param {number} days
 * @returns {number} cantidad de alertas
 */
export function countExpiringDocs(items, days = 30) {
  const now    = Date.now();
  const limite = now + days * 24 * 60 * 60 * 1000;
  let   count  = 0;

  for (const item of items) {
    const docs = item.documentos ?? {};
    for (const docEntry of Object.values(docs)) {
      const vencimiento = docEntry?.fecha_vencimiento;
      if (!vencimiento) continue;
      const ts = vencimiento instanceof Timestamp
        ? vencimiento.toMillis()
        : new Date(vencimiento).getTime();
      if (ts >= now && ts <= limite) count++;
    }
  }
  return count;
}

/* ======================================================================
   CONFIG DOCUMENTOS POR TIPO DE VEHÍCULO (solo admin)
   Colección: config_documentos/{tipo_id}
   Ej. tipos: "tracto", "encapsulado", "plataforma", "otro"
   ====================================================================== */

/**
 * Documentos por defecto cuando no existe config en Firestore.
 * El admin puede personalizar/sobrescribir esto.
 */
export const DOCS_DEFAULT = {
  tracto: [
    { id: "soat",              nombre: "SOAT",                        con_vencimiento: true,  requerido: true,  orden: 1 },
    { id: "tarjeta_propiedad", nombre: "Tarjeta de Propiedad",        con_vencimiento: false, requerido: true,  orden: 2 },
    { id: "revision_tecnica",  nombre: "Revisión Técnica Vehicular",  con_vencimiento: true,  requerido: true,  orden: 3 },
    { id: "cert_inspeccion",   nombre: "Certificado de Inspección",   con_vencimiento: true,  requerido: false, orden: 4 },
  ],
  encapsulado: [
    { id: "soat",              nombre: "SOAT",                        con_vencimiento: true,  requerido: true,  orden: 1 },
    { id: "tarjeta_propiedad", nombre: "Tarjeta de Propiedad",        con_vencimiento: false, requerido: true,  orden: 2 },
    { id: "revision_tecnica",  nombre: "Revisión Técnica Vehicular",  con_vencimiento: true,  requerido: true,  orden: 3 },
  ],
  plataforma: [
    { id: "soat",              nombre: "SOAT",                        con_vencimiento: true,  requerido: true,  orden: 1 },
    { id: "tarjeta_propiedad", nombre: "Tarjeta de Propiedad",        con_vencimiento: false, requerido: true,  orden: 2 },
    { id: "revision_tecnica",  nombre: "Revisión Técnica Vehicular",  con_vencimiento: true,  requerido: true,  orden: 3 },
  ],
  otro: [
    { id: "soat",              nombre: "SOAT",                        con_vencimiento: true,  requerido: true,  orden: 1 },
    { id: "tarjeta_propiedad", nombre: "Tarjeta de Propiedad",        con_vencimiento: false, requerido: true,  orden: 2 },
  ],
};

/**
 * Obtiene la config de documentos de UN tipo de vehículo.
 * Si no existe en Firestore, devuelve el default.
 * @param {string} tipo - "tracto" | "encapsulado" | "plataforma" | "otro"
 * @returns {Promise<Array>} lista de documentos requeridos
 */
export async function getConfigDocumentos(tipo) {
  const snap = await getDoc(doc(db, "config_documentos", tipo));
  if (snap.exists()) return snap.data().documentos ?? [];
  return DOCS_DEFAULT[tipo] ?? DOCS_DEFAULT.otro;
}

/**
 * Obtiene la config de documentos de TODOS los tipos.
 * @returns {Promise<Object>} { tracto: [...], encapsulado: [...], ... }
 */
export async function getAllConfigDocumentos() {
  const snap   = await getDocs(collection(db, "config_documentos"));
  const result = { ...DOCS_DEFAULT }; // parte de los defaults
  snap.docs.forEach(d => { result[d.id] = d.data().documentos ?? []; });
  return result;
}

/**
 * Guarda (crea o sobreescribe) la config de documentos de un tipo.
 * Solo debe llamarse desde el panel de admin.
 * @param {string}   tipo       - ID del tipo ("tracto", "encapsulado", etc.)
 * @param {string}   tipoLabel  - Nombre legible ("Tracto", etc.)
 * @param {Array}    documentos - Lista de documentos configurados
 * @param {string}   uidAdmin   - UID del admin que realiza el cambio
 */
export async function saveConfigDocumentos(tipo, tipoLabel, documentos, uidAdmin) {
  await setDoc(doc(db, "config_documentos", tipo), {
    tipo_label:          tipoLabel,
    documentos,
    modificado_por:      uidAdmin,
    fecha_actualizacion: serverTimestamp(),
  });
}

/* ======================================================================
   USUARIOS — ADMIN
   ====================================================================== */

/**
 * Obtiene todos los usuarios del sistema (solo admin).
 * @returns {Promise<Array>}
 */
export async function getAllUsuarios() {
  const snap = await getDocs(collection(db, "usuarios"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Obtiene todas las empresas proveedoras (solo admin).
 * @returns {Promise<Array>}
 */
export async function getAllEmpresas() {
  const snap = await getDocs(collection(db, "empresas_proveedoras"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Actualiza el estado de una empresa (solo admin).
 * @param {string} idEmpresa
 * @param {'activo'|'pendiente_verificacion'|'rechazado'} estado
 */
export async function setEstadoEmpresa(idEmpresa, estado) {
  await updateDoc(doc(db, "empresas_proveedoras", idEmpresa), {
    estado,
    fecha_actualizacion: serverTimestamp(),
  });
}
