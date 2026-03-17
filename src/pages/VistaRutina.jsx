// src/pages/VistaRutina.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Página PÚBLICA — accesible en /ver-rutina/:rutinaId
// Sin login requerido. Muestra la rutina completa con navegación por días,
// thumbnails de video con modal de reproducción, observaciones del profe.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../firebase";

const ETAPAS = [
    { id: "movilidad", label: "Movilidad", color: "#06b6d4", bg: "rgba(6,182,212,0.12)", dot: "#06b6d4" },
    { id: "activacion", label: "Activación", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", dot: "#f59e0b" },
    { id: "general", label: "General", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", dot: "#8b5cf6" },
];

const getYtId = (url) => url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];

/* ═══ MODAL DE VIDEO ════════════════════════════════════════ */
function VideoModal({ ytId, nombre, onClose }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    return (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 800, position: "relative" }}>
                {/* Título */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 12 }}>{nombre}</p>
                    <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, flexShrink: 0 }}>
                        ✕ Cerrar
                    </button>
                </div>
                {/* Video */}
                <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", background: "#000", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
                    <iframe
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                        title={nombre}
                        frameBorder="0"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowFullScreen
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                    />
                </div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 12 }}>
                    Tocá fuera del video o presioná ESC para cerrar
                </p>
            </div>
        </div>
    );
}

