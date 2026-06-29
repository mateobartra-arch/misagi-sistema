/* ==========================================================================
   MISAGI — Alertas de vencimiento por correo (7 días antes)
   --------------------------------------------------------------------------
   Función PROGRAMADA: corre cada día 7:00 (hora Perú), busca documentos y EMO
   que vencen en 7 días o menos, y crea correos en la colección 'mail' para que
   la extensión "Trigger Email" (configurada con SendGrid) los envíe.
   Destinatarios: los correos en  config/alertas { correos: [...] }  + el correo
   del propio conductor/persona si está registrado.
   ========================================================================== */
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function diasPara(v) {
  if (!v) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const d = new Date(v + "T00:00:00"); if (isNaN(d)) return null;
  return Math.round((d - hoy) / 86400000);
}

exports.alertasVencimientos = onSchedule(
  { schedule: "0 7 * * *", timeZone: "America/Lima" },
  async () => {
    const items = [];      // alertas generales (para admin/RRHH)
    const porCorreo = {};  // alertas personales por correo del trabajador

    // 1) Documentos (unidades y conductores)
    const docs = await db.collection("documentos").get();
    docs.forEach((doc) => {
      const o = doc.data(); const dd = diasPara(o.vencimiento);
      if (dd !== null && dd >= 0 && dd <= 7) {
        items.push({ nm: o.entidad, det: o.categoria + " · " + o.tipo, dias: dd });
        if (o.correo) (porCorreo[o.correo] = porCorreo[o.correo] || []).push({ det: o.tipo, dias: dd });
      }
    });

    // 2) EMO del personal
    const per = await db.collection("rrhh").where("modulo", "==", "personal").get();
    per.forEach((doc) => {
      const o = doc.data(); const dd = diasPara(o.vcto_emo || o.fecha_emo);
      if (dd !== null && dd >= 0 && dd <= 7) {
        items.push({ nm: o.nombre, det: "EMO / Examen médico", dias: dd });
        if (o.correo_personal) (porCorreo[o.correo_personal] = porCorreo[o.correo_personal] || []).push({ det: "EMO", dias: dd });
      }
    });

    if (!items.length && !Object.keys(porCorreo).length) return;

    const fmt = (arr) => "<ul>" + arr.map((i) =>
      `<li><b>${i.nm || ""}</b> ${i.det} — vence en <b>${i.dias}</b> día(s)</li>`).join("") + "</ul>";

    // Destinatarios generales (config/alertas)
    const cfg = await db.collection("config").doc("alertas").get();
    const correos = (cfg.exists && cfg.data().correos) || [];
    if (items.length && correos.length) {
      const html = `<h3>⚠️ Vencimientos próximos — MISAGI</h3><p>Lo siguiente vence en 7 días o menos:</p>${fmt(items)}`;
      for (const to of correos) {
        await db.collection("mail").add({ to: [to], message: { subject: "⚠️ Vencimientos próximos — MISAGI", html } });
      }
    }
    // Aviso personal a cada trabajador
    for (const to of Object.keys(porCorreo)) {
      const html = `<h3>Recordatorio MISAGI</h3><p>Tienes documentos por vencer:</p>${fmt(porCorreo[to].map((x) => ({ nm: "", det: x.det, dias: x.dias })))}`;
      await db.collection("mail").add({ to: [to], message: { subject: "Tus documentos están por vencer — MISAGI", html } });
    }
  }
);
