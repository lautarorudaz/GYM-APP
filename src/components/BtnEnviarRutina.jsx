// src/components/BtnEnviarRutina.jsx
import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { enviarEmailNotificacion, descargarPDFRutina, getLinkRutina } from "../utils/enviarRutinaPDF";

const FB = "'DM Sans', sans-serif";
const FT = "'Bebas Neue', sans-serif";

export default function BtnEnviarRutina({ alumno, miDoc }) {
    const [estado, setEstado] = useState("idle");
    const [rutina, setRutina] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    // ── Buscar rutina ─────────────────────────────────────────────────────────
    const buscarRutina = async () => {
        const snap = await getDocs(
            query(collection(db, "rutinas_asignadas"), where("alumnoId", "==", alumno.id))
        );
        if (snap.empty) throw new Error("No se encontró ninguna rutina asignada para este alumno.");
        const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return todas.sort((a, b) => (b.asignadoEn?.toMillis?.() ?? 0) - (a.asignadoEn?.toMillis?.() ?? 0))[0];
    };

    const handleClick = async () => {
        if (!alumno?.tieneRutina) { alert("Este alumno todavía no tiene una rutina asignada."); return; }
        setEstado("cargando"); setErrorMsg("");
        try {
            const r = await buscarRutina();
            setRutina(r);
            setMensaje(`Hola ${alumno.nombre}! Tu entrenador te preparó la rutina "${r.nombre}". Pedile el PDF cuando puedas. ¡Mucho éxito!`);
            setEstado("confirm");
        } catch (e) {
            setErrorMsg(e.message); setEstado("error");
        }
    };

    const profe = miDoc || { nombre: "Tu entrenador", apellido: "" };

    // ── Sólo descarga el PDF ───────────────────────────────────────────────────
    const handleSoloDescargar = async () => {
        const r = rutina || await buscarRutina().catch(e => { alert(e.message); return null; });
        if (!r) return;
        setEstado("generando");
        try {
            await descargarPDFRutina(r, alumno, profe);
            setEstado("confirm"); // vuelve al modal
        } catch (e) { setErrorMsg("Error al generar PDF: " + e.message); setEstado("error"); }
    };

    // ── Descarga PDF + manda email ─────────────────────────────────────────────
    const handleEnviarYDescargar = async () => {
        if (!rutina) return;
        setEstado("enviando");
        try {
            // Las dos cosas en paralelo
            await Promise.all([
                descargarPDFRutina(rutina, alumno, profe),
                enviarEmailNotificacion(rutina, alumno, profe, mensaje),
            ]);
            setEstado("ok");
            setTimeout(() => setEstado("idle"), 3500);
        } catch (e) {
            setErrorMsg(e.message); setEstado("error");
        }
    };

    // ── Sólo email (sin descarga) ──────────────────────────────────────────────
    const handleSoloEmail = async () => {
        if (!rutina) return;
        setEstado("enviando");
        try {
            await enviarEmailNotificacion(rutina, alumno, profe, mensaje);
            setEstado("ok");
            setTimeout(() => setEstado("idle"), 3500);
        } catch (e) {
            setErrorMsg(e.message); setEstado("error");
        }
    };

    const cerrar = () => { setEstado("idle"); setRutina(null); setErrorMsg(""); setMensaje(""); };

    const ocupado = estado === "cargando" || estado === "enviando" || estado === "generando";

    return (
        <>
            {/* ── BOTÓN FILA ─────────────────────────────────────────────────── */}
            <button
                className="alumnos-btn-action"
                onClick={handleClick}
                disabled={ocupado}
                title={alumno?.tieneRutina ? "Descargar PDF / Notificar por email" : "Sin rutina asignada"}
                style={{
                    borderColor: estado === "ok" ? "rgba(34,197,94,0.4)"
                        : alumno?.tieneRutina ? "rgba(0,180,216,0.3)"
                            : "rgba(255,255,255,0.08)",
                    color: estado === "ok" ? "#22c55e"
                        : alumno?.tieneRutina ? "#00b4d8"
                            : "rgba(255,255,255,0.2)",
                    opacity: alumno?.tieneRutina ? 1 : 0.4,
                    cursor: alumno?.tieneRutina ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", gap: 5, padding: "8px 12px",
                }}
            >
                {ocupado ? <SpinnerMini /> : <span>{estado === "ok" ? "✅" : "📄"}</span>}
                <span style={{ fontSize: 12 }}>{estado === "ok" ? "Listo" : "PDF"}</span>
            </button>

            {/* ── MODAL ──────────────────────────────────────────────────────── */}
            {(estado === "confirm" || estado === "enviando" || estado === "generando" || estado === "error") && (
                <>
                    <div onClick={cerrar} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)" }} />
                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "min(500px,95vw)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)", overflow: "hidden" }}>

                        {/* Header */}
                        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <p style={{ fontFamily: FB, fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(0,180,216,0.7)", margin: "0 0 4px" }}>PDF Y NOTIFICACIÓN</p>
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
                                    <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 4px", letterSpacing: 1, textTransform: "uppercase" }}>Rutina</p>
                                    <p style={{ fontFamily: FT, fontSize: 18, letterSpacing: 2, color: "white", margin: 0 }}>{rutina.nombre}</p>
                                    <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(0,180,216,0.7)", margin: "4px 0 0" }}>
                                        {rutina.semanas?.length || 0} semana{(rutina.semanas?.length || 0) !== 1 ? "s" : ""} ·{" "}
                                        {(rutina.semanas || []).reduce((a, s) => a + (s.dias?.length || 0), 0)} días ·{" "}
                                        {(rutina.semanas || []).reduce((a, s) => a + (s.dias?.reduce((b, d) => b + ["movilidad", "activacion", "general"].reduce((c, et) => c + (d.etapas?.[et]?.ejercicios?.length || 0), 0), 0) || 0), 0)} ejercicios
                                    </p>
                                </div>
                            )}

                            {/* Email destino */}
                            <div style={{ marginBottom: 16 }}>
                                <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>Email del alumno</p>
                                {alumno?.email ? (
                                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                                        <span>✉️</span>
                                        <span style={{ fontFamily: FB, fontSize: 14, color: "white" }}>{alumno.email}</span>
                                    </div>
                                ) : (
                                    <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, padding: "11px 14px" }}>
                                        <p style={{ fontFamily: FB, fontSize: 13, color: "#f59e0b", margin: 0 }}>⚠️ Sin email registrado — solo podés descargar el PDF.</p>
                                    </div>
                                )}
                            </div>

                            {/* Mensaje personalizado */}
                            {alumno?.email && (
                                <div style={{ marginBottom: 18 }}>
                                    <p style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                                        Mensaje <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>— opcional</span>
                                    </p>
                                    <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={3}
                                        disabled={ocupado}
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

                            {/* ── BOTONES ────────────────────────────────────────────── */}
                            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                {/* Solo descargar PDF */}
                                <button onClick={handleSoloDescargar} disabled={ocupado}
                                    style={{ flex: 1, fontFamily: FB, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", padding: "12px", borderRadius: 12, cursor: ocupado ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                    onMouseEnter={e => { if (!ocupado) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white" } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)" }}>
                                    {estado === "generando" ? <SpinnerMini color="white" /> : "⬇️"} Solo PDF
                                </button>

                                {/* Descargar + email (botón principal si tiene email) */}
                                {alumno?.email ? (
                                    <button onClick={handleEnviarYDescargar} disabled={ocupado}
                                        style={{ flex: 2, fontFamily: FB, fontSize: 13, fontWeight: 700, background: ocupado ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "12px", borderRadius: 12, cursor: ocupado ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                        {estado === "enviando" ? <><SpinnerMini color="white" /> Enviando...</> : "⬇️📧 PDF + Notificar al alumno"}
                                    </button>
                                ) : (
                                    <button onClick={handleSoloDescargar} disabled={ocupado}
                                        style={{ flex: 2, fontFamily: FB, fontSize: 13, fontWeight: 700, background: ocupado ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "12px", borderRadius: 12, cursor: ocupado ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                        {estado === "generando" ? <><SpinnerMini color="white" /> Generando...</> : "⬇️ Descargar PDF"}
                                    </button>
                                )}
                            </div>

                            {/* Solo email (sin descarga) */}
                            {alumno?.email && (
                                <button onClick={handleSoloEmail} disabled={ocupado}
                                    style={{ width: "100%", fontFamily: FB, fontSize: 12, background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", padding: "10px", borderRadius: 12, cursor: ocupado ? "not-allowed" : "pointer", transition: "all 0.2s" }}
                                    onMouseEnter={e => { if (!ocupado) { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)" } }}
                                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)" }}>
                                    📧 Solo enviar notificación por email (sin descargar)
                                </button>
                            )}

                            <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
                                El PDF se descarga en tu computadora.<br />
                                El email le avisa al alumno que su rutina está lista.
                            </p>

                            {/* Link compartible */}
                            {rutina?.id && (
                                <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
                                    <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                                        🔗 Link directo a la rutina
                                    </p>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        <input readOnly value={getLinkRutina(rutina.id)}
                                            style={{ flex: 1, fontFamily: FB, fontSize: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 10px", color: "rgba(255,255,255,0.45)", outline: "none", minWidth: 0 }}
                                            onClick={e => e.target.select()}
                                        />
                                        <button onClick={() => { navigator.clipboard.writeText(getLinkRutina(rutina.id)); alert("¡Link copiado!"); }}
                                            style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8", borderRadius: 8, padding: "7px 10px", cursor: "pointer", flexShrink: 0 }}>
                                            📋 Copiar
                                        </button>
                                        <a href={`https://wa.me/?text=${encodeURIComponent(`Hola ${alumno?.nombre || ""}! Acá podés ver tu rutina: ${getLinkRutina(rutina.id)}`)}`}
                                            target="_blank" rel="noreferrer"
                                            style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", borderRadius: 8, padding: "7px 10px", textDecoration: "none", flexShrink: 0 }}>
                                            💬 WA
                                        </a>
                                    </div>
                                    <p style={{ fontFamily: FB, fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5, lineHeight: 1.4 }}>
                                        El alumno puede ver la rutina completa sin loguearse.
                                    </p>
                                </div>
                            )}
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