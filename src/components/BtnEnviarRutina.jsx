// src/components/BtnEnviarRutina.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Botón que va en la fila del alumno (vista "alumnos" del ProfesorDashboard).
// Busca la última rutina asignada al alumno en "rutinas_asignadas", genera
// el PDF y lo envía por email. Si el alumno no tiene email, muestra alerta.
//
// USO en ProfesorDashboard.jsx (dentro del map de alumnosVistaFiltrados):
//
//   import BtnEnviarRutina from "../../components/BtnEnviarRutina";
//
//   <BtnEnviarRutina alumno={a} miDoc={miDoc} />
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { enviarRutinaPorEmail, descargarPDFRutina } from "../utils/enviarRutinaPDF";

const FB = "'DM Sans', sans-serif";

export default function BtnEnviarRutina({ alumno, miDoc }) {
    const [estado, setEstado] = useState("idle"); // idle | cargando | confirm | enviando | ok | error
    const [rutina, setRutina] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // ── 1. Click inicial: buscar rutina asignada ──────────────────────────────
    const handleClick = async () => {
        if (!alumno.tieneRutina) {
            alert("Este alumno todavía no tiene una rutina asignada.");
            return;
        }
        setEstado("cargando");
        setErrorMsg("");
        try {
            const snap = await getDocs(
                query(
                    collection(db, "rutinas_asignadas"),
                    where("alumnoId", "==", alumno.id),
                    orderBy("asignadoEn", "desc"),
                    limit(1)
                )
            );
            if (snap.empty) {
                setErrorMsg("No se encontró ninguna rutina asignada.");
                setEstado("error");
                return;
            }
            const rutinaData = { id: snap.docs[0].id, ...snap.docs[0].data() };
            setRutina(rutinaData);
            setMensaje(`Hola ${alumno.nombre}! Te envío tu rutina "${rutinaData.nombre}". ¡Mucho éxito en el entrenamiento!`);
            setEstado("confirm");
        } catch (e) {
            setErrorMsg("Error al buscar la rutina: " + e.message);
            setEstado("error");
        }
    };

    // ── 2. Enviar por email ───────────────────────────────────────────────────
    const handleEnviar = async () => {
        setEstado("enviando");
        try {
            await enviarRutinaPorEmail(rutina, alumno, miDoc, mensaje);
            setEstado("ok");
            setTimeout(() => setEstado("idle"), 3000);
        } catch (e) {
            setErrorMsg(e.message);
            setEstado("error");
        }
    };

    // ── 3. Solo descargar PDF (fallback si no tiene email) ────────────────────
    const handleDescargar = async () => {
        setEstado("enviando");
        try {
            await descargarPDFRutina(rutina, alumno, miDoc);
            setEstado("idle");
        } catch (e) {
            setErrorMsg(e.message);
            setEstado("error");
        }
    };

    const cerrar = () => { setEstado("idle"); setRutina(null); setErrorMsg(""); setMensaje(""); };

    // ── RENDER BOTÓN ──────────────────────────────────────────────────────────
    return (
        <>
            <button
                className="alumnos-btn-action"
                onClick={handleClick}
                disabled={estado === "cargando" || estado === "enviando"}
                title={alumno.tieneRutina ? "Enviar rutina por email" : "Sin rutina asignada"}
                style={{
                    borderColor: estado === "ok"
                        ? "rgba(34,197,94,0.4)"
                        : alumno.tieneRutina
                            ? "rgba(0,180,216,0.3)"
                            : "rgba(255,255,255,0.08)",
                    color: estado === "ok"
                        ? "#22c55e"
                        : alumno.tieneRutina
                            ? "#00b4d8"
                            : "rgba(255,255,255,0.25)",
                    opacity: alumno.tieneRutina ? 1 : 0.5,
                    cursor: alumno.tieneRutina ? "pointer" : "not-allowed",
                    minWidth: 36,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                }}
            >
                {estado === "cargando" && <SpinnerMini />}
                {estado === "enviando" && <SpinnerMini />}
                {estado === "ok" && "✅"}
                {estado === "idle" && "📧"}
                {estado === "confirm" && "📧"}
                {estado === "error" && "⚠️"}
                {estado === "ok" ? " Enviado" : ""}
            </button>

            {/* ── MODAL CONFIRMACIÓN ─────────────────────────────────────────── */}
            {(estado === "confirm" || estado === "enviando" || estado === "error") && (
                <>
                    {/* Overlay */}
                    <div
                        onClick={cerrar}
                        style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
                    />

                    {/* Panel */}
                    <div style={{
                        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                        zIndex: 501, background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 20, width: "min(480px,95vw)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
                        overflow: "hidden",
                    }}>
                        {/* Header */}
                        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ fontFamily: FB, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(0,180,216,0.7)", margin: "0 0 4px" }}>
                                    Enviar rutina por email
                                </p>
                                <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 2, color: "white", margin: 0 }}>
                                    {alumno.nombre} {alumno.apellido || ""}
                                </h3>
                            </div>
                            <button onClick={cerrar} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer" }}>×</button>
                        </div>

                        <div style={{ padding: "20px 24px" }}>
                            {/* Info rutina */}
                            {rutina && (
                                <div style={{ background: "rgba(0,180,216,0.05)", border: "1px solid rgba(0,180,216,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 18 }}>
                                    <p style={{ fontFamily: FB, fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "0 0 4px" }}>Rutina a enviar</p>
                                    <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2, color: "white", margin: 0 }}>{rutina.nombre}</p>
                                    {rutina.semanas && (
                                        <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(0,180,216,0.7)", margin: "4px 0 0" }}>
                                            {rutina.semanas.length} semana{rutina.semanas.length !== 1 ? "s" : ""} · {
                                                rutina.semanas.reduce((a, s) => a + (s.dias?.length || 0), 0)
                                            } días
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Email destino */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>
                                    Email del alumno
                                </label>
                                {alumno.email ? (
                                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 14 }}>✉️</span>
                                        <span style={{ fontFamily: FB, fontSize: 14, color: "white" }}>{alumno.email}</span>
                                    </div>
                                ) : (
                                    <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "11px 14px" }}>
                                        <p style={{ fontFamily: FB, fontSize: 13, color: "#f87171", margin: 0 }}>
                                            ⚠️ Este alumno no tiene email registrado. Podés descargar el PDF y enviarlo manualmente.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Mensaje personalizado */}
                            {alumno.email && (
                                <div style={{ marginBottom: 18 }}>
                                    <label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>
                                        Mensaje personalizado <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>— opcional</span>
                                    </label>
                                    <textarea
                                        value={mensaje}
                                        onChange={e => setMensaje(e.target.value)}
                                        rows={3}
                                        disabled={estado === "enviando"}
                                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "white", fontFamily: FB, fontSize: 14, resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }}
                                    />
                                </div>
                            )}

                            {/* Error */}
                            {estado === "error" && errorMsg && (
                                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
                                    <p style={{ fontFamily: FB, fontSize: 13, color: "#f87171", margin: 0 }}>⚠️ {errorMsg}</p>
                                </div>
                            )}

                            {/* Botones */}
                            <div style={{ display: "flex", gap: 10 }}>
                                <button onClick={handleDescargar} disabled={estado === "enviando" || !rutina} style={{ flex: 1, fontFamily: FB, fontSize: 13, fontWeight: 500, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", padding: "12px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "white" }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)" }}>
                                    ⬇️ Descargar PDF
                                </button>

                                {alumno.email && (
                                    <button
                                        onClick={handleEnviar}
                                        disabled={estado === "enviando"}
                                        style={{ flex: 2, fontFamily: FB, fontSize: 14, fontWeight: 700, background: estado === "enviando" ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "12px", borderRadius: 12, cursor: estado === "enviando" ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                                    >
                                        {estado === "enviando" ? (
                                            <><SpinnerMini color="white" /> Enviando...</>
                                        ) : (
                                            "📧 Enviar por email"
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Aclaración */}
                            <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
                                El PDF se genera automáticamente con toda la rutina detallada.<br />
                                El alumno lo recibe directo en su casilla de correo.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

// ── Spinner mini inline ───────────────────────────────────────────────────────
function SpinnerMini({ color = "#00b4d8" }) {
    return (
        <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${color}33`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite" }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </span>
    );
}