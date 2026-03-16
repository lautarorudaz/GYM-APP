// src/utils/enviarRutinaPDF.js

export const EMAILJS_SERVICE_ID = "service_lq8y3ws";
export const EMAILJS_TEMPLATE_ID = "template_mg74ulg";
export const EMAILJS_PUBLIC_KEY = "plED-1pO4KhQI_VX-";

// ── URL base de la app deployada ─────────────────────────────────────────────
// Cuando hagas deploy con Firebase Hosting vas a obtener una URL tipo:
//   https://gym-app-XXXXXX.web.app
// Reemplazá este valor con esa URL (sin barra al final).
// En localhost funciona igual para desarrollo.
export const APP_BASE_URL = import.meta.env.VITE_APP_URL || "https://gym-app-636cb.web.app";

// ══ DISEÑO PDF ════════════════════════════════════════════════════════════════
const C = {
    fondo: [10, 10, 10], card: [20, 20, 20], card2: [28, 28, 28],
    cyan: [0, 180, 216], texto: [255, 255, 255], sub: [160, 160, 160],
    muted: [100, 100, 100], mov: [6, 182, 212], act: [245, 158, 11],
    gen: [139, 92, 246], borde: [40, 40, 40],
};
const ET = {
    movilidad: { label: "MOVILIDAD", color: C.mov },
    activacion: { label: "ACTIVACION", color: C.act },
    general: { label: "GENERAL", color: C.gen },
};

// ══ GENERADOR PDF ════════════════════════════════════════════════════════════
export async function generarPDFRutina(rutina, alumno, profesor) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, H = 297, m = 14, aw = W - m * 2;
    let y = 0;

    const sf = (c) => doc.setFillColor(...c);
    const ss = (c) => doc.setDrawColor(...c);
    const st = (c) => doc.setTextColor(...c);
    const fn = (sz, sty = "normal") => doc.setFontSize(sz).setFont("helvetica", sty);
    const rx = (x, w, yy, h, c, r = 3) => { sf(c); doc.roundedRect(x, yy, w, h, r, r, "F"); };
    const tx = (s, x, yy, o = {}) => {
        const { align = "left", maxWidth } = o;
        maxWidth ? doc.text(s, x, yy, { align, maxWidth }) : doc.text(s, x, yy, { align });
    };
    const np = () => {
        doc.addPage(); sf(C.fondo); doc.rect(0, 0, W, H, "F");
        sf([15, 15, 15]); doc.rect(0, 0, W, 8, "F"); y = 16;
    };
    const ck = (n) => { if (y + n > H - 16) np(); };

    // PORTADA
    sf(C.fondo); doc.rect(0, 0, W, H, "F");
    sf(C.cyan); doc.rect(0, 0, W, 2, "F");
    y = 22; fn(9); st(C.cyan); tx("ANIMAAPP - GIMNASIO ANIMA", m, y);
    ss(C.borde); doc.setLineWidth(0.3); doc.line(m, y + 3, W - m, y + 3);

    y = 48; fn(28, "bold"); st(C.texto);
    const nl = doc.splitTextToSize(rutina.nombre?.toUpperCase() || "MI RUTINA", aw);
    doc.text(nl, m, y); y += nl.length * 11;

    if (rutina.descripcion) {
        y += 4; fn(10); st(C.sub);
        const dl = doc.splitTextToSize(rutina.descripcion, aw);
        doc.text(dl, m, y); y += dl.length * 5 + 4;
    }

    y += 10;
    rx(m, aw, y, 36, C.card, 4);
    fn(8); st(C.muted); tx("PARA", m + 6, y + 8);
    fn(14, "bold"); st(C.texto); tx(`${alumno.nombre || ""} ${alumno.apellido || ""}`.trim(), m + 6, y + 17);
    fn(9); st(C.sub); tx(`Sede: ${alumno.sede || "-"}`, m + 6, y + 25);
    if (alumno.edad) tx(`Edad: ${alumno.edad} anos`, m + aw / 2, y + 25);
    y += 44;

    rx(m, aw, y, 24, C.card, 4);
    fn(8); st(C.muted); tx("ENTRENADOR", m + 6, y + 8);
    fn(11, "bold"); st(C.cyan); tx(`${profesor?.nombre || ""} ${profesor?.apellido || ""}`.trim(), m + 6, y + 17);
    y += 32;

    const sems = rutina.semanas || [];
    const tdias = sems.reduce((a, s) => a + (s.dias?.length || 0), 0);
    const tej = sems.reduce((a, s) => a + (s.dias?.reduce((b, d) => b + ["movilidad", "activacion", "general"].reduce((c, et) => c + (d.etapas?.[et]?.ejercicios?.length || 0), 0), 0) || 0), 0);
    const sw = (aw - 8) / 3;
    [{ val: sems.length, label: "SEMANAS" }, { val: tdias, label: "DIAS" }, { val: tej, label: "EJERCICIOS" }].forEach((s, i) => {
        const sx = m + i * (sw + 4);
        rx(sx, sw, y, 28, C.card2, 4);
        fn(18, "bold"); st(C.cyan); tx(String(s.val), sx + sw / 2, y + 13, { align: "center" });
        fn(7); st(C.muted); tx(s.label, sx + sw / 2, y + 22, { align: "center" });
    });
    y += 38;
    fn(8); st(C.muted);
    tx(`Generado el ${new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}`, m, y);
    y += 8; ss(C.borde); doc.setLineWidth(0.3); doc.line(m, y, W - m, y);

    // CONTENIDO
    sems.forEach((sem, si) => {
        np();
        sf(C.cyan); doc.rect(0, y - 6, W, 14, "F");
        fn(14, "bold"); st(C.fondo); tx(`SEMANA ${si + 1}`, m, y + 3);
        const dc = sem.dias?.length || 0;
        fn(9); tx(`${dc} dia${dc !== 1 ? "s" : ""}`, W - m, y + 3, { align: "right" });
        y += 18;

        (sem.dias || []).forEach((dia, di) => {
            const ejt = ["movilidad", "activacion", "general"].reduce((a, et) => a + (dia.etapas?.[et]?.ejercicios?.length || 0), 0);
            ck(22);
            rx(m, aw, y, 14, C.card, 3);
            fn(11, "bold"); st(C.texto); tx(`DIA ${di + 1}`, m + 6, y + 9);
            fn(8); st(C.muted); tx(`${ejt} ejercicio${ejt !== 1 ? "s" : ""}`, W - m - 4, y + 9, { align: "right" });
            y += 18;

            ["movilidad", "activacion", "general"].forEach(etId => {
                const etc = ET[etId];
                const ejs = dia.etapas?.[etId]?.ejercicios || [];
                if (!ejs.length) return;
                ck(14 + ejs.length * 14);
                fn(7, "bold"); st(etc.color); tx(`  ${etc.label}`, m + 2, y + 5);
                ss(etc.color); doc.setLineWidth(0.5); doc.line(m + 24, y + 2, W - m, y + 2);
                y += 9;
                const cx = m + 2, cs = W - m - 44, cr = W - m - 26, cd = W - m - 8;
                fn(6.5, "bold"); st(C.muted);
                tx("EJERCICIO", cx, y); tx("SERIES", cs, y, { align: "right" });
                tx("REPS", cr, y, { align: "right" }); tx("DESC.", cd, y, { align: "right" });
                y += 4; ss(C.borde); doc.setLineWidth(0.2); doc.line(m, y, W - m, y); y += 4;

                ejs.forEach((ej, ei) => {
                    const tieneObs = ej.obs?.trim();
                    const altoFila = tieneObs ? 10 : 10;
                    ck(tieneObs ? 22 : 12);
                    if (ei % 2 === 0) { sf([18, 18, 18]); doc.rect(m, y - 3, aw, tieneObs ? 20 : 10, "F"); }
                    const nc = doc.splitTextToSize(ej.nombre || "-", cs - cx - 6)[0];
                    fn(8.5); st(C.texto); tx(nc, cx, y + 3);
                    fn(8); st(C.cyan); tx(ej.series || "-", cs, y + 3, { align: "right" });
                    st(C.texto); tx(ej.reps || "-", cr, y + 3, { align: "right" });
                    st(C.sub); tx(ej.descanso || "-", cd, y + 3, { align: "right" });
                    y += 10;
                    if (tieneObs) {
                        ck(12);
                        // Fondo amarillo suave para la obs
                        sf([40, 35, 10]); doc.rect(m, y - 1, aw, 8, "F");
                        // Línea izquierda amarilla
                        sf(C.act); doc.rect(m, y - 1, 2, 8, "F");
                        fn(7); st(C.act);
                        const obsCorta = doc.splitTextToSize(`Obs: ${ej.obs}`, aw - 10)[0];
                        tx(obsCorta, cx + 4, y + 4);
                        y += 10;
                    }
                });
                y += 4;
            });
            y += 4;
        });
    });

    ck(40); y += 8;
    ss(C.borde); doc.setLineWidth(0.3); doc.line(m, y, W - m, y); y += 10;
    fn(8); st(C.muted); tx("Mucho exito con tu entrenamiento!", W / 2, y, { align: "center" }); y += 6;
    fn(7); tx("AnimaApp - Gimnasio Anima", W / 2, y, { align: "center" });
    sf(C.cyan); doc.rect(0, H - 2, W, 2, "F");

    return doc;
}

