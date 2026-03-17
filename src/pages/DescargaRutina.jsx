// src/pages/DescargaRutina.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Página PÚBLICA (sin login) accesible en /rutina/:rutinaId
// Al abrirse busca la rutina en Firestore y descarga el PDF automáticamente.
// El alumno solo hace clic en el link del email y el PDF se descarga solo.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { generarPDFRutina } from "../utils/enviarRutinaPDF";

const FB = "'DM Sans', sans-serif";
const FT = "'Bebas Neue', sans-serif";

export default function DescargaRutina() {
    const { rutinaId } = useParams();
    const [estado, setEstado] = useState("cargando"); // cargando | descargando | ok | error
    const [errorMsg, setErrorMsg] = useState("");
    const [rutinaNombre, setRutinaNombre] = useState("");
    const [alumnoNombre, setAlumnoNombre] = useState("");

    useEffect(() => {
        if (rutinaId) iniciarDescarga();
    }, [rutinaId]);

    const iniciarDescarga = async () => {
        try {
            setEstado("cargando");

            // 1. Buscar rutina asignada
            const rutinaRef = doc(db, "rutinas_asignadas", rutinaId);
            const rutinaSnap = await getDoc(rutinaRef);

            if (!rutinaSnap.exists()) {
                setErrorMsg("No se encontró esta rutina. El link puede haber expirado.");
                setEstado("error");
                return;
            }

            const rutina = { id: rutinaSnap.id, ...rutinaSnap.data() };
            setRutinaNombre(rutina.nombre || "Rutina");

            // 2. Buscar datos del alumno
            let alumno = { nombre: rutina.alumnoNombre || "Alumno", apellido: "", sede: "" };
            if (rutina.alumnoId) {
                try {
                    const alumnoSnap = await getDoc(doc(db, "usuarios", rutina.alumnoId));
                    if (alumnoSnap.exists()) alumno = { id: alumnoSnap.id, ...alumnoSnap.data() };
                } catch (_) { /* usar nombre guardado en la rutina */ }
            }
            setAlumnoNombre(`${alumno.nombre} ${alumno.apellido || ""}`.trim());

            // 3. Buscar datos del profesor
            let profesor = { nombre: "Tu entrenador", apellido: "" };
            if (rutina.profesorId) {
                try {
                    const profSnap = await getDoc(doc(db, "usuarios", rutina.profesorId));
                    if (profSnap.exists()) profesor = { id: profSnap.id, ...profSnap.data() };
                } catch (_) { }
            }

            // 4. Generar y descargar PDF
            setEstado("descargando");
            const pdfDoc = await generarPDFRutina(rutina, alumno, profesor);
            pdfDoc.save(`Rutina_${(alumno.nombre || "alumno").replace(/\s+/g, "_")}_${(rutina.nombre || "rutina").replace(/\s+/g, "_")}.pdf`);

            setEstado("ok");

        } catch (e) {
            console.error(e);
            setErrorMsg("Ocurrió un error al generar el PDF: " + e.message);
            setEstado("error");
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: FB,
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

            <div style={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 24,
                padding: "48px 40px",
                maxWidth: 460,
                width: "100%",
                textAlign: "center",
                animation: "fadeIn 0.4s ease",
                boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
            }}>

                {/* Logo */}
                <div style={{ marginBottom: 32 }}>
                    <p style={{ fontFamily: FT, fontSize: 32, letterSpacing: 4, color: "#00b4d8", lineHeight: 1 }}>
                        ANIMA
                    </p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 3, marginTop: 4 }}>
                        GIMNASIO · APP
                    </p>
                </div>

                {/* ── CARGANDO ── */}
                {(estado === "cargando" || estado === "descargando") && (
                    <>
                        <div style={{
                            width: 64, height: 64,
                            border: "3px solid rgba(0,180,216,0.15)",
                            borderTopColor: "#00b4d8",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                            margin: "0 auto 24px",
                        }} />
                        <p style={{ fontFamily: FT, fontSize: 24, letterSpacing: 2, color: "white", marginBottom: 8 }}>
                            {estado === "cargando" ? "BUSCANDO RUTINA" : "GENERANDO PDF"}
                        </p>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", animation: "pulse 1.5s ease infinite" }}>
                            {estado === "cargando" ? "Un momento..." : "Preparando tu PDF de entrenamiento..."}
                        </p>
                    </>
                )}

                {/* ── OK ── */}
                {estado === "ok" && (
                    <>
                        <div style={{
                            width: 72, height: 72,
                            background: "rgba(34,197,94,0.1)",
                            border: "2px solid rgba(34,197,94,0.3)",
                            borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 36, margin: "0 auto 24px",
                        }}>✅</div>

                        <p style={{ fontFamily: FT, fontSize: 26, letterSpacing: 2, color: "white", marginBottom: 8 }}>
                            ¡PDF DESCARGADO!
                        </p>
                        {alumnoNombre && (
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
                                Para: <strong style={{ color: "white" }}>{alumnoNombre}</strong>
                            </p>
                        )}
                        {rutinaNombre && (
                            <div style={{
                                background: "rgba(0,180,216,0.06)",
                                border: "1px solid rgba(0,180,216,0.2)",
                                borderRadius: 12, padding: "12px 20px", margin: "16px 0",
                            }}>
                                <p style={{ fontSize: 11, color: "rgba(0,180,216,0.7)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Rutina descargada</p>
                                <p style={{ fontFamily: FT, fontSize: 20, letterSpacing: 2, color: "white" }}>{rutinaNombre}</p>
                            </div>
                        )}
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, marginBottom: 24 }}>
                            El PDF se descargó automáticamente.<br />
                            Si no lo ves, revisá la carpeta de <strong style={{ color: "white" }}>Descargas</strong>.
                        </p>

                        {/* Botón para descargar de nuevo */}
                        <button onClick={iniciarDescarga} style={{
                            fontFamily: FB, fontSize: 14, fontWeight: 700,
                            background: "linear-gradient(135deg,#00b4d8,#0077b6)",
                            border: "none", color: "white", padding: "14px 28px",
                            borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                        }}
                            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                        >
                            ⬇️ Descargar de nuevo
                        </button>
                    </>
                )}

                {/* ── ERROR ── */}
                {estado === "error" && (
                    <>
                        <div style={{
                            width: 72, height: 72,
                            background: "rgba(239,68,68,0.08)",
                            border: "2px solid rgba(239,68,68,0.25)",
                            borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 36, margin: "0 auto 24px",
                        }}>⚠️</div>
                        <p style={{ fontFamily: FT, fontSize: 24, letterSpacing: 2, color: "white", marginBottom: 12 }}>
                            ALGO SALIÓ MAL
                        </p>
                        <p style={{ fontSize: 13, color: "rgba(239,68,68,0.8)", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 24, lineHeight: 1.5 }}>
                            {errorMsg}
                        </p>
                        <button onClick={iniciarDescarga} style={{
                            fontFamily: FB, fontSize: 14, fontWeight: 600,
                            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                            color: "white", padding: "13px 24px", borderRadius: 12, cursor: "pointer",
                        }}>
                            🔄 Intentar de nuevo
                        </button>
                    </>
                )}

                {/* Footer */}
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 32 }}>
                    Gimnasio Anima · AnimaApp
                </p>
            </div>
        </div>
    );
}
