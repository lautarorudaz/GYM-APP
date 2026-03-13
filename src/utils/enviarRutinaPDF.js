// src/utils/enviarRutinaPDF.js
// ─────────────────────────────────────────────────────────────────────────────
// Genera un PDF de la rutina, lo sube a file.io (gratis, link 24hs) y manda
// el email al alumno con un botón de descarga via EmailJS (plan free).
//
// SETUP REQUERIDO (una sola vez):
//   1. Crear cuenta en https://www.emailjs.com  (plan free = 200 emails/mes)
//   2. En EmailJS dashboard:
//      a. Add Service → Gmail → copiar SERVICE_ID
//      b. Email Templates → el body debe tener estas variables:
//           {{to_email}}      → email del alumno
//           {{to_name}}       → nombre del alumno
//           {{from_name}}     → nombre del profesor
//           {{rutina_nombre}} → nombre de la rutina
//           {{mensaje}}       → texto del profe
//           {{link_pdf}}      → link de descarga (generado por file.io)
//         From Email del template = el Gmail que conectaste como servicio
//      c. Account → Public Key → copiar PUBLIC_KEY
//   3. Reemplazar las 3 constantes de abajo con tus datos reales.
// ─────────────────────────────────────────────────────────────────────────────

// ══ CONFIGURACIÓN EmailJS ════════════════════════════════════════════════════
export const EMAILJS_SERVICE_ID = "service_g1ljl61";    // ← reemplazar
export const EMAILJS_TEMPLATE_ID = "template_mg74ulg"; // ← ya lo tenés
export const EMAILJS_PUBLIC_KEY = "plED-1pO4KhQI_VX-";    // ← Account → General

// ══ CONSTANTES DISEÑO PDF ════════════════════════════════════════════════════
const COLORES = {
    fondo: [10, 10, 10],
    card: [20, 20, 20],
    card2: [28, 28, 28],
    cyan: [0, 180, 216],
    texto: [255, 255, 255],
    textoSub: [160, 160, 160],
    textoMuted: [100, 100, 100],
    movilidad: [6, 182, 212],
    activacion: [245, 158, 11],
    general: [139, 92, 246],
    borde: [40, 40, 40],
};

const ETAPAS_CONFIG = {
    movilidad: { label: "MOVILIDAD", color: COLORES.movilidad },
    activacion: { label: "ACTIVACION", color: COLORES.activacion },
    general: { label: "GENERAL", color: COLORES.general },
};

