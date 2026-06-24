/**
 * js/router.js
 * Micro-router SPA para el dashboard de MISAGI S.A.C.
 * Maneja la navegación entre secciones sin recarga de página.
 */

/**
 * Inicializa el router.
 * @param {string[]} sections  - Lista de IDs de sección (sin el prefijo "section-")
 * @param {Function} onNavigate - Callback opcional (seccion: string) => void | Promise<void>
 *                               Se ejecuta cada vez que se navega a una sección.
 */
export function router(sections, onNavigate = () => {}) {
  const navItems  = document.querySelectorAll(".nav-item[data-section]");
  const cardItems = document.querySelectorAll(".summary-card[data-section]");

  /** Muestra una sección y oculta el resto */
  async function showSection(name) {
    sections.forEach(s => {
      const el = document.getElementById(`section-${s}`);
      if (el) el.style.display = s === name ? "block" : "none";
    });

    // Actualizar estado activo en el sidebar
    navItems.forEach(item =>
      item.classList.toggle("active", item.dataset.section === name)
    );

    // Actualizar el hash de la URL para historial del navegador
    history.replaceState(null, "", `#${name}`);

    // Cerrar sidebar en móvil al navegar
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarOverlay")?.classList.remove("visible");
    document.getElementById("hamburgerBtn")?.setAttribute("aria-expanded", "false");

    // Hook para inicialización lazy de secciones
    await onNavigate(name);
  }

  // Eventos click en nav items
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(item.dataset.section);
    });
    // Accesibilidad: teclado
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showSection(item.dataset.section);
      }
    });
  });

  // Eventos click en tarjetas del dashboard
  cardItems.forEach(card => {
    card.addEventListener("click", () => showSection(card.dataset.section));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showSection(card.dataset.section);
      }
    });
  });

  // Leer sección inicial desde el hash de la URL
  const initialSection = window.location.hash.replace("#", "");
  if (initialSection && sections.includes(initialSection)) {
    showSection(initialSection);
  } else {
    // Asegurar que la primera sección visible dispare el hook
    onNavigate(sections[0]);
  }
}
