/* ==========================================================================
   MISAGI S.A.C. — Motor genérico de "registros"
   --------------------------------------------------------------------------
   Con un objeto de configuración levanta un módulo completo:
   formulario + tabla + buscador + resumen (sumas/conteo) + exportar Excel.
   Guarda en Firestore (colección + campo "modulo"), gated por área.
   Uso (en la página del módulo):
     MISAGI_REGISTRO.init({
       area:"operaciones", coleccion:"operaciones", modulo:"combustible",
       titulo:"Control de combustible",
       campos:[ {k:"fecha",label:"Fecha",tipo:"date"}, {k:"placa",label:"Unidad/Placa"}, ... ],
       columnas:["fecha","placa","conductor","galones","costo"],
       resumen:[ {label:"Galones",campo:"galones",op:"sum"}, {label:"Costo (S/)",campo:"costo",op:"sum",money:true} ]
     });
   ========================================================================== */
(function (global) {
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function db(){return firebase.firestore();}
  function fmtNum(n){ n=Number(n||0); return n.toLocaleString('es-PE',{maximumFractionDigits:2}); }

  function init(cfg){
    var DATA=[], esAdmin=false;
    var root=document.getElementById("reg");
    var idCampoFecha=(cfg.campos.filter(function(c){return c.tipo==="date";})[0]||{}).k;

    function shell(){
      var resumenHtml = (cfg.resumen||[]).map(function(r,i){
        return '<div class="kpi-card"><div class="kpi-v" id="kpi_'+i+'">—</div><div class="kpi-l">'+esc(r.label)+'</div></div>';
      }).join("");
      root.innerHTML =
        '<div class="page-head"><div><h1>'+esc(cfg.titulo)+'</h1><div class="page-sub" id="sub">Cargando…</div></div>'+
          '<div style="display:flex;gap:10px">'+((window.REGISTRO_SEED||{})[cfg.modulo]&&(window.REGISTRO_SEED||{})[cfg.modulo].length?'<button class="btn btn-ghost" id="btnImp">Importar histórico ('+(window.REGISTRO_SEED[cfg.modulo].length)+')</button>':'')+'<input type="file" id="impXfile" accept=".xlsx,.xls,.csv" style="display:none"><button class="btn btn-ghost" id="btnImpX">⬆ Importar Excel</button><button class="btn btn-ghost" id="btnExp">⬇ Excel</button><button class="btn btn-primary" id="btnNew">+ Nuevo</button></div></div>'+
        (resumenHtml?('<div class="kpis-reg">'+resumenHtml+'</div>'):'')+
        '<div class="toolbar"><input type="search" id="buscar" placeholder="Buscar…"></div>'+
        '<div class="table-wrap"><table id="tabla"><thead><tr>'+
          cfg.columnas.map(function(k){return '<th>'+esc(label(k))+'</th>';}).join("")+'<th></th></tr></thead><tbody></tbody></table></div>';
      document.getElementById("btnNew").onclick=function(){abrir(null);};
      var bi=document.getElementById("btnImp"); if(bi) bi.onclick=importarSeed;
      var bx=document.getElementById("btnImpX"), bxf=document.getElementById("impXfile");
      if(bx&&bxf){ bx.onclick=function(){bxf.click();}; bxf.onchange=function(){ if(bxf.files[0]) importExcel(bxf.files[0]); bxf.value=""; }; }
      document.getElementById("btnExp").onclick=exportar;
      document.getElementById("buscar").oninput=pintar;
    }
    function label(k){ var c=cfg.campos.filter(function(x){return x.k===k;})[0]; return c?c.label:k; }

    function filtradas(){
      var q=(document.getElementById("buscar").value||"").toLowerCase().trim();
      var arr=DATA.slice().sort(function(a,b){ if(idCampoFecha) return String(b[idCampoFecha]||"").localeCompare(String(a[idCampoFecha]||"")); return 0; });
      if(!q) return arr;
      return arr.filter(function(d){ return cfg.campos.some(function(c){ return String(d[c.k]||"").toLowerCase().indexOf(q)>=0; }); });
    }
    function pintar(){
      var tb=document.querySelector("#tabla tbody"); var f=filtradas();
      document.getElementById("sub").textContent=DATA.length+" registro(s)";
      var _bi=document.getElementById("btnImp"); if(_bi){ _bi.style.display=""; _bi.textContent = DATA.length ? "↻ Re-importar" : ("⬆ Importar histórico ("+(((window.REGISTRO_SEED||{})[cfg.modulo]||[]).length)+")"); }
      // resumen
      (cfg.resumen||[]).forEach(function(r,i){
        var el=document.getElementById("kpi_"+i); if(!el) return; var val;
        if(r.op==="count") val=DATA.length;
        else { val=DATA.reduce(function(a,d){return a+Number(d[r.campo]||0);},0); }
        el.textContent=(r.money?"S/ ":"")+fmtNum(val);
      });
      if(!f.length){ tb.innerHTML='<tr><td colspan="'+(cfg.columnas.length+1)+'" style="text-align:center;color:var(--text-muted);padding:24px">Sin registros. Usa “+ Nuevo”.</td></tr>'; return; }
      tb.innerHTML=f.map(function(d){
        return '<tr>'+cfg.columnas.map(function(k){return '<td>'+esc(d[k])+'</td>';}).join("")+
          '<td style="text-align:right;white-space:nowrap"><button class="btn btn-ghost btn-sm" data-e="'+d._id+'">Editar</button> <button class="btn btn-ghost btn-sm" data-d="'+d._id+'">✕</button></td></tr>';
      }).join("");
      tb.querySelectorAll("[data-e]").forEach(function(b){b.onclick=function(){abrir(DATA.filter(function(x){return x._id===b.dataset.e;})[0]);};});
      tb.querySelectorAll("[data-d]").forEach(function(b){b.onclick=function(){borrar(b.dataset.d);};});
    }
    function cargar(){
      db().collection(cfg.coleccion).where("modulo","==",cfg.modulo).get().then(function(snap){
        DATA=snap.docs.map(function(doc){var o=doc.data();o._id=doc.id;return o;});
        pintar();
      }).catch(function(e){ document.getElementById("sub").textContent="Error: "+e.message; });
    }

    // ---- Modal ----
    function modal(){
      if(document.getElementById("regModal")) return;
      var m=document.createElement("div"); m.id="regModal"; m.className="modal-overlay hidden";
      m.innerHTML='<div class="modal-box" style="max-width:520px"><div class="modal-head"><h3 id="regTit">Nuevo</h3><button class="modal-x" id="regX">✕</button></div>'+
        '<form id="regForm">'+cfg.campos.map(function(c){
          var t=c.tipo||"text";
          if(t==="select"){ if(c.fuente){ return '<div class="field"><label>'+esc(c.label)+'</label><select name="'+c.k+'" data-fuente="'+c.fuente+'"><option value=""></option></select></div>'; } return '<div class="field"><label>'+esc(c.label)+'</label><select name="'+c.k+'">'+(c.opciones||[]).map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>';}).join("")+'</select></div>'; }
          if(t==="textarea"){ return '<div class="field"><label>'+esc(c.label)+'</label><textarea name="'+c.k+'" rows="2"></textarea></div>'; }
          return '<div class="field"><label>'+esc(c.label)+'</label><input name="'+c.k+'" type="'+t+'"'+(t==="number"?' step="any"':'')+'></div>';
        }).join("")+
        '<div id="regErr" class="msg-alert error hidden"></div>'+
        '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px"><button type="button" class="btn btn-ghost" id="regCancel">Cancelar</button><button type="submit" class="btn btn-primary" id="regSave">Guardar</button></div>'+
        '</form></div>';
      document.body.appendChild(m);
      document.getElementById("regX").onclick=cerrar;
      document.getElementById("regCancel").onclick=cerrar;
      document.getElementById("regForm").addEventListener("submit",guardar);
    }
    function populateFuentes(cb){
      var sels=document.querySelectorAll("#regForm select[data-fuente]");
      if(!sels.length || typeof MISAGI_MAESTROS==="undefined"){ if(cb)cb(); return; }
      var pend=sels.length;
      sels.forEach(function(sel){
        var cur=sel.value;
        MISAGI_MAESTROS.opciones(sel.getAttribute("data-fuente")).then(function(ops){
          sel.innerHTML='<option value=""></option>'+ops.map(function(o){return '<option>'+esc(o)+'</option>';}).join("");
          if(cur) sel.value=cur;
        }).catch(function(){}).then(function(){ if(--pend===0 && cb) cb(); });
      });
    }
    // Autocompletar campos DERIVADOS del maestro (ej. tipo desde la placa).
    function wireAuto(f){
      var autos=cfg.campos.filter(function(c){return c.auto;});
      if(!autos.length || typeof MISAGI_MAESTROS==="undefined") return;
      autos.forEach(function(c){
        var padre=f[c.auto.padre]; if(!padre || f[c.k]===undefined) return;
        var fill=function(){
          var val=padre.value; if(!val){ return; }
          MISAGI_MAESTROS.infoUnidad(val).then(function(u){ if(u && u[c.auto.campo]!=null){ f[c.k].value=u[c.auto.campo]; } });
        };
        if(!padre._autoWired){ padre.addEventListener("change",fill); padre._autoWired=true; }
        if(f[c.k].tagName==="INPUT") f[c.k].readOnly=true;
      });
    }
    function abrir(reg){
      modal();
      var f=document.getElementById("regForm"); f.reset();
      document.getElementById("regErr").classList.add("hidden");
      f.dataset.id=reg?reg._id:"";
      document.getElementById("regTit").textContent=reg?"Editar registro":"Nuevo registro";
      document.getElementById("regModal").classList.remove("hidden");
      populateFuentes(function(){
        wireAuto(f);
        if(reg){ cfg.campos.forEach(function(c){ if(f[c.k]!==undefined && reg[c.k]!=null) f[c.k].value=reg[c.k]; }); }
        else if(idCampoFecha && f[idCampoFecha]){ f[idCampoFecha].value=new Date().toISOString().slice(0,10); }
      });
    }
    function cerrar(){ var m=document.getElementById("regModal"); if(m) m.classList.add("hidden"); }
    function guardar(e){
      e.preventDefault(); var f=e.target, err=document.getElementById("regErr"); err.classList.add("hidden");
      var reg={modulo:cfg.modulo};
      cfg.campos.forEach(function(c){ if(f[c.k]!==undefined) reg[c.k]=f[c.k].value.trim(); });
      cfg.campos.forEach(function(c){ if((c.k==="placa"||c.k==="unidad") && reg[c.k]){ var v=reg[c.k].toUpperCase().replace(/[^A-Z0-9]/g,""); if(v.length===6) v=v.slice(0,3)+"-"+v.slice(3); reg[c.k]=v; } });
      if(cfg.unico && reg[cfg.unico]){ var dup=DATA.filter(function(d){ return d._id!==f.dataset.id && String(d[cfg.unico]||"").toLowerCase()===String(reg[cfg.unico]).toLowerCase(); }); if(dup.length){ err.textContent="Ya existe un registro con ese "+cfg.unico+" ("+reg[cfg.unico]+")."; err.classList.remove("hidden"); return; } }
      var btn=document.getElementById("regSave"); btn.disabled=true; btn.textContent="Guardando…";
      reg._ts=firebase.firestore.FieldValue.serverTimestamp();
      var op = f.dataset.id ? db().collection(cfg.coleccion).doc(f.dataset.id).set(reg,{merge:true}) : db().collection(cfg.coleccion).add(reg);
      op.then(function(){ btn.disabled=false; btn.textContent="Guardar"; cerrar(); cargar(); if(cfg.onGuardado){ try{ cfg.onGuardado(reg); }catch(e){} } })
        .catch(function(e2){ err.textContent=e2.message; err.classList.remove("hidden"); btn.disabled=false; btn.textContent="Guardar"; });
    }
    function borrar(id){ if(!confirm("¿Borrar este registro?")) return; db().collection(cfg.coleccion).doc(id).delete().then(cargar); }

    function importarSeed(){
      var seed=(window.REGISTRO_SEED||{})[cfg.modulo]||[]; if(!seed.length) return;
      var re=DATA.length>0;
      var msg=re?("Ya hay "+DATA.length+" registros. Se BORRARÁN los actuales y se cargarán "+seed.length+" limpios. ¿Continuar?"):("Se importarán "+seed.length+" registros. ¿Continuar?");
      if(!confirm(msg)) return;
      var btn=document.getElementById("btnImp"); btn.disabled=true; btn.textContent="Procesando…";
      function doImport(){
        var recs=seed.slice();
        (function lote(){ if(!recs.length){ btn.textContent="✓ Importado"; cargar(); return; } var chunk=recs.splice(0,400), b=db().batch(); chunk.forEach(function(r){ b.set(db().collection(cfg.coleccion).doc(), Object.assign({modulo:cfg.modulo},r)); }); b.commit().then(function(){ btn.textContent="Cargando… ("+recs.length+")"; lote(); }).catch(function(e){ alert("Error: "+e.message); btn.disabled=false; }); })();
      }
      if(re){
        db().collection(cfg.coleccion).where("modulo","==",cfg.modulo).get().then(function(snap){
          var docs=snap.docs.slice();
          (function del(){ if(!docs.length){ doImport(); return; } var chunk=docs.splice(0,400), b=db().batch(); chunk.forEach(function(d){ b.delete(d.ref); }); b.commit().then(function(){ btn.textContent="Limpiando… ("+docs.length+")"; del(); }).catch(function(e){ alert("Error al limpiar: "+e.message); btn.disabled=false; }); })();
        }).catch(function(e){ alert("Error: "+e.message); btn.disabled=false; });
      } else doImport();
    }
    function ensureXLSX(cb){ if(window.XLSX) return cb(); var sc=document.createElement("script"); sc.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; sc.onload=cb; sc.onerror=function(){alert("No se pudo cargar el lector de Excel.");}; document.head.appendChild(sc); }
    function importExcel(file){
      ensureXLSX(function(){
        var rd=new FileReader();
        rd.onload=function(e){
          try{
            var wb=XLSX.read(new Uint8Array(e.target.result),{type:"array",cellDates:true});
            var ws=wb.Sheets[wb.SheetNames[0]];
            var rows=XLSX.utils.sheet_to_json(ws,{defval:"",raw:true});
            if(!rows.length){ alert("El Excel está vacío."); return; }
            function norm(x){ return String(x).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,""); }
            var headers=Object.keys(rows[0]); var map={};
            cfg.campos.forEach(function(c){ var h=headers.filter(function(H){return norm(H)===norm(c.label)||norm(H)===norm(c.k);})[0]; if(h) map[c.k]=h; });
            if(!Object.keys(map).length){ alert("No reconocí las columnas. Usa los mismos títulos del formulario:\n"+cfg.campos.map(function(c){return c.label;}).join(", ")); return; }
            var regs=rows.map(function(r){ var o={modulo:cfg.modulo}; cfg.campos.forEach(function(c){ if(map[c.k]!==undefined){ var v=r[map[c.k]]; if(v instanceof Date){ v=v.toISOString().slice(0,10); } o[c.k]=(v==null?"":String(v).trim()); } }); return o; })
                         .filter(function(o){ return cfg.campos.some(function(c){return o[c.k];}); });
            if(!regs.length){ alert("No se encontraron filas con datos."); return; }
            if(!confirm("Se importarán "+regs.length+" filas a \""+cfg.titulo+"\". ¿Continuar?")) return;
            var rest=regs.slice();
            (function lote(){ if(!rest.length){ alert("✓ Importado: "+regs.length+" filas"); cargar(); return; } var chunk=rest.splice(0,400); var b=db().batch(); chunk.forEach(function(o){ b.set(db().collection(cfg.coleccion).doc(), o); }); b.commit().then(lote).catch(function(err){ alert("Error al importar: "+err.message); }); })();
          }catch(ex){ alert("No se pudo leer el Excel: "+ex.message); }
        };
        rd.readAsArrayBuffer(file);
      });
    }
    function exportar(){
      ensureXLSX(function(){
        var data=DATA.map(function(d){ var o={}; cfg.campos.forEach(function(c){ o[c.label]=(d[c.k]==null?"":d[c.k]); }); return o; });
        var ws=XLSX.utils.json_to_sheet(data); var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,(cfg.titulo||"Datos").slice(0,28));
        XLSX.writeFile(wb, cfg.modulo+".xlsx");
      });
    }

    MISAGI.requireAccess(cfg.area).then(function(s){
      esAdmin=MISAGI.esAdmin(s.perfil);
      var lo=document.getElementById("logoutBtn"); if(lo) lo.onclick=function(){MISAGI.logout();};
      shell(); cargar();
    });
  }

  global.MISAGI_REGISTRO = { init: init };
})(window);