/* ═══ CARD DE EJERCICIO ═════════════════════════════════════ */
function CardEjercicio({ ej, num, onVerVideo }) {
    const ytId = getYtId(ej.videoLink);
    const tieneObs = ej.obs?.trim();

    return (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s,transform 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; e.currentTarget.style.transform = "translateY(-1px)" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)" }}>

            <div style={{ display: "flex", gap: 0 }}>
                {/* Thumbnail / video */}
                <div
                    onClick={ytId ? () => onVerVideo(ej) : undefined}
                    style={{ width: 110, minWidth: 110, background: "#111", position: "relative", cursor: ytId ? "pointer" : "default", flexShrink: 0 }}>
                    {ytId ? (
                        <>
                            <img
                                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                                alt={ej.nombre}
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 90 }}
                            />
                            {/* Play overlay */}
                            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.15)"}
                                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.35)"}>
                                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,180,216,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,180,216,0.4)" }}>
                                    <span style={{ fontSize: 14, marginLeft: 2 }}>▶</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ width: "100%", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, opacity: 0.25 }}>
                            <span style={{ fontSize: 28 }}>🎬</span>
                            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 9, color: "white", letterSpacing: 1 }}>SIN VIDEO</span>
                        </div>
                    )}

                    {/* Número de ejercicio */}
                    <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.75)", borderRadius: 6, padding: "2px 8px" }}>
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{num}</span>
                    </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, padding: "14px 16px", minWidth: 0 }}>
                    <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1, color: "white", margin: "0 0 10px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ej.nombre}
                    </p>

                    {/* Stats */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: tieneObs ? 10 : 0 }}>
                        {[
                            { label: "Series", val: ej.series, color: "#00b4d8" },
                            { label: "Reps", val: ej.reps, color: "white" },
                            { label: "Desc.", val: ej.descanso, color: "rgba(255,255,255,0.5)" },
                        ].filter(s => s.val).map(s => (
                            <div key={s.label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 10px", textAlign: "center", minWidth: 50 }}>
                                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 2px" }}>{s.label}</p>
                                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: s.color, margin: 0, lineHeight: 1 }}>{s.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Observación */}
                    {tieneObs && (
                        <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "flex-start", gap: 6 }}>
                            <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>📝</span>
                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(251,191,36,0.9)", margin: 0, lineHeight: 1.5 }}>{ej.obs}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ═══ PÁGINA PRINCIPAL ══════════════════════════════════════ */
export default function VistaRutina() {
    const { rutinaId } = useParams();
    const [rutina, setRutina] = useState(null);
    const [alumno, setAlumno] = useState(null);
    const [profesor, setProfesor] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [semanaIdx, setSemanaIdx] = useState(0);
    const [diaIdx, setDiaIdx] = useState(0);
    const [videoModal, setVideoModal] = useState(null); // ejercicio activo en modal

    useEffect(() => { if (rutinaId) cargar(); }, [rutinaId]);

    // Resetear día al cambiar de semana
    useEffect(() => { setDiaIdx(0); }, [semanaIdx]);

    const cargar = async () => {
        try {
            const snap = await getDoc(doc(db, "rutinas_asignadas", rutinaId));
            if (!snap.exists()) { setError("No se encontró esta rutina. El link puede ser incorrecto."); setCargando(false); return; }
            const r = { id: snap.id, ...snap.data() };
            setRutina(r);

            // Datos del alumno
            if (r.alumnoId) {
                try {
                    const aSnap = await getDoc(doc(db, "usuarios", r.alumnoId));
                    if (aSnap.exists()) setAlumno({ id: aSnap.id, ...aSnap.data() });
                    else setAlumno({ nombre: r.alumnoNombre || "Alumno" });
                } catch { setAlumno({ nombre: r.alumnoNombre || "Alumno" }); }
            }

            // Datos del profesor
            if (r.profesorId) {
                try {
                    const pSnap = await getDoc(doc(db, "usuarios", r.profesorId));
                    if (pSnap.exists()) setProfesor({ id: pSnap.id, ...pSnap.data() });
                } catch { }
            }
        } catch (e) { setError("Error al cargar la rutina: " + e.message); }
        finally { setCargando(false); }
    };

    if (cargando) return <Pantalla><Spinner /><p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginTop: 16 }}>Cargando rutina...</p></Pantalla>;
    if (error) return <Pantalla><p style={{ fontSize: 40, marginBottom: 12 }}>⚠️</p><p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 2, color: "#f87171", marginBottom: 8 }}>RUTINA NO ENCONTRADA</p><p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", maxWidth: 340, textAlign: "center", lineHeight: 1.6 }}>{error}</p></Pantalla>;

    const semanas = rutina.semanas || [];
    const semActual = semanas[semanaIdx];
    const dias = semActual?.dias || [];
    const diaActual = dias[diaIdx];

    const totalEj = (semanas || []).reduce((a, s) => a + (s.dias || []).reduce((b, d) => b + ETAPAS.reduce((c, et) => c + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0), 0), 0);

    const nombreAlumno = alumno ? `${alumno.nombre || ""} ${alumno.apellido || ""}`.trim() : rutina.alumnoNombre || "—";
    const nombreProfesor = profesor ? `${profesor.nombre || ""} ${profesor.apellido || ""}`.trim() : "—";

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "white" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{display:block!important;place-items:unset!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
        .tab-dia:hover{background:rgba(255,255,255,0.08)!important}
        .tab-semana:hover{background:rgba(0,180,216,0.08)!important}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .anim{animation:fadeIn 0.3s ease}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

            {/* ── HEADER ─────────────────────────────────────────────── */}
            <div style={{ background: "rgba(10,10,10,0.97)", borderBottom: "1px solid rgba(255,255,255,0.06)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(20px)" }}>
                {/* Franja cyan arriba */}
                <div style={{ height: 3, background: "linear-gradient(90deg,#00b4d8,#0077b6)" }} />

                <div style={{ maxWidth: 720, margin: "0 auto", padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ minWidth: 0 }}>
                            {/* Label */}
                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(0,180,216,0.7)", margin: "0 0 3px" }}>
                                Tu rutina de entrenamiento
                            </p>
                            {/* Nombre rutina */}
                            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 2, color: "white", lineHeight: 1, margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {rutina.nombre}
                            </h1>
                            {/* Meta */}
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                                    👤 {nombreAlumno}
                                </span>
                                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                                    🏋️ Profe: <span style={{ color: "#00b4d8" }}>{nombreProfesor}</span>
                                </span>
                            </div>
                        </div>

                        {/* Stats pill */}
                        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                            {[
                                { val: semanas.length, label: "sem" },
                                { val: (semanas || []).reduce((a, s) => a + (s.dias?.length || 0), 0), label: "días" },
                                { val: totalEj, label: "ejerc." },
                            ].map(s => (
                                <div key={s.label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "5px 12px", textAlign: "center" }}>
                                    <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "#00b4d8", lineHeight: 1, margin: 0 }}>{s.val}</p>
                                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", margin: "1px 0 0" }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px" }}>

                {/* ── SELECTOR DE SEMANA ──────────────────────────────── */}
                {semanas.length > 1 && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                        {semanas.map((s, i) => (
                            <button key={i} className="tab-semana" onClick={() => setSemanaIdx(i)} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", transition: "all 0.2s", background: semanaIdx === i ? "rgba(0,180,216,0.15)" : "rgba(255,255,255,0.04)", color: semanaIdx === i ? "#00b4d8" : "rgba(255,255,255,0.45)", outline: semanaIdx === i ? "1px solid rgba(0,180,216,0.35)" : "none" }}>
                                Semana {i + 1}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── TABS DE DÍAS ────────────────────────────────────── */}
                <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
                    {dias.map((d, i) => {
                        const ejCount = ETAPAS.reduce((a, et) => a + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0);
                        return (
                            <button key={i} className="tab-dia" onClick={() => setDiaIdx(i)} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, padding: "9px 18px", borderRadius: 12, border: `1px solid ${diaIdx === i ? "rgba(0,180,216,0.4)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", transition: "all 0.2s", background: diaIdx === i ? "rgba(0,180,216,0.1)" : "rgba(255,255,255,0.03)", color: diaIdx === i ? "#00b4d8" : "rgba(255,255,255,0.5)", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 64 }}>
                                <span>Día {i + 1}</span>
                                <span style={{ fontSize: 10, color: diaIdx === i ? "rgba(0,180,216,0.7)" : "rgba(255,255,255,0.25)" }}>{ejCount} ej.</span>
                            </button>
                        );
                    })}
                </div>

                {/* ── CONTENIDO DEL DÍA ───────────────────────────────── */}
                {diaActual ? (
                    <div key={`${semanaIdx}-${diaIdx}`} className="anim">

                        {/* Descripción del día */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
                            <div>
                                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 2, color: "white", margin: 0 }}>
                                    Semana {semanaIdx + 1} — Día {diaIdx + 1}
                                </p>
                                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
                                    {ETAPAS.reduce((a, et) => a + (diaActual.etapas?.[et.id]?.ejercicios?.length || 0), 0)} ejercicios en total
                                </p>
                            </div>
                        </div>

                        {/* Etapas */}
                        {ETAPAS.map(et => {
                            const ejs = diaActual.etapas?.[et.id]?.ejercicios || [];
                            if (!ejs.length) return null;
                            return (
                                <div key={et.id} style={{ marginBottom: 28 }}>
                                    {/* Label etapa */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: et.color, flexShrink: 0, boxShadow: `0 0 8px ${et.color}` }} />
                                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: et.color }}>
                                            {et.label}
                                        </span>
                                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                                            {ejs.length} ejercicio{ejs.length !== 1 ? "s" : ""}
                                        </span>
                                        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${et.color}44,transparent)` }} />
                                    </div>

                                    {/* Ejercicios */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {ejs.map((ej, ei) => (
                                            <CardEjercicio
                                                key={ei}
                                                ej={ej}
                                                num={ei + 1}
                                                onVerVideo={(e) => setVideoModal(e)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Nav entre días */}
                        <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
                            {diaIdx > 0 && (
                                <button onClick={() => setDiaIdx(d => d - 1)} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", padding: "13px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.09)" }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}>
                                    ← Día {diaIdx}
                                </button>
                            )}
                            {diaIdx < dias.length - 1 ? (
                                <button onClick={() => setDiaIdx(d => d + 1)} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 16px rgba(0,180,216,0.2)" }}
                                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    Día {diaIdx + 2} →
                                </button>
                            ) : semanaIdx < semanas.length - 1 ? (
                                <button onClick={() => { setSemanaIdx(s => s + 1); setDiaIdx(0); }} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                                    onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                                    onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                                    Siguiente semana →
                                </button>
                            ) : (
                                <div style={{ flex: 1, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "13px", textAlign: "center" }}>
                                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#22c55e", margin: 0 }}>✅ ¡Completaste toda la rutina!</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>
                        No hay ejercicios en este día.
                    </p>
                )}

                {/* ── FOOTER ──────────────────────────────────────────── */}
                <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
                    <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 3, color: "#00b4d8", marginBottom: 4 }}>ANIMAAPP</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                        Gimnasio Anima · {new Date().getFullYear()}
                    </p>
                    <Link to="/" style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(0,180,216,0.6)", textDecoration: "none", marginTop: 8, display: "inline-block" }}>
                        Iniciar sesión en la app →
                    </Link>
                </div>
            </div>

            {/* ── MODAL DE VIDEO ──────────────────────────────────────── */}
            {videoModal && (
                <VideoModal
                    ytId={getYtId(videoModal.videoLink)}
                    nombre={videoModal.nombre}
                    onClose={() => setVideoModal(null)}
                />
            )}
        </div>
    );
}

/* ── Helpers de pantalla de carga/error ── */
function Pantalla({ children }) {
    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, padding: 20, textAlign: "center" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            {children}
        </div>
    );
}
function Spinner() {
    return <div style={{ width: 48, height: 48, border: "3px solid rgba(0,180,216,0.15)", borderTopColor: "#00b4d8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />;
}