// ══ GENERADOR DE PDF ═════════════════════════════════════════════════════════
export async function generarPDFRutina(rutina, alumno, profesor) {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, H = 297;
    const margen = 14;
    const anchoUtil = W - margen * 2;
    let y = 0;

    const setFill = (c) => doc.setFillColor(...c);
    const setStroke = (c) => doc.setDrawColor(...c);
    const setTxt = (c) => doc.setTextColor(...c);
    const setFont = (size, style = "normal") => doc.setFontSize(size).setFont("helvetica", style);
    const rect = (x, xw, yy, h, c, r = 3) => { setFill(c); doc.roundedRect(x, yy, xw, h, r, r, "F"); };
    const txt = (texto, x, yy, opts = {}) => {
        const { align = "left", maxWidth } = opts;
        maxWidth ? doc.text(texto, x, yy, { align, maxWidth }) : doc.text(texto, x, yy, { align });
    };

    const nuevaPagina = () => {
        doc.addPage();
        setFill(COLORES.fondo);
        doc.rect(0, 0, W, H, "F");
        setFill([15, 15, 15]);
        doc.rect(0, 0, W, 8, "F");
        y = 16;
    };

    const checkEspacio = (necesario) => {
        if (y + necesario > H - 16) nuevaPagina();
    };

    // ── PORTADA ───────────────────────────────────────────────────────────────
    setFill(COLORES.fondo);
    doc.rect(0, 0, W, H, "F");
    setFill(COLORES.cyan);
    doc.rect(0, 0, W, 2, "F");

    y = 22;
    setFont(9); setTxt(COLORES.cyan);
    txt("ANIMAAPP - GIMNASIO ANIMA", margen, y);
    setStroke(COLORES.borde); doc.setLineWidth(0.3);
    doc.line(margen, y + 3, W - margen, y + 3);

    y = 48;
    setFont(28, "bold"); setTxt(COLORES.texto);
    const nombreLineas = doc.splitTextToSize(rutina.nombre?.toUpperCase() || "MI RUTINA", anchoUtil);
    doc.text(nombreLineas, margen, y);
    y += nombreLineas.length * 11;

    if (rutina.descripcion) {
        y += 4;
        setFont(10); setTxt(COLORES.textoSub);
        const descLineas = doc.splitTextToSize(rutina.descripcion, anchoUtil);
        doc.text(descLineas, margen, y);
        y += descLineas.length * 5 + 4;
    }

    // Card alumno
    y += 10;
    rect(margen, anchoUtil, y, 36, COLORES.card, 4);
    setFont(8); setTxt(COLORES.textoMuted); txt("PARA", margen + 6, y + 8);
    setFont(14, "bold"); setTxt(COLORES.texto);
    txt(`${alumno.nombre || ""} ${alumno.apellido || ""}`.trim(), margen + 6, y + 17);
    setFont(9); setTxt(COLORES.textoSub);
    txt(`Sede: ${alumno.sede || "-"}`, margen + 6, y + 25);
    if (alumno.edad) txt(`Edad: ${alumno.edad} anos`, margen + anchoUtil / 2, y + 25);
    y += 44;

    // Card profesor
    rect(margen, anchoUtil, y, 24, COLORES.card, 4);
    setFont(8); setTxt(COLORES.textoMuted); txt("ENTRENADOR", margen + 6, y + 8);
    setFont(11, "bold"); setTxt(COLORES.cyan);
    txt(`${profesor?.nombre || ""} ${profesor?.apellido || ""}`.trim(), margen + 6, y + 17);
    y += 32;

    // Stats
    const semanas = rutina.semanas || [];
    const totalDias = semanas.reduce((a, s) => a + (s.dias?.length || 0), 0);
    const totalEj = semanas.reduce((a, s) =>
        a + (s.dias?.reduce((b, d) =>
            b + ["movilidad", "activacion", "general"].reduce((c, et) =>
                c + (d.etapas?.[et]?.ejercicios?.length || 0), 0), 0) || 0), 0);

    const statW = (anchoUtil - 8) / 3;
    [
        { val: semanas.length, label: "SEMANAS" },
        { val: totalDias, label: "DIAS" },
        { val: totalEj, label: "EJERCICIOS" },
    ].forEach((s, i) => {
        const sx = margen + i * (statW + 4);
        rect(sx, statW, y, 28, COLORES.card2, 4);
        setFont(18, "bold"); setTxt(COLORES.cyan);
        txt(String(s.val), sx + statW / 2, y + 13, { align: "center" });
        setFont(7); setTxt(COLORES.textoMuted);
        txt(s.label, sx + statW / 2, y + 22, { align: "center" });
    });
    y += 38;

    setFont(8); setTxt(COLORES.textoMuted);
    const fecha = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
    txt(`Generado el ${fecha}`, margen, y);
    y += 8;
    setStroke(COLORES.borde); doc.setLineWidth(0.3);
    doc.line(margen, y, W - margen, y);

    // ── PÁGINAS DE CONTENIDO ──────────────────────────────────────────────────
    semanas.forEach((semana, si) => {
        nuevaPagina();

        // Header semana
        setFill(COLORES.cyan);
        doc.rect(0, y - 6, W, 14, "F");
        setFont(14, "bold"); setTxt(COLORES.fondo);
        txt(`SEMANA ${si + 1}`, margen, y + 3);
        setFont(9);
        const diasCount = semana.dias?.length || 0;
        txt(`${diasCount} dia${diasCount !== 1 ? "s" : ""}`, W - margen, y + 3, { align: "right" });
        y += 18;

        (semana.dias || []).forEach((dia, di) => {
            const ejTotal = ["movilidad", "activacion", "general"].reduce((a, et) =>
                a + (dia.etapas?.[et]?.ejercicios?.length || 0), 0);

            checkEspacio(22);

            // Header día
            rect(margen, anchoUtil, y, 14, COLORES.card, 3);
            setFont(11, "bold"); setTxt(COLORES.texto); txt(`DIA ${di + 1}`, margen + 6, y + 9);
            setFont(8); setTxt(COLORES.textoMuted);
            txt(`${ejTotal} ejercicio${ejTotal !== 1 ? "s" : ""}`, W - margen - 4, y + 9, { align: "right" });
            y += 18;

            // Etapas
            ["movilidad", "activacion", "general"].forEach((etId) => {
                const etConf = ETAPAS_CONFIG[etId];
                const ejercicios = dia.etapas?.[etId]?.ejercicios || [];
                if (!ejercicios.length) return;

                checkEspacio(14 + ejercicios.length * 14);

                // Label etapa
                setFont(7, "bold"); setTxt(etConf.color);
                txt(`  ${etConf.label}`, margen + 2, y + 5);
                setStroke(etConf.color); doc.setLineWidth(0.5);
                doc.line(margen + 24, y + 2, W - margen, y + 2);
                y += 9;

                // Headers tabla
                const colX = margen + 2;
                const colSer = W - margen - 44;
                const colRep = W - margen - 26;
                const colDes = W - margen - 8;

                setFont(6.5, "bold"); setTxt(COLORES.textoMuted);
                txt("EJERCICIO", colX, y);
                txt("SERIES", colSer, y, { align: "right" });
                txt("REPS", colRep, y, { align: "right" });
                txt("DESC.", colDes, y, { align: "right" });
                y += 4;
                setStroke(COLORES.borde); doc.setLineWidth(0.2);
                doc.line(margen, y, W - margen, y);
                y += 4;

                ejercicios.forEach((ej, ei) => {
                    checkEspacio(12);

                    // Fondo alternado
                    if (ei % 2 === 0) {
                        setFill([18, 18, 18]);
                        doc.rect(margen, y - 3, anchoUtil, 10, "F");
                    }

                    const nombreCorto = doc.splitTextToSize(ej.nombre || "-", colSer - colX - 6)[0];
                    setFont(8.5); setTxt(COLORES.texto); txt(nombreCorto, colX, y + 3);
                    setFont(8); setTxt(COLORES.cyan); txt(ej.series || "-", colSer, y + 3, { align: "right" });
                    setTxt(COLORES.texto); txt(ej.reps || "-", colRep, y + 3, { align: "right" });
                    setTxt(COLORES.textoSub); txt(ej.descanso || "-", colDes, y + 3, { align: "right" });
                    y += 10;

                    if (ej.obs?.trim()) {
                        checkEspacio(10);
                        setFont(7); setTxt(COLORES.activacion);
                        const obsLineas = doc.splitTextToSize(`  * ${ej.obs}`, anchoUtil - 8);
                        doc.text(obsLineas, colX, y);
                        y += obsLineas.length * 4 + 2;
                    }
                });
                y += 4;
            });
            y += 4;
        });
    });

    // ── PIE DE ÚLTIMA PÁGINA ──────────────────────────────────────────────────
    checkEspacio(40);
    y += 8;
    setStroke(COLORES.borde); doc.setLineWidth(0.3);
    doc.line(margen, y, W - margen, y);
    y += 10;
    setFont(8); setTxt(COLORES.textoMuted);
    txt("Mucho exito con tu entrenamiento!", W / 2, y, { align: "center" });
    y += 6;
    setFont(7); setTxt(COLORES.textoMuted);
    txt("Rutina generada por AnimaApp - Gimnasio Anima", W / 2, y, { align: "center" });
    setFill(COLORES.cyan);
    doc.rect(0, H - 2, W, 2, "F");

    return doc;
}

