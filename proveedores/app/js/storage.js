/**
 * js/storage.js
 * Capa de acceso a Firebase Storage V10
 * Maneja la subida y descarga de archivos (PDF, XML, imágenes de documentos).
 */

import { storage } from "../firebase-config.js";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/**
 * Sube un archivo a Firebase Storage con seguimiento de progreso.
 *
 * @param {File}     file          - Objeto File del input
 * @param {string}   storagePath   - Ruta destino en Storage (ej: "facturas/empresa123/factura-001.pdf")
 * @param {Function} onProgress    - Callback (porcentaje: number) => void
 * @returns {Promise<string>}       - URL pública de descarga
 *
 * @example
 * const url = await uploadFile(file, `facturas/${idEmpresa}/${file.name}`, (p) => console.log(p + '%'));
 */
export function uploadFile(file, storagePath, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, storagePath);
    const task       = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(percent);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

/**
 * Elimina un archivo de Firebase Storage dado su path o URL.
 * @param {string} storagePathOrUrl
 */
export async function deleteFile(storagePathOrUrl) {
  const fileRef = storagePathOrUrl.startsWith("https")
    ? ref(storage, decodeURIComponent(storagePathOrUrl.split("/o/")[1].split("?")[0]))
    : ref(storage, storagePathOrUrl);
  await deleteObject(fileRef);
}

/**
 * Construye la ruta estándar de Storage para los diferentes tipos de archivo.
 * @param {'facturas'|'conductores'|'vehiculos'} tipo
 * @param {string} idEmpresa
 * @param {string} filename
 * @returns {string}
 */
export function buildStoragePath(tipo, idEmpresa, filename) {
  // Sanitizar nombre de archivo: eliminar caracteres especiales
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ts       = Date.now();
  return `${tipo}/${idEmpresa}/${ts}_${safeName}`;
}

/**
 * Valida que el archivo sea del tipo y tamaño permitido.
 * @param {File}     file
 * @param {string[]} allowedTypes - Array de MIME types (ej: ['application/pdf', 'text/xml'])
 * @param {number}   maxMB        - Tamaño máximo en MB (default 10)
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFile(file, allowedTypes, maxMB = 10) {
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de archivo no permitido. Se aceptan: ${allowedTypes.join(", ")}`,
    };
  }
  if (file.size > maxMB * 1024 * 1024) {
    return {
      valid: false,
      error: `El archivo supera el tamaño máximo de ${maxMB}MB.`,
    };
  }
  return { valid: true };
}
