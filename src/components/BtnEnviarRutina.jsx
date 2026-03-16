// src/components/BtnEnviarRutina.jsx
import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { enviarEmailNotificacion, descargarPDFRutina } from "../utils/enviarRutinaPDF";

const FB = "'DM Sans', sans-serif";
const FT = "'Bebas Neue', sans-serif";

export default function BtnEnviarRutina({ alumno, miDoc }) {
    const [estado, setEstado] = useState("idle"); // idle | cargando | confirm | enviando | ok | error
    const [rutina, setRutina] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // ── Buscar rutina asignada (sin orderBy para no necesitar índice) ──────────
    const handleClick = async () => {
        if (!alumno?.tieneRutina) {
            alert("Este alumno todavía no tiene una rutina asignada.");
            return;
        }
        setEstado("cargando");
        setErrorMsg("");
        try {
            const snap = await getDocs(
                query(collection(db, "rutinas_asignadas"), where("alumnoId", "==", alumno.id))
            );
            if (snap.empty) {
                setErrorMsg("No se encontró ninguna rutina asignada para este alumno.");
                setEstado("error");
                return;
            }
            // Tomar la más reciente comparando el campo asignadoEn manualmente
            const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const masReciente = todas.sort((a, b) => {
                const fa = a.asignadoEn?.toMillis?.() || 0;
                const fb = b.asignadoEn?.toMillis?.() || 0;
                return fb - fa;
            })[0];

            setRutina(masReciente);
            setMensaje(
                `Hola ${alumno.nombre}! Te envío tu rutina "${masReciente.nombre}". ¡Mucho éxito en el entrenamiento!`
            );
            setEstado("confirm");
        } catch (e) {
            setErrorMsg("Error al buscar la rutina: " + e.message);
            setEstado("error");
        }
    };

    // ── Enviar por email ──────────────────────────────────────────────────────
    const handleEnviar = async () => {
        if (!rutina) return;
        // Seguridad: si miDoc todavía no cargó, usar objeto vacío
        const profe = miDoc || { nombre: "Tu entrenador", apellido: "" };
        setEstado("enviando");
        try {
            await enviarEmailNotificacion(rutina, alumno, profe, mensaje);
            setEstado("ok");
            setTimeout(() => setEstado("idle"), 3500);
        } catch (e) {
            setErrorMsg(e.message);
            setEstado("error");
        }
    };

    // ── Descargar PDF ─────────────────────────────────────────────────────────
    const handleDescargar = async () => {
        // Si no tenemos rutina aún, la buscamos primero
        let rutinaAUsar = rutina;
        if (!rutinaAUsar) {
            if (!alumno?.tieneRutina) { alert("Este alumno no tiene rutina asignada."); return; }
            try {
                const snap = await getDocs(
                    query(collection(db, "rutinas_asignadas"), where("alumnoId", "==", alumno.id))
                );
                if (snap.empty) { alert("No se encontró rutina asignada."); return; }
                const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                rutinaAUsar = todas.sort((a, b) => {
                    const fa = a.asignadoEn?.toMillis?.() || 0;
                    const fb = b.asignadoEn?.toMillis?.() || 0;
                    return fb - fa;
                })[0];
                setRutina(rutinaAUsar);
            } catch (e) {
                alert("Error al buscar la rutina: " + e.message);
                return;
            }
        }

        const profe = miDoc || { nombre: "Entrenador", apellido: "" };
        setEstado("enviando");
        try {
            await descargarPDFRutina(rutinaAUsar, alumno, profe);
            setEstado(rutina ? "confirm" : "idle"); // volver al estado anterior
        } catch (e) {
            setErrorMsg("Error al generar el PDF: " + e.message);
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
                title={alumno?.tieneRutina ? "Enviar rutina por email" : "Sin rutina asignada"}
                style={{
                    borderColor: estado === "ok"
                        ? "rgba(34,197,94,0.4)"
                        : alumno?.tieneRutina
                            ? "rgba(0,180,216,0.3)"
                            : "rgba(255,255,255,0.08)",
                    color: estado === "ok"
                        ? "#22c55e"
                        : alumno?.tieneRutina
                            ? "#00b4d8"
                            : "rgba(255,255,255,0.2)",
                    opacity: alumno?.tieneRutina ? 1 : 0.4,
                    cursor: alumno?.tieneRutina ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 12px",
                }}
            >
                {(estado === "cargando" || estado === "enviando") && <SpinnerMini />}
                {estado !== "cargando" && estado !== "enviando" && (
                    <span>{estado === "ok" ? "✅" : "📧"}</span>
                )}
                <span style={{ fontSize: 12 }}>
                    {estado === "ok" ? "Enviado" : "PDF"}
                </span>
            </button>

            {/* ── MODAL ──────────────────────────────────────────────────────── */}
            {(estado === "confirm" || estado === "enviando" || estado === "error") && (
                <>
                    <div
                        onClick={cerrar}
                        style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }}
                    />
                    <div style={{
                        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                        zIndex: 501, background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 20, width: "min(480px,95vw)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
                        overflow: "hidden",
                    }}>
                        {/* Header */}
                        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ fontFamily: FB, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(0,180,216,0.7)", margin: "0 0 4px" }}>
                                    ENVIAR RUTINA POR EMAIL
                                </p>
                                <h3 style={{ fontFamily: FT, fontSize: 22, letterSpacing: 2, color: "white", margin: 0 }}>
                                    {alumno?.nombre?.toUpperCase()} {(alumno?.apellido || "").toUpperCase()}
                                </h3>
                            </div>
                            <button onClick={cerrar} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
                        </div>

                        <div style={{ padding: "20px 24px" }}>
                            {/* Info rutina */}
                            {rutina && (
                                <div style={{ background: "rgba(0,180,216,0.05)", border: "1px solid rgba(0,180,216,0.15)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                                    <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 4px", letterSpacing: 1, textTransform: "uppercase" }}>Rutina a enviar</p>
                                    <p style={{ fontFamily: FT, fontSize: 18, letterSpacing: 2, color: "white", margin: 0 }}>{rutina.nombre}</p>
                                    {rutina.semanas && (
                                        <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(0,180,216,0.7)", margin: "4px 0 0" }}>
                                            {rutina.semanas.length} semana{rutina.semanas.length !== 1 ? "s" : ""} ·{" "}
                                            {rutina.semanas.reduce((a, s) => a + (s.dias?.length || 0), 0)} días ·{" "}
                                            {rutina.semanas.reduce((a, s) => a + (s.dias?.reduce((b, d) => b + ["movilidad", "activacion", "general"].reduce((c, et) => c + (d.etapas?.[et]?.ejercicios?.length || 0), 0), 0) || 0), 0)} ejercicios
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Email */}
                            <div style={{ marginBottom: 16 }}>
                                <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                                    Email del alumno
                                </p>
                                {alumno?.email ? (
                                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                                        <span>✉️</span>
                                        <span style={{ fontFamily: FB, fontSize: 14, color: "white" }}>{alumno.email}</span>
                                    </div>
                                ) : (
                                    <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "11px 14px" }}>
                                        <p style={{ fontFamily: FB, fontSize: 13, color: "#f59e0b", margin: 0 }}>
                                            ⚠️ Este alumno no tiene email registrado. Podés descargar el PDF y enviarlo manualmente.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Mensaje personalizado */}
                            {alumno?.email && (
                                <div style={{ marginBottom: 18 }}>
                                    <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                                        Mensaje personalizado <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>— opcional</span>
                                    </p>
                                    <textarea
                                        value={mensaje}
                                        onChange={e => setMensaje(e.target.value)}
                                        rows={3}
                                        disabled={estado === "enviando"}
                                        placeholder="Mensaje que verá el alumno en el email..."
                                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "white", fontFamily: FB, fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }}
                                    />
                                </div>
                            )}

                            {/* Error */}
                            {estado === "error" && errorMsg && (
                                <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                                    <p style={{ fontFamily: FB, fontSize: 13, color: "#f87171", margin: 0, lineHeight: 1.5 }}>⚠️ {errorMsg}</p>
                                </div>
                            )}

                            {/* Botones */}
                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    onClick={handleDescargar}
                                    disabled={estado === "enviando"}
                                    style={{ flex: 1, fontFamily: FB, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", padding: "13px", borderRadius: 12, cursor: estado === "enviando" ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                    onMouseEnter={e => { if (estado !== "enviando") { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
                                >
                                    {estado === "enviando" ? <SpinnerMini color="white" /> : "⬇️"} Descargar PDF
                                </button>

                                {alumno?.email && (
                                    <button
                                        onClick={handleEnviar}
                                        disabled={estado === "enviando"}
                                        style={{ flex: 2, fontFamily: FB, fontSize: 14, fontWeight: 700, background: estado === "enviando" ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: estado === "enviando" ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                                    >
                                        {estado === "enviando" ? <><SpinnerMini color="white" /> Enviando...</> : "📧 Enviar por email"}
                                    </button>
                                )}
                            </div>

                            <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
                                El PDF se genera automáticamente con toda la rutina detallada.<br />
                                El alumno recibe un botón para descargarlo directo desde su email.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

function SpinnerMini({ color = "#00b4d8" }) {
    return (
        <>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${color}33`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
        </>
    );
}