// ══ DESCARGA LOCAL (sin email) ════════════════════════════════════════════════
export async function descargarPDFRutina(rutina, alumno, profesor) {
    const doc = await generarPDFRutina(rutina, alumno, profesor);
    const nombre = `Rutina_${(alumno.nombre || "alumno").replace(/\s+/g, "_")}_${(rutina.nombre || "rutina").replace(/\s+/g, "_")}.pdf`;
    doc.save(nombre);
}

// ══ SUBIR PDF A FILE.IO (gratis, link dura 24hs) ══════════════════════════════
async function subirPDFaFileIO(doc, nombreArchivo) {
    const pdfBlob = doc.output("blob");

    const formData = new FormData();
    formData.append("file", pdfBlob, nombreArchivo);
    formData.append("expires", "1d");       // link válido 1 día
    formData.append("maxDownloads", "10");  // hasta 10 descargas
    formData.append("autoDelete", "true");

    const response = await fetch("https://file.io", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) throw new Error(`Error al subir el PDF (status ${response.status})`);

    const data = await response.json();
    if (!data.success || !data.link) throw new Error("file.io no devolvio un link valido");

    return data.link; // ej: "https://file.io/aBcDeF"
}

// ══ ENVÍO POR EMAIL (EmailJS + link de descarga) ══════════════════════════════
export async function enviarRutinaPorEmail(rutina, alumno, profesor, mensajePersonal = "") {
    if (!alumno.email) throw new Error("El alumno no tiene email registrado.");

    // 1. Generar el PDF en memoria
    const doc = await generarPDFRutina(rutina, alumno, profesor);

    // 2. Subirlo a file.io y obtener el link
    const nombreArchivo = `Rutina_${(alumno.nombre || "alumno").replace(/\s+/g, "_")}.pdf`;
    const linkPDF = await subirPDFaFileIO(doc, nombreArchivo);

    // 3. Mandar el email con el link incluido
    const emailjs = await import("@emailjs/browser");

    await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
            to_email: alumno.email,
            to_name: `${alumno.nombre || ""} ${alumno.apellido || ""}`.trim(),
            from_name: `${profesor?.nombre || ""} ${profesor?.apellido || ""}`.trim(),
            rutina_nombre: rutina.nombre || "Tu rutina",
            mensaje: mensajePersonal || `Hola ${alumno.nombre || ""}! Te envio tu rutina de entrenamiento. Mucho exito!`,
            link_pdf: linkPDF,
        },
        EMAILJS_PUBLIC_KEY
    );

    return linkPDF;
}