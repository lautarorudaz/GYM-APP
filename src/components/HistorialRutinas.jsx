// src/components/HistorialRutinas.jsx
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { generarPDFRutina } from "../utils/enviarRutinaPDF";

const FB = "'DM Sans', sans-serif";
const FT = "'Bebas Neue', sans-serif";

const ETAPAS = [
    { id: "movilidad", label: "Movilidad", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
    { id: "activacion", label: "Activación", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { id: "general", label: "General", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];
const ETAPA_MAP = Object.fromEntries(ETAPAS.map(e => [e.id, e]));
const GRUPOS = ["Hombro", "Espalda", "Bíceps", "Tríceps", "Abdomen", "Antebrazos", "Pecho", "Cuádriceps", "Isquios", "Gemelos"];

const FB_S = { fontFamily: FB, fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "11px 14px", color: "white", outline: "none", width: "100%", boxSizing: "border-box" };
const uid = () => Math.random().toString(36).slice(2, 9);

const addIds = (semanas) => (semanas || []).map(s => ({
    ...s, _id: uid(),
    dias: (s.dias || []).map(d => ({
        ...d, _id: uid(),
        etapas: Object.fromEntries(Object.entries(d.etapas || {}).map(([k, v]) => [k, { ...v, ejercicios: (v.ejercicios || []).map(e => ({ ...e, _id: uid() })) }]))
    }))
}));
const stripIds = (semanas) => semanas.map(({ _id, ...s }) => ({
    ...s, dias: s.dias.map(({ _id, ...d }) => ({
        ...d, etapas: Object.fromEntries(Object.entries(d.etapas).map(([k, v]) => [k, { ...v, ejercicios: (v.ejercicios || []).map(({ _id, ...e }) => e) }]))
    }))
}));

/* ═══ MINI BUILDER ═══════════════════════════════════════════
   Builder simplificado embebido dentro del historial.
   Edita la copia del alumno en rutinas_asignadas sin tocar la genérica.
══════════════════════════════════════════════════════════════ */
function MiniBuilder({ rutina, ejerciciosDB, onGuardar, onCerrar, guardando }) {
    const [data, setData] = useState(() => ({
        nombre: rutina.nombre || "",
        descripcion: rutina.descripcion || "",
        semanas: addIds(rutina.semanas || []),
    }));
    const [tab, setTab] = useState("builder");
    const [selector, setSelector] = useState(null); // {semIdx,diaIdx,etapaId}

    const updateSemana = (si, s) => setData(d => ({ ...d, semanas: d.semanas.map((x, i) => i === si ? s : x) }));
    const delSemana = (si) => { if (data.semanas.length <= 1) { alert("Mínimo 1 semana."); return; } setData(d => ({ ...d, semanas: d.semanas.filter((_, i) => i !== si) })); };
    const addSemana = () => setData(d => ({ ...d, semanas: [...d.semanas, { _id: uid(), nombre: `Semana ${d.semanas.length + 1}`, dias: [{ _id: uid(), nombre: "Día 1", etapas: { movilidad: { ejercicios: [] }, activacion: { ejercicios: [] }, general: { ejercicios: [] } } }] }] }));

    const updateDia = (si, di, dia) => updateSemana(si, { ...data.semanas[si], dias: data.semanas[si].dias.map((x, i) => i === di ? dia : x) });
    const delDia = (si, di) => { const s = data.semanas[si]; if (s.dias.length <= 1) { alert("Mínimo 1 día."); return; } updateSemana(si, { ...s, dias: s.dias.filter((_, i) => i !== di) }); };
    const addDia = (si) => { const s = data.semanas[si]; updateSemana(si, { ...s, dias: [...s.dias, { _id: uid(), nombre: `Día ${s.dias.length + 1}`, etapas: { movilidad: { ejercicios: [] }, activacion: { ejercicios: [] }, general: { ejercicios: [] } } }] }); };

    const addEj = (si, di, etId, ej) => { const dia = data.semanas[si].dias[di]; const et = dia.etapas[etId]; updateDia(si, di, { ...dia, etapas: { ...dia.etapas, [etId]: { ...et, ejercicios: [...et.ejercicios, { _id: uid(), id: ej.id, nombre: ej.nombre, videoLink: ej.videoLink || null, series: "3", reps: "10-12", descanso: "60s" }] } } }); setSelector(null); };
    const updEj = (si, di, etId, ei, upd) => { const dia = data.semanas[si].dias[di]; const et = dia.etapas[etId]; updateDia(si, di, { ...dia, etapas: { ...dia.etapas, [etId]: { ...et, ejercicios: et.ejercicios.map((x, i) => i === ei ? upd : x) } } }); };
    const delEj = (si, di, etId, ei) => { const dia = data.semanas[si].dias[di]; const et = dia.etapas[etId]; updateDia(si, di, { ...dia, etapas: { ...dia.etapas, [etId]: { ...et, ejercicios: et.ejercicios.filter((_, i) => i !== ei) } } }); };

    const handleGuardar = () => onGuardar({ ...data, semanas: stripIds(data.semanas) });

    const totalEj = data.semanas.reduce((a, s) => a + s.dias.reduce((b, d) => b + ETAPAS.reduce((c, et) => c + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0), 0), 0);

    // Selector de ejercicios
    const ejerciciosFiltrados = selector
        ? (ejerciciosDB || []).filter(e => e.etapas?.includes(selector.etapaId))
        : [];

    return (
        <div style={{ background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, marginTop: 16, overflow: "hidden" }}>
            {/* Header mini builder */}
            <div style={{ padding: "14px 18px", background: "rgba(0,180,216,0.06)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div>
                    <p style={{ fontFamily: FB, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "rgba(0,180,216,0.7)", margin: "0 0 2px" }}>Editando rutina del alumno</p>
                    <p style={{ fontFamily: FT, fontSize: 16, letterSpacing: 2, color: "white", margin: 0 }}>{data.nombre}</p>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontFamily: FB, fontSize: 11, color: "rgba(0,180,216,0.6)" }}>{data.semanas.length} sem · {totalEj} ej</span>
                    <button onClick={onCerrar} style={{ fontFamily: FB, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleGuardar} disabled={guardando} style={{ fontFamily: FB, fontSize: 12, fontWeight: 700, background: guardando ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}>
                        {guardando ? "Guardando..." : "✓ Guardar"}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 18px" }}>
                {[["info", "📝 Info"], ["builder", "🏗️ Builder"]].map(([v, l]) => (
                    <button key={v} onClick={() => setTab(v)} style={{ fontFamily: FB, fontSize: 13, fontWeight: 500, background: "none", border: "none", color: tab === v ? "#00b4d8" : "rgba(255,255,255,0.4)", padding: "10px 16px", cursor: "pointer", position: "relative", borderBottom: tab === v ? "2px solid #00b4d8" : "2px solid transparent" }}>{l}</button>
                ))}
            </div>

            <div style={{ padding: "16px 18px", maxHeight: 500, overflowY: "auto" }}>
                {tab === "info" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div><label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>Nombre</label>
                            <input value={data.nombre} onChange={e => setData(d => ({ ...d, nombre: e.target.value }))} style={FB_S} /></div>
                        <div><label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>Descripción</label>
                            <textarea value={data.descripcion} onChange={e => setData(d => ({ ...d, descripcion: e.target.value }))} rows={3} style={{ ...FB_S, resize: "vertical", lineHeight: 1.6 }} /></div>
                    </div>
                )}

                {tab === "builder" && (
                    <>
                        {data.semanas.map((sem, si) => (
                            <div key={sem._id} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, marginBottom: 12, overflow: "hidden" }}>
                                {/* Header semana */}
                                <div style={{ padding: "12px 16px", background: "rgba(0,180,216,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontFamily: FT, fontSize: 16, letterSpacing: 3, color: "#00b4d8" }}>Semana {si + 1}</span>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => addDia(si)} style={{ fontFamily: FB, fontSize: 11, background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>+ Día</button>
                                        <button onClick={() => delSemana(si)} style={{ fontFamily: FB, fontSize: 11, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>✕ Semana</button>
                                    </div>
                                </div>

                                <div style={{ padding: "12px 16px" }}>
                                    {sem.dias.map((dia, di) => (
                                        <div key={dia._id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                                            {/* Header día */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                                <span style={{ fontFamily: FT, fontSize: 13, letterSpacing: 2, color: "white" }}>Día {di + 1}</span>
                                                <button onClick={() => delDia(si, di)} style={{ fontFamily: FB, fontSize: 11, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(239,68,68,0.7)", borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>✕</button>
                                            </div>

                                            {ETAPAS.map(et => {
                                                const ejs = dia.etapas?.[et.id]?.ejercicios || [];
                                                return (
                                                    <div key={et.id} style={{ marginBottom: 8 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                                            <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: et.color }}>{et.label}</span>
                                                            <div style={{ flex: 1, height: 1, background: `${et.color}33` }} />
                                                            <button onClick={() => setSelector({ semIdx: si, diaIdx: di, etapaId: et.id })} style={{ fontFamily: FB, fontSize: 10, background: et.bg, border: `1px solid ${et.color}44`, color: et.color, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>+ Agregar</button>
                                                        </div>

                                                        {ejs.map((ej, ei) => (
                                                            <div key={ej._id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px", marginBottom: 4 }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                                    <span style={{ fontFamily: FB, fontSize: 12, color: "white", flex: 1, minWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ej.nombre}</span>
                                                                    <input type="number" value={ej.series || ""} onChange={e => updEj(si, di, et.id, ei, { ...ej, series: e.target.value })} placeholder="S" style={{ ...FB_S, width: 38, padding: "4px", textAlign: "center", fontSize: 12 }} />
                                                                    <span style={{ fontFamily: FB, fontSize: 10, color: "rgba(255,255,255,0.3)" }}>×</span>
                                                                    <input type="text" value={ej.reps || ""} onChange={e => updEj(si, di, et.id, ei, { ...ej, reps: e.target.value })} placeholder="Reps" style={{ ...FB_S, width: 52, padding: "4px", textAlign: "center", fontSize: 12 }} />
                                                                    <input type="text" value={ej.descanso || ""} onChange={e => updEj(si, di, et.id, ei, { ...ej, descanso: e.target.value })} placeholder="60s" style={{ ...FB_S, width: 44, padding: "4px", textAlign: "center", fontSize: 11 }} />
                                                                    <button onClick={() => delEj(si, di, et.id, ei)} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.6)", borderRadius: 6, padding: "4px 6px", cursor: "pointer", fontSize: 11 }}>✕</button>
                                                                </div>
                                                                {/* Observación */}
                                                                <div style={{ marginTop: 4 }}>
                                                                    <input type="text" value={ej.obs || ""} onChange={e => updEj(si, di, et.id, ei, { ...ej, obs: e.target.value })} placeholder="📝 Observación (opcional)" style={{ ...FB_S, fontSize: 11, padding: "5px 10px", background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)", color: "#fbbf24" }} />
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {ejs.length === 0 && <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.2)", fontStyle: "italic", padding: "4px 0" }}>Sin ejercicios</p>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <button onClick={addSemana} style={{ width: "100%", fontFamily: FB, fontSize: 13, background: "rgba(0,180,216,0.05)", border: "1px dashed rgba(0,180,216,0.3)", color: "#00b4d8", borderRadius: 12, padding: "10px", cursor: "pointer" }}>
                            + Agregar Semana {data.semanas.length + 1}
                        </button>
                    </>
                )}
            </div>

            {/* Modal selector ejercicios */}
            {selector && (
                <>
                    <div onClick={() => setSelector(null)} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 601, background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, width: "min(520px,95vw)", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
                        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontFamily: FT, fontSize: 18, letterSpacing: 2, color: "white" }}>Agregar — {ETAPA_MAP[selector.etapaId]?.label}</span>
                            <button onClick={() => setSelector(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
                        </div>
                        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
                            {ejerciciosFiltrados.length === 0
                                ? <p style={{ fontFamily: FB, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "28px 0" }}>No hay ejercicios de esta etapa.</p>
                                : ejerciciosFiltrados.map(ej => (
                                    <div key={ej.id} onClick={() => addEj(selector.semIdx, selector.diaIdx, selector.etapaId, ej)}
                                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 5, cursor: "pointer", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.15s" }}
                                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.06)"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.2)" }}
                                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)" }}>
                                        <div style={{ width: 40, height: 30, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {ej.videoLink ? <img src={`https://img.youtube.com/vi/${ej.videoLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/default.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 14, opacity: 0.3 }}>🎬</span>}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontFamily: FB, fontSize: 13, fontWeight: 500, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ej.nombre}</p>
                                            <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>{ej.grupos?.join(", ")}</p>
                                        </div>
                                        <span style={{ fontFamily: FB, fontSize: 12, color: "#00b4d8" }}>+ Agregar</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* ═══ HISTORIAL PRINCIPAL ════════════════════════════════════ */
export default function HistorialRutinas({ alumno, miDoc, onClose }) {
    const [rutinas, setRutinas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [expandida, setExpandida] = useState(null);
    const [editando, setEditando] = useState(null); // id de la rutina en edición
    const [guardando, setGuardando] = useState(false);
    const [descargando, setDescargando] = useState(null);
    const [ejerciciosDB, setEjerciciosDB] = useState([]);

    useEffect(() => { cargar(); cargarEjercicios(); }, [alumno.id]);

    const cargar = async () => {
        setCargando(true);
        try {
            const snap = await getDocs(query(collection(db, "rutinas_asignadas"), where("alumnoId", "==", alumno.id)));
            const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            todas.sort((a, b) => (b.asignadoEn?.toMillis?.() ?? 0) - (a.asignadoEn?.toMillis?.() ?? 0));
            setRutinas(todas);
        } catch (e) { console.error(e); }
        finally { setCargando(false); }
    };

    const cargarEjercicios = async () => {
        try {
            const snap = await getDocs(collection(db, "ejercicios"));
            setEjerciciosDB(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const handleGuardar = async (rutinaId, data) => {
        setGuardando(true);
        try {
            await updateDoc(doc(db, "rutinas_asignadas", rutinaId), {
                nombre: data.nombre,
                descripcion: data.descripcion || "",
                semanas: data.semanas,
            });
            setEditando(null);
            await cargar();
        } catch (e) { alert("Error al guardar: " + e.message); }
        finally { setGuardando(false); }
    };

    const formatFecha = (ts) => {
        if (!ts) return "—";
        try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }); }
        catch { return "—"; }
    };

    const totalEj = (r) => (r.semanas || []).reduce((a, s) => a + (s.dias || []).reduce((b, d) => b + ETAPAS.reduce((c, et) => c + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0), 0), 0);

    const handleDescargar = async (r) => {
        setDescargando(r.id);
        try {
            const profe = miDoc || { nombre: "Entrenador", apellido: "" };
            const pdfDoc = await generarPDFRutina(r, alumno, profe);
            pdfDoc.save(`Rutina_${(alumno.nombre || "alumno").replace(/\s+/g, "_")}.pdf`);
        } catch (e) { alert("Error al generar PDF: " + e.message); }
        finally { setDescargando(null); }
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, width: "min(740px,97vw)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.9)" }}>

                {/* Header */}
                <div style={{ padding: "22px 28px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <p style={{ fontFamily: FB, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(0,180,216,0.7)", margin: "0 0 4px" }}>Historial de rutinas</p>
                            <h2 style={{ fontFamily: FT, fontSize: 26, letterSpacing: 2, color: "white", margin: 0 }}>
                                {alumno.nombre?.toUpperCase()} {(alumno.apellido || "").toUpperCase()}
                            </h2>
                            <p style={{ fontFamily: FB, fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                                {alumno.sede || "Sin sede"}{alumno.edad ? ` · ${alumno.edad} años` : ""}
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 26, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ overflowY: "auto", flex: 1, padding: "20px 28px" }}>
                    {cargando ? (
                        <p style={{ fontFamily: FB, fontSize: 14, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>Cargando historial...</p>
                    ) : rutinas.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 0" }}>
                            <p style={{ fontSize: 40, marginBottom: 12 }}>📋</p>
                            <p style={{ fontFamily: FT, fontSize: 24, letterSpacing: 2, color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>SIN HISTORIAL</p>
                            <p style={{ fontFamily: FB, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Todavía no se le asignó ninguna rutina a este alumno.</p>
                        </div>
                    ) : (
                        <>
                            <p style={{ fontFamily: FB, fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>
                                {rutinas.length} rutina{rutinas.length !== 1 ? "s" : ""} en el historial
                            </p>
                            {rutinas.map((r, idx) => {
                                // Solo es "ACTUAL" si el alumno tiene rutina activa Y es la más reciente
                                const esActual = idx === 0 && alumno.tieneRutina;
                                const expanded = expandida === r.id;
                                const enEdicion = editando === r.id;
                                const tejTotal = totalEj(r);
                                const tdias = (r.semanas || []).reduce((a, s) => a + (s.dias?.length || 0), 0);

                                return (
                                    <div key={r.id} style={{ background: esActual ? "rgba(0,180,216,0.04)" : "rgba(255,255,255,0.015)", border: `1px solid ${esActual ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 16, marginBottom: 12, overflow: "hidden", opacity: esActual ? 1 : 0.8 }}>

                                        {/* Cabecera */}
                                        <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                                                    <p style={{ fontFamily: FT, fontSize: 18, letterSpacing: 2, color: "white", margin: 0 }}>{r.nombre}</p>
                                                    {esActual
                                                        ? <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 20, padding: "2px 10px", flexShrink: 0 }}>● ACTUAL</span>
                                                        : <span style={{ fontFamily: FB, fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "2px 10px", flexShrink: 0 }}>
                                                            📅 Asignada el {formatFecha(r.asignadoEn)}
                                                        </span>
                                                    }
                                                </div>
                                                {r.descripcion && <p style={{ fontFamily: FB, fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 6px", lineHeight: 1.5 }}>{r.descripcion}</p>}
                                                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                                    {!esActual && <span style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>📅 {formatFecha(r.asignadoEn)}</span>}
                                                    <span style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{r.semanas?.length || 0} sem · {tdias} días</span>
                                                    <span style={{ fontFamily: FB, fontSize: 11, color: "rgba(0,180,216,0.7)" }}>{tejTotal} ejercicios</span>
                                                </div>
                                            </div>

                                            {/* Acciones */}
                                            <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                                                <button onClick={() => handleDescargar(r)} disabled={descargando === r.id}
                                                    style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, background: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.25)", color: "#00b4d8", borderRadius: 10, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(0,180,216,0.15)"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(0,180,216,0.08)"}>
                                                    {descargando === r.id ? <Spinner /> : "⬇️"} PDF
                                                </button>
                                                <button onClick={() => { setEditando(enEdicion ? null : r.id); setExpandida(null); }}
                                                    style={{ fontFamily: FB, fontSize: 12, fontWeight: 600, background: enEdicion ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.05)", border: `1px solid ${enEdicion ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.12)"}`, color: enEdicion ? "#f59e0b" : "rgba(255,255,255,0.6)", borderRadius: 10, padding: "7px 12px", cursor: "pointer" }}
                                                    onMouseEnter={e => { if (!enEdicion) e.currentTarget.style.background = "rgba(255,255,255,0.1)" }}
                                                    onMouseLeave={e => { if (!enEdicion) e.currentTarget.style.background = "rgba(255,255,255,0.05)" }}>
                                                    {enEdicion ? "✕ Editar" : "✏️ Editar"}
                                                </button>
                                                <button onClick={() => { setExpandida(expanded ? null : r.id); setEditando(null); }}
                                                    style={{ fontFamily: FB, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "7px 12px", cursor: "pointer" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                                                    {expanded ? "▲ Cerrar" : "▼ Ver"}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Editor inline */}
                                        {enEdicion && (
                                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "0 20px 16px" }}>
                                                <MiniBuilder
                                                    rutina={r}
                                                    ejerciciosDB={ejerciciosDB}
                                                    onGuardar={(data) => handleGuardar(r.id, data)}
                                                    onCerrar={() => setEditando(null)}
                                                    guardando={guardando}
                                                />
                                            </div>
                                        )}

                                        {/* Vista de detalle */}
                                        {expanded && (
                                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px" }}>
                                                {(r.semanas || []).map((sem, si) => (
                                                    <div key={si} style={{ marginBottom: 16 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                                            <span style={{ fontFamily: FT, fontSize: 15, letterSpacing: 3, color: "#00b4d8" }}>SEMANA {si + 1}</span>
                                                            <span style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{sem.dias?.length} día{sem.dias?.length !== 1 ? "s" : ""}</span>
                                                        </div>
                                                        {(sem.dias || []).map((dia, di) => {
                                                            const ejt = ETAPAS.reduce((a, et) => a + (dia.etapas?.[et.id]?.ejercicios?.length || 0), 0);
                                                            return (
                                                                <div key={di} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                                                        <span style={{ fontFamily: FT, fontSize: 13, letterSpacing: 2, color: "white" }}>DÍA {di + 1}</span>
                                                                        <span style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{ejt} ejercicios</span>
                                                                    </div>
                                                                    {ETAPAS.map(et => {
                                                                        const ejs = dia.etapas?.[et.id]?.ejercicios || [];
                                                                        if (!ejs.length) return null;
                                                                        return (
                                                                            <div key={et.id} style={{ marginBottom: 10 }}>
                                                                                <p style={{ fontFamily: FB, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: et.color, margin: "0 0 6px" }}>{et.label}</p>
                                                                                {ejs.map((ej, ei) => (
                                                                                    <div key={ei}>
                                                                                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", marginBottom: ej.obs?.trim() ? 0 : 3 }}>
                                                                                            <span style={{ fontFamily: FB, fontSize: 13, color: "white", flex: 1 }}>{ej.nombre}</span>
                                                                                            <span style={{ fontFamily: FB, fontSize: 12, color: "#00b4d8", flexShrink: 0 }}>{ej.series}×{ej.reps}</span>
                                                                                            <span style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{ej.descanso}</span>
                                                                                        </div>
                                                                                        {ej.obs?.trim() && (
                                                                                            <div style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: "0 0 8px 8px", padding: "5px 10px", marginBottom: 3 }}>
                                                                                                <p style={{ fontFamily: FB, fontSize: 11, color: "#fbbf24", margin: 0, lineHeight: 1.5 }}>📝 {ej.obs}</p>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                    <button onClick={onClose} style={{ width: "100%", fontFamily: FB, fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "13px", borderRadius: 12, cursor: "pointer" }}>Cerrar</button>
                </div>
            </div>
        </>
    );
}

function Spinner({ color = "#00b4d8" }) {
    return (
        <>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <span style={{ display: "inline-block", width: 11, height: 11, border: `2px solid ${color}33`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
        </>
    );
}