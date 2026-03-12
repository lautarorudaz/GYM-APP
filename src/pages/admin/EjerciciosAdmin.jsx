import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import AdminNavBar from "./AdminNavBar";

/* ─── Constantes ─────────────────────────────── */
const ETAPAS = [
    { id: "movilidad", label: "Movilidad", color: "#06b6d4" },
    { id: "activacion", label: "Activación", color: "#f59e0b" },
    { id: "general", label: "General", color: "#8b5cf6" },
];

const GRUPOS = [
    "Hombro", "Espalda", "Bíceps", "Tríceps",
    "Abdomen", "Antebrazos", "Pecho", "Cuádriceps", "Isquios", "Gemelos",
];

const SEDES = [
    { id: "general", label: "General" },
    { id: "Edison", label: "Edison" },
    { id: "Moreno", label: "Moreno" },
    { id: "GSM", label: "Gral. San Martín" },
];

const ETAPA_COLORS = { movilidad: "#06b6d4", activacion: "#f59e0b", general: "#8b5cf6" };
const ETAPA_BG = { movilidad: "rgba(6,182,212,0.1)", activacion: "rgba(245,158,11,0.1)", general: "rgba(139,92,246,0.1)" };

function getYoutubeEmbed(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}
function getYoutubeThumbnail(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

/* ─── Estilos base ──── */
const BTN_BASE = {
    fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 500,
    padding: "6px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.5)",
};
const BTN_ACTIVE = {
    ...BTN_BASE,
    background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8",
};
const LABEL = {
    fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
    letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8,
};
const INPUT_STYLE = {
    fontFamily: "'DM Sans',sans-serif", fontSize: 14,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "11px 14px", color: "white", outline: "none",
};

/* ─── CheckGroup ────────────────────────────── */
function CheckGroup({ options, selected, onChange, colorMap = {}, bgMap = {} }) {
    const toggle = (val) => onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {options.map(opt => {
                const id = opt.id || opt;
                const label = opt.label || opt;
                const active = selected.includes(id);
                const color = colorMap[id] || "#00b4d8";
                const bg = bgMap[id] || "rgba(0,180,216,0.1)";
                return (
                    <button key={id} onClick={() => toggle(id)} style={{
                        ...BTN_BASE,
                        ...(active ? { background: bg, border: `1px solid ${color}`, color } : {}),
                    }}>{label}</button>
                );
            })}
        </div>
    );
}

/* ─── Sección de filtros colapsable ─────────── */
function FilterSection({ title, children }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ marginBottom: 10 }}>
            <button onClick={() => setOpen(o => !o)} style={{
                fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600,
                letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
                background: "none", border: "none", cursor: "pointer", padding: "4px 0",
                display: "flex", alignItems: "center", gap: 6, transition: "color 0.15s",
            }}
                onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>
                <span style={{ display: "inline-block", transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
                {title}
            </button>
            {open && <div style={{ marginTop: 10 }}>{children}</div>}
        </div>
    );
}

