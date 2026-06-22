/* ==========================================================================
   MISAGI S.A.C. — Motor de módulos (CRUD genérico sobre Firestore)
   --------------------------------------------------------------------------
   Cada módulo declara su configuración (área, colección, campos) y este
   motor arma TODA la pantalla: encabezado, búsqueda, tabla, alta/edición y
   borrado. Así los 13 aplicativos comparten la misma base y mantenimiento.

   Uso en la página del módulo:
     MISAGI.modulo({
       area: "mantenimiento",          // permiso requerido
       coleccion: "mantenimiento",     // colección Firestore (= área)
       modulo: "llantas",              // sub-app dentro de la colección
       titulo: "Llantas",
       campos: [ {k,label,tipo,opciones,req}, ... ],
       columnas: ["unidad","estado"]   // columnas visibles en la tabla
     });
   --------------------------------------------------------------------------
   tipos de campo: text | number | date | select | textarea
   ========================================================================== */
(function (global) {
  const db = () => firebase.firestore();

  function el(tag, attrs = {}, html) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => (k === "class" ? n.className = v : n.setAttribute(k, v)));
    if (html != null) n.innerHTML = html;
    return n;
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  async function modulo(cfg) {
    cfg.columnas = cfg.columnas || cfg.campos.map(c => c.k).slice(0, 4);
    const sesion = await MISAGI.requireAccess(cfg.area);   // exige sesión + permiso
    const soloLectura = !MISAGI.esAdmin(sesion.perfil) && cfg.adminEscribe;
    pintarShell(cfg, sesion);
    let datos = [];

    const col = () => db().collection(cfg.coleccion);
    async function cargar() {
      const snap = await col().where("modulo", "==", cfg.modulo).get();
      datos = snap.docs.map(d => ({ _id: d.id, ...d.data() }))
        .sort((a, b) => (b._ts?.seconds || 0) - (a._ts?.seconds || 0));
      pintarTabla();
    }

    function filtradas() {
      const q = (document.getElementById("buscar").value || "").toLowerCase().trim();
      if (!q) return datos;
      return datos.filter(d => cfg.campos.some(c => String(d[c.k] ?? "").toLowerCase().includes(q)));
    }

    function pintarTabla() {
      const tb = document.querySelector("#tabla tbody");
      const filas = filtradas();
      if (!filas.length) {
        tb.innerHTML = `<tr><td colspan="${cfg.columnas.length + 1}" style="color:var(--text-muted)">Sin registros. Usa “+ Nuevo” para agregar${cfg.modulo ? " (o migra los datos del aplicativo actual)." : "."}</td></tr>`;
        return;
      }
      tb.innerHTML = filas.map(d => {
        const tds = cfg.columnas.map(k => `<td>${esc(d[k])}</td>`).join("");
        return `<tr data-id="${d._id}">${tds}<td style="text-align:right;white-space:nowrap">
          <button class="btn btn-ghost btn-sm" data-edit="${d._id}">Editar</button>
          <button class="btn btn-ghost btn-sm" data-del="${d._id}">🗑</button></td></tr>`;
      }).join("");
      tb.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => abrirForm(datos.find(x => x._id === b.dataset.edit)));
      tb.querySelectorAll("[data-del]").forEach(b => b.onclick = () => borrar(b.dataset.del));
    }

    function abrirForm(reg) {
      const editar = !!reg;
      const campos = cfg.campos.map(c => {
        const val = reg ? (reg[c.k] ?? "") : "";
        let input;
        if (c.tipo === "select")
          input = `<select name="${c.k}" ${c.req ? "required" : ""}><option value="">—</option>` +
            (c.opciones || []).map(o => `<option ${o == val ? "selected" : ""}>${esc(o)}</option>`).join("") + `</select>`;
        else if (c.tipo === "textarea")
          input = `<textarea name="${c.k}" rows="3" ${c.req ? "required" : ""}>${esc(val)}</textarea>`;
        else
          input = `<input name="${c.k}" type="${c.tipo || "text"}" value="${esc(val)}" ${c.req ? "required" : ""}>`;
        return `<div class="field"><label>${esc(c.label)}${c.req ? " *" : ""}</label>${input}</div>`;
      }).join("");
      document.getElementById("modalTitulo").textContent = (editar ? "Editar" : "Nuevo") + " — " + cfg.titulo;
      document.getElementById("modalCampos").innerHTML = campos;
      const modal = document.getElementById("modal");
      modal.classList.remove("hidden");
      document.getElementById("formMod").onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = { modulo: cfg.modulo, _por: sesion.user.email };
        cfg.campos.forEach(c => {
          let v = fd.get(c.k);
          if (c.tipo === "number") v = v === "" ? null : Number(v);
          data[c.k] = v;
        });
        try {
          if (editar) await col().doc(reg._id).set(data, { merge: true });
          else { data._ts = firebase.firestore.FieldValue.serverTimestamp(); await col().add(data); }
          modal.classList.add("hidden");
          cargar();
        } catch (err) { alert("No se pudo guardar: " + err.message); }
      };
    }

    async function borrar(id) {
      if (!confirm("¿Eliminar este registro?")) return;
      try { await col().doc(id).delete(); cargar(); }
      catch (err) { alert("No se pudo eliminar: " + err.message); }
    }

    document.getElementById("btnNuevo").onclick = () => abrirForm(null);
    document.getElementById("buscar").oninput = pintarTabla;
    document.getElementById("modalCerrar").onclick = () => document.getElementById("modal").classList.add("hidden");
    cargar();
  }

  function pintarShell(cfg, sesion) {
    const root = MISAGI.ROOT;
    document.title = cfg.titulo + " — MISAGI S.A.C.";
    const ths = cfg.columnas.map(k => {
      const c = cfg.campos.find(x => x.k === k);
      return `<th>${c ? c.label : k}</th>`;
    }).join("") + "<th></th>";
    document.body.innerHTML = `
      <header class="msg-header">
        <a class="brand" href="${root}index.html">← MISAGI · ${cfg.titulo}</a>
        <div class="spacer"></div>
        <div class="msg-user"><strong>${sesion.perfil.nombre || sesion.user.email}</strong><span>${cfg.titulo}</span></div>
        <button class="btn btn-ghost" id="logoutBtn">Salir</button>
      </header>
      <div class="container">
        <div class="toolbar" style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
          <input id="buscar" placeholder="Buscar…" style="flex:1;min-width:200px;padding:10px 14px;border:1px solid var(--border);border-radius:10px">
          <button class="btn btn-primary" id="btnNuevo">+ Nuevo</button>
        </div>
        <div class="card" style="padding:0;overflow:auto">
          <table id="tabla"><thead><tr>${ths}</tr></thead><tbody></tbody></table>
        </div>
      </div>
      <div id="modal" class="modal-overlay hidden">
        <div class="modal-box">
          <div class="modal-head"><h3 id="modalTitulo"></h3><button class="modal-x" id="modalCerrar">✕</button></div>
          <form id="formMod"><div id="modalCampos"></div>
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px">
              <button type="button" class="btn btn-ghost" onclick="document.getElementById('modal').classList.add('hidden')">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </div>`;
    document.getElementById("logoutBtn").onclick = () => MISAGI.logout();
  }

  global.MISAGI = global.MISAGI || {};
  global.MISAGI.modulo = modulo;
})(window);
