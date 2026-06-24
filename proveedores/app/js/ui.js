/**
 * js/ui.js
 * Utilidades de UI compartidas para el dashboard de MISAGI S.A.C.
 */

/**
 * Inicializa el comportamiento del sidebar (hamburguesa + overlay).
 */
export function initSidebar() {
  const sidebar   = document.getElementById("sidebar");
  const overlay   = document.getElementById("sidebarOverlay");
  const hamburger = document.getElementById("hamburgerBtn");

  if (!sidebar || !overlay || !hamburger) return;

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
    hamburger.setAttribute("aria-expanded", "true");
    // Bloquear scroll del body en móvil
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("visible");
    overlay.setAttribute("aria-hidden", "true");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  hamburger.addEventListener("click", () => {
    sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener("click", closeSidebar);

  // Cerrar con tecla Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
}

/**
 * Muestra una notificación tipo toast.
 * @param {string} message  - Texto a mostrar
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - Milisegundos hasta desaparecer (default 3500)
 */
export function showToast(message, type = "info", duration = 3500) {
  // Crear contenedor si no existe
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
    document.body.appendChild(container);
  }

  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${icons[type] ?? icons.info}</span>
    <span class="toast__msg">${escapeHtml(message)}</span>
    <button class="toast__close" aria-label="Cerrar">✕</button>
  `;

  container.appendChild(toast);

  // Forzar reflow para disparar la transición CSS
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  function remove() {
    toast.classList.remove("toast--visible");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }

  toast.querySelector(".toast__close").addEventListener("click", remove);
  setTimeout(remove, duration);
}

/**
 * Escapa caracteres HTML para evitar XSS al insertar en innerHTML.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Formatea una fecha Firestore Timestamp o Date a string legible.
 * @param {import('firebase/firestore').Timestamp | Date | null} value
 * @returns {string}
 */
export function formatDate(value) {
  if (!value) return "—";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit", month: "short", year: "numeric"
  }).format(date);
}

/**
 * Formatea montos como moneda (PEN o USD).
 * @param {number} amount
 * @param {'PEN'|'USD'} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency = "PEN") {
  return new Intl.NumberFormat("es-PE", {
    style: "currency", currency
  }).format(amount);
}