/* ─── Modal Agregar / Editar ─────────────────── */
function ModalEjercicio({ ejercicio, onClose, onSave }) {
    const esEdicion = !!ejercicio?.id;
    const [nombre, setNombre] = useState(ejercicio?.nombre || "");
    const [etapas, setEtapas] = useState(ejercicio?.etapas || []);
    const [grupos, setGrupos] = useState(ejercicio?.grupos || []);
    const [sucursales, setSucursales] = useState(ejercicio?.sucursales || []);
    const [videoLink, setVideoLink] = useState(ejercicio?.videoLink || "");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [previewVideo, setPreviewVideo] = useState(false);
    const embedUrl = getYoutubeEmbed(videoLink);

    const handleGuardar = async () => {
        if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
        if (etapas.length === 0) { setError("Seleccioná al menos una etapa."); return; }
        if (grupos.length === 0) { setError("Seleccioná al menos un grupo muscular."); return; }
        if (sucursales.length === 0) { setError("Seleccioná al menos una sucursal."); return; }
        setGuardando(true); setError("");
        try {
            await onSave({ nombre: nombre.trim(), etapas, grupos, sucursales, videoLink: videoLink.trim() || null });
            onClose();
        } catch (e) { setError("Error al guardar: " + e.message); }
        finally { setGuardando(false); }
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} />
            <div style={{
                position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                zIndex: 301, background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 20, width: "min(560px,95vw)", maxHeight: "90vh", overflowY: "auto",
                boxShadow: "0 32px 80px rgba(0,0,0,0.8)", animation: "fadeUp 0.22s ease",
            }}>
                <style>{`@keyframes fadeUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
                {/* Header */}
                <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 2, color: "white" }}>
                        {esEdicion ? "✏️ Editar ejercicio" : "➕ Nuevo ejercicio"}
                    </span>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
                </div>
                {/* Body */}
                <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
                    {/* Nombre */}
                    <div>
                        <label style={LABEL}>Nombre</label>
                        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Press de hombro con mancuernas"
                            style={{ ...INPUT_STYLE, width: "100%", boxSizing: "border-box" }} />
                    </div>
                    {/* Etapa */}
                    <div>
                        <label style={LABEL}>Etapa</label>
                        <CheckGroup options={ETAPAS} selected={etapas} onChange={setEtapas} colorMap={ETAPA_COLORS} bgMap={ETAPA_BG} />
                    </div>
                    {/* Grupo muscular */}
                    <div>
                        <label style={LABEL}>Grupo muscular</label>
                        <CheckGroup options={GRUPOS} selected={grupos} onChange={setGrupos} />
                    </div>
                    {/* Sucursal */}
                    <div>
                        <label style={LABEL}>Sucursal</label>
                        <CheckGroup options={SEDES} selected={sucursales} onChange={setSucursales} />
                    </div>
                    {/* Video YouTube */}
                    <div>
                        <label style={LABEL}>
                            Video (link de YouTube){" "}
                            <span style={{ color: "rgba(255,255,255,0.25)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>— opcional</span>
                        </label>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input value={videoLink} onChange={e => { setVideoLink(e.target.value); setPreviewVideo(false); }}
                                placeholder="https://www.youtube.com/watch?v=..."
                                style={{ ...INPUT_STYLE, flex: 1 }} />
                            {embedUrl && (
                                <button onClick={() => setPreviewVideo(v => !v)} style={{
                                    ...BTN_BASE,
                                    borderRadius: 10, padding: "0 14px",
                                    ...(previewVideo ? { background: "rgba(0,180,216,0.12)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8" } : {}),
                                }}>
                                    {previewVideo ? "Ocultar" : "Preview"}
                                </button>
                            )}
                        </div>
                        {previewVideo && embedUrl && (
                            <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <iframe src={embedUrl} title="preview" width="100%" height="200" frameBorder="0" allowFullScreen style={{ display: "block" }} />
                            </div>
                        )}
                        {videoLink && !embedUrl && (
                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#f59e0b", marginTop: 6 }}>⚠️ El link no parece ser de YouTube.</p>
                        )}
                    </div>
                    {error && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px" }}>{error}</p>}
                    {/* Botones */}
                    <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                        <button onClick={onClose} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "12px", borderRadius: 12, cursor: "pointer" }}>Cancelar</button>
                        <button onClick={handleGuardar} disabled={guardando} style={{ flex: 2, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, background: guardando ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "12px", borderRadius: 12, cursor: guardando ? "not-allowed" : "pointer" }}>
                            {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear ejercicio"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ─── Card de ejercicio ───────────────────────── */
function EjercicioCard({ ejercicio, onEditar, onEliminar }) {
    const [playing, setPlaying] = useState(false);
    const thumb = getYoutubeThumbnail(ejercicio.videoLink);
    const embedUrl = getYoutubeEmbed(ejercicio.videoLink);

    return (
        <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s, transform 0.2s",
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,180,216,0.2)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}>

            {/* Thumbnail / Player */}
            <div style={{ width: "100%", aspectRatio: "16/9", background: "rgba(0,0,0,0.5)", position: "relative", overflow: "hidden" }}>
                {playing && embedUrl ? (
                    <iframe
                        src={`${embedUrl}?autoplay=1`}
                        title={ejercicio.nombre}
                        width="100%" height="100%"
                        frameBorder="0"
                        allow="autoplay; fullscreen"
                        allowFullScreen
                        style={{ display: "block", position: "absolute", inset: 0 }}
                    />
                ) : thumb ? (
                    <>
                        <img src={thumb} alt={ejercicio.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        {/* Play overlay */}
                        <div onClick={() => setPlaying(true)} style={{
                            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(0,0,0,0.3)", cursor: "pointer", transition: "background 0.2s",
                        }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.5)"}
                            onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.3)"}>
                            <div style={{
                                width: 48, height: 48, borderRadius: "50%",
                                background: "rgba(0,180,216,0.9)", display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.5)", transition: "transform 0.15s",
                            }}>
                                <span style={{ fontSize: 18, marginLeft: 3 }}>▶</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6 }}>
                        <span style={{ fontSize: 28, opacity: 0.2 }}>🎬</span>
                        <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)" }}>Sin video</span>
                    </div>
                )}
                {/* Etapas badges */}
                {!playing && (
                    <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {ejercicio.etapas?.map(e => (
                            <span key={e} style={{
                                fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                                background: ETAPA_BG[e] || "rgba(0,0,0,0.5)", color: ETAPA_COLORS[e] || "#fff",
                                border: `1px solid ${ETAPA_COLORS[e] || "rgba(255,255,255,0.2)"}`, backdropFilter: "blur(4px)",
                            }}>
                                {ETAPAS.find(et => et.id === e)?.label || e}
                            </span>
                        ))}
                    </div>
                )}
                {/* Botón cerrar video */}
                {playing && (
                    <button onClick={() => setPlaying(false)} style={{
                        position: "absolute", top: 8, right: 8, zIndex: 10,
                        background: "rgba(0,0,0,0.7)", border: "none", color: "white",
                        borderRadius: "50%", width: 28, height: 28, fontSize: 14, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>×</button>
                )}
            </div>

            {/* Info */}
            <div style={{ padding: "14px 16px" }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "white", margin: "0 0 8px", lineHeight: 1.3 }}>
                    {ejercicio.nombre}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {ejercicio.grupos?.map(g => (
                        <span key={g} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "2px 8px" }}>
                            {g}
                        </span>
                    ))}
                </div>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", margin: "0 0 12px" }}>
                    📍 {ejercicio.sucursales?.map(s => SEDES.find(sd => sd.id === s)?.label || s).join(", ")}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onEditar(ejercicio)} style={{
                        flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 500,
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px", cursor: "pointer", transition: "all 0.15s",
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.08)"; e.currentTarget.style.color = "#00b4d8"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.25)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
                        ✏️ Editar
                    </button>
                    <button onClick={() => onEliminar(ejercicio)} style={{
                        fontFamily: "'DM Sans',sans-serif", fontSize: 12,
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                        color: "rgba(239,68,68,0.6)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", transition: "all 0.15s",
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "rgba(239,68,68,0.6)"; }}>
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Página principal ────────────────────────── */
export default function EjerciciosAdmin() {
    const [ejercicios, setEjercicios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modal, setModal] = useState(null);
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    // Filtros
    const [filtroEtapa, setFiltroEtapa] = useState("");
    const [filtroGrupo, setFiltroGrupo] = useState("");
    const [filtroVideo, setFiltroVideo] = useState(""); // "" | "con" | "sin"
    const [filtroBusqueda, setFiltroBusqueda] = useState("");
    const [notificaciones] = useState([]);

    const cargarEjercicios = async () => {
        setCargando(true);
        try {
            const snap = await getDocs(collection(db, "ejercicios"));
            setEjercicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
        finally { setCargando(false); }
    };

    useEffect(() => { cargarEjercicios(); }, []);

    const handleSave = async (data) => {
        if (modal === "nuevo") {
            await addDoc(collection(db, "ejercicios"), { ...data, creadoEn: serverTimestamp() });
        } else {
            await updateDoc(doc(db, "ejercicios", modal.id), data);
        }
        await cargarEjercicios();
    };

    const handleEliminar = async () => {
        if (!confirmarEliminar) return;
        setEliminando(true);
        try { await deleteDoc(doc(db, "ejercicios", confirmarEliminar.id)); setConfirmarEliminar(null); await cargarEjercicios(); }
        catch (e) { console.error(e); }
        finally { setEliminando(false); }
    };

    const ejerciciosFiltrados = ejercicios.filter(ej => {
        if (filtroEtapa && !ej.etapas?.includes(filtroEtapa)) return false;
        if (filtroGrupo && !ej.grupos?.includes(filtroGrupo)) return false;
        if (filtroVideo === "con" && !ej.videoLink) return false;
        if (filtroVideo === "sin" && ej.videoLink) return false;
        if (filtroBusqueda && !ej.nombre?.toLowerCase().includes(filtroBusqueda.toLowerCase())) return false;
        return true;
    });

    const sinVideo = ejercicios.filter(e => !e.videoLink).length;

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingTop: 62, boxSizing: "border-box", width: "100%" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
                *{box-sizing:border-box}
                body{display:block!important;place-items:unset!important}
                .ej-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px}
                @media(max-width:600px){.ej-grid{grid-template-columns:1fr}}
                input::placeholder{color:rgba(255,255,255,0.2)}
                button:hover{border-color:inherit!important}
                button:focus,button:focus-visible{outline:none!important}
            `}</style>

            <AdminNavBar notificaciones={notificaciones} />

            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px", width: "100%" }}>

                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, letterSpacing: 3, color: "white", margin: 0 }}>💪 Ejercicios</h1>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                            {ejercicios.length} ejercicio{ejercicios.length !== 1 ? "s" : ""} cargado{ejercicios.length !== 1 ? "s" : ""}
                            {sinVideo > 0 && <span style={{ marginLeft: 10, color: "#f59e0b" }}>· {sinVideo} sin video</span>}
                        </p>
                    </div>
                    <button onClick={() => setModal("nuevo")} style={{
                        fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600,
                        background: "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none",
                        color: "white", padding: "12px 22px", borderRadius: 12, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        boxShadow: "0 4px 20px rgba(0,180,216,0.25)", whiteSpace: "nowrap",
                    }}>
                        ＋ Agregar ejercicio
                    </button>
                </div>

                {/* Búsqueda */}
                <div style={{ marginBottom: 16 }}>
                    <input value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)}
                        placeholder="🔍  Buscar por nombre..."
                        style={{ ...INPUT_STYLE, width: "100%", fontSize: 14 }} />
                </div>

                {/* Filtro rápido: video */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", marginRight: 4 }}>Video:</span>
                    {[["", "Todos"], ["con", "🎬 Con video"], ["sin", "⚠️ Sin video"]].map(([val, label]) => (
                        <button key={val} onClick={() => setFiltroVideo(val)} style={{
                            ...BTN_BASE,
                            ...(filtroVideo === val ? { background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8" } : {}),
                        }}>{label}</button>
                    ))}
                </div>

                {/* Filtros colapsables */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 18px", marginBottom: 24 }}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "0 0 12px" }}>Filtros</p>

                    <FilterSection title="Etapa">
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button style={{ ...BTN_BASE, ...(filtroEtapa === "" ? { ...BTN_ACTIVE } : {}) }} onClick={() => setFiltroEtapa("")}>Todas</button>
                            {ETAPAS.map(et => (
                                <button key={et.id} onClick={() => setFiltroEtapa(filtroEtapa === et.id ? "" : et.id)} style={{
                                    ...BTN_BASE,
                                    ...(filtroEtapa === et.id ? { background: ETAPA_BG[et.id], border: `1px solid ${et.color}`, color: et.color } : {}),
                                }}>{et.label}</button>
                            ))}
                        </div>
                    </FilterSection>

                    <FilterSection title="Grupo Muscular">
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button style={{ ...BTN_BASE, ...(filtroGrupo === "" ? { ...BTN_ACTIVE } : {}) }} onClick={() => setFiltroGrupo("")}>Todos</button>
                            {GRUPOS.map(g => (
                                <button key={g} onClick={() => setFiltroGrupo(filtroGrupo === g ? "" : g)} style={{
                                    ...BTN_BASE,
                                    ...(filtroGrupo === g ? { ...BTN_ACTIVE } : {}),
                                }}>{g}</button>
                            ))}
                        </div>
                    </FilterSection>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 28 }} />

                {/* Grid */}
                {cargando ? (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Cargando ejercicios...</p>
                    </div>
                ) : ejerciciosFiltrados.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 2, color: "rgba(255,255,255,0.1)", marginBottom: 8 }}>
                            {ejercicios.length === 0 ? "Aún no hay ejercicios" : "Sin resultados"}
                        </p>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
                            {ejercicios.length === 0 ? "Hacé clic en \"Agregar ejercicio\" para empezar." : "Probá cambiando los filtros."}
                        </p>
                    </div>
                ) : (
                    <div className="ej-grid">
                        {ejerciciosFiltrados.map(ej => (
                            <EjercicioCard key={ej.id} ejercicio={ej} onEditar={setModal} onEliminar={setConfirmarEliminar} />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal agregar/editar */}
            {modal && (
                <ModalEjercicio ejercicio={modal === "nuevo" ? null : modal} onClose={() => setModal(null)} onSave={handleSave} />
            )}

            {/* Modal confirmar eliminar */}
            {confirmarEliminar && (
                <>
                    <div onClick={() => setConfirmarEliminar(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} />
                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 301, background: "#111", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "28px 28px 24px", width: "min(400px,90vw)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
                        <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 2, color: "white", marginBottom: 10 }}>⚠️ Eliminar ejercicio</p>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 24 }}>
                            ¿Seguro que querés eliminar <strong style={{ color: "white" }}>{confirmarEliminar.nombre}</strong>? Esta acción no se puede deshacer.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setConfirmarEliminar(null)} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "12px", borderRadius: 12, cursor: "pointer" }}>Cancelar</button>
                            <button onClick={handleEliminar} disabled={eliminando} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, background: eliminando ? "rgba(239,68,68,0.3)" : "#ef4444", border: "none", color: "white", padding: "12px", borderRadius: 12, cursor: eliminando ? "not-allowed" : "pointer" }}>
                                {eliminando ? "Eliminando..." : "Sí, eliminar"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