// ══ DESCARGA LOCAL ════════════════════════════════════════════════════════════
export async function descargarPDFRutina(rutina, alumno, profesor) {
    const doc = await generarPDFRutina(rutina, alumno, profesor);
    doc.save(`Rutina_${(alumno.nombre || "alumno").replace(/\s+/g, "_")}.pdf`);
}

// ══ ENVÍO POR EMAIL CON LINK DE DESCARGA ══════════════════════════════════════
export async function enviarEmailNotificacion(rutina, alumno, profesor, mensajePersonal = "") {
    if (!alumno.email) throw new Error("El alumno no tiene email registrado.");

    const sems = rutina.semanas || [];
    const tdias = sems.reduce((a, s) => a + (s.dias?.length || 0), 0);
    const tej = sems.reduce((a, s) => a + (s.dias?.reduce((b, d) => b + ["movilidad", "activacion", "general"].reduce((c, et) => c + (d.etapas?.[et]?.ejercicios?.length || 0), 0), 0) || 0), 0);
    const resumen = `${sems.length} semana${sems.length !== 1 ? "s" : ""} · ${tdias} días · ${tej} ejercicios`;

    // Link directo a la página de descarga (funciona cuando la app está deployada)
    const linkDescarga = `${APP_BASE_URL}/rutina/${rutina.id}`;

    const emailjs = await import("@emailjs/browser");

    await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
            to_email: alumno.email,
            to_name: `${alumno.nombre || ""} ${alumno.apellido || ""}`.trim(),
            from_name: `${profesor?.nombre || ""} ${profesor?.apellido || ""}`.trim(),
            rutina_nombre: rutina.nombre || "Tu rutina",
            resumen,
            link_descarga: linkDescarga,
            mensaje: mensajePersonal ||
                `Hola ${alumno.nombre || ""}! Tu entrenador te preparó una nueva rutina de entrenamiento.`,
        },
        EMAILJS_PUBLIC_KEY
    );
}