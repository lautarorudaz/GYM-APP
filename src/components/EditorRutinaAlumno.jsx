// src/components/EditorRutinaAlumno.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Builder completo para editar la rutina activa de un alumno específico.
// Carga la última rutina de rutinas_asignadas y guarda los cambios SOLO ahí.
// La rutina genérica nunca se toca.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

const FB = "'DM Sans', sans-serif";
const FT = "'Bebas Neue', sans-serif";

const ETAPAS = [
    { id: "movilidad", label: "Movilidad", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
    { id: "activacion", label: "Activación", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { id: "general", label: "General", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];
const ETAPA_MAP = Object.fromEntries(ETAPAS.map(e => [e.id, e]));
const GRUPOS = ["Hombro", "Espalda", "Bíceps", "Tríceps", "Abdomen", "Antebrazos", "Pecho", "Cuádriceps", "Isquios", "Gemelos"];

const INPUT_S = {
    fontFamily: FB, fontSize: 14,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "11px 14px", color: "white", outline: "none",
    width: "100%", boxSizing: "border-box",
};
const LABEL_S = {
    fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
    textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8,
};

const uid = () => Math.random().toString(36).slice(2, 9);

const addIds = (semanas) => (semanas || []).map(s => ({
    ...s, _id: uid(),
    dias: (s.dias || []).map(d => ({
        ...d, _id: uid(),
        etapas: Object.fromEntries(
            Object.entries(d.etapas || {}).map(([k, v]) => [k, { ...v, ejercicios: (v.ejercicios || []).map(e => ({ ...e, _id: uid() })) }])
        ),
    })),
}));

const stripIds = (semanas) => semanas.map(({ _id, ...s }) => ({
    ...s,
    dias: s.dias.map(({ _id, ...d }) => ({
        ...d,
        etapas: Object.fromEntries(
            Object.entries(d.etapas).map(([k, v]) => [k, { ...v, ejercicios: (v.ejercicios || []).map(({ _id, ...e }) => e) }])
        ),
    })),
}));

/* ═══ SELECTOR DE EJERCICIOS ════════════════════════════════ */
function SelectorEjercicio({ ejerciciosDB, etapaId, onSeleccionar, onClose }) {
    const etapa = ETAPA_MAP[etapaId];
    const base = (ejerciciosDB || []).filter(e => e.etapas?.includes(etapaId));
    const [busq, setBusq] = useState("");
    const [grupo, setGrupo] = useState("");
    const lista = base.filter(e =>
        (!busq || e.nombre?.toLowerCase().includes(busq.toLowerCase())) &&
        (!grupo || e.grupos?.includes(grupo))
    );
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 601, background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "min(540px,95vw)", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.9)" }}>
                <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontFamily: FT, fontSize: 20, letterSpacing: 2, color: "white" }}>Agregar ejercicio</span>
                            <span style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: etapa.bg, color: etapa.color, border: `1px solid ${etapa.color}` }}>{etapa.label}</span>
                        </div>
                        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
                    </div>
                    <input value={busq} onChange={e => setBusq(e.target.value)} placeholder="🔍  Buscar..." style={{ ...INPUT_S, marginBottom: 10, fontSize: 13 }} />
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["", ...GRUPOS].map(g => (
                            <button key={g} onClick={() => setGrupo(g)} style={{ fontFamily: FB, fontSize: 11, padding: "4px 10px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s", background: grupo === g ? "rgba(0,180,216,0.1)" : "rgba(255,255,255,0.04)", border: grupo === g ? "1px solid rgba(0,180,216,0.3)" : "1px solid rgba(255,255,255,0.12)", color: grupo === g ? "#00b4d8" : "rgba(255,255,255,0.5)" }}>
                                {g || "Todos"}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ overflowY: "auto", flex: 1, padding: "10px 14px" }}>
                    {lista.length === 0
                        ? <p style={{ fontFamily: FB, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "28px 0" }}>{base.length === 0 ? `No hay ejercicios de ${etapa.label} aún.` : "Sin resultados."}</p>
                        : lista.map(ej => (
                            <div key={ej.id} onClick={() => onSeleccionar(ej)}
                                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 12, marginBottom: 5, cursor: "pointer", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.06)"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.2)" }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)" }}>
                                <div style={{ width: 44, height: 33, borderRadius: 7, overflow: "hidden", flexShrink: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {ej.videoLink
                                        ? <img src={`https://img.youtube.com/vi/${ej.videoLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/default.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        : <span style={{ fontSize: 15, opacity: 0.3 }}>🎬</span>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontFamily: FB, fontSize: 13, fontWeight: 500, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ej.nombre}</p>
                                    <p style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>{ej.grupos?.join(", ")}</p>
                                </div>
                                <span style={{ fontFamily: FB, fontSize: 12, color: "#00b4d8", flexShrink: 0 }}>+ Agregar</span>
                            </div>
                        ))
                    }
                </div>
            </div>
        </>
    );
}

/* ═══ FILA DE EJERCICIO ══════════════════════════════════════ */
function FilaEjercicio({ item, onChange, onEliminar }) {
    const [obsOpen, setObsOpen] = useState(false);
    const tieneObs = item.obs?.trim().length > 0;
    return (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, marginBottom: 6, overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 12px" }}>
                {/* Nombre + thumbnail */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 38, height: 28, borderRadius: 5, overflow: "hidden", flexShrink: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {item.videoLink
                            ? <img src={`https://img.youtube.com/vi/${item.videoLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/default.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: 13, opacity: 0.3 }}>🎬</span>}
                    </div>
                    <p style={{ fontFamily: FB, fontSize: 13, fontWeight: 500, color: "white", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{item.nombre}</p>
                </div>
                {/* Fila 1: Series × Reps */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" min={1} max={20} value={item.series || ""} onChange={e => onChange({ ...item, series: e.target.value })} placeholder="S"
                        style={{ ...INPUT_S, width: 44, padding: "6px", textAlign: "center", fontSize: 13 }} />
                    <span style={{ fontFamily: FB, fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>×</span>
                    <input type="text" value={item.reps || ""} onChange={e => onChange({ ...item, reps: e.target.value })} placeholder="Reps"
                        style={{ ...INPUT_S, width: 70, padding: "6px", textAlign: "center", fontSize: 13 }} />
                </div>
                {/* Fila 2: Descanso + Obs + X */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="text" value={item.descanso || ""} onChange={e => onChange({ ...item, descanso: e.target.value })} placeholder="60s"
                        style={{ ...INPUT_S, width: 56, padding: "6px", textAlign: "center", fontSize: 12 }} />
                    <button onClick={() => setObsOpen(o => !o)} style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: 8, cursor: "pointer", flexShrink: 0, position: "relative", border: obsOpen || tieneObs ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(255,255,255,0.12)", background: obsOpen || tieneObs ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)", color: obsOpen || tieneObs ? "#fbbf24" : "rgba(255,255,255,0.45)", transition: "all 0.15s" }}>
                        Obs{tieneObs && !obsOpen && <span style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: "#fbbf24" }} />}
                    </button>
                    <button onClick={onEliminar} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.6)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", flexShrink: 0, fontSize: 13 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.color = "#f87171" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "rgba(239,68,68,0.6)" }}>✕</button>
                </div>
            </div>
            {obsOpen && (
                <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <label style={{ ...LABEL_S, marginTop: 10, marginBottom: 6, color: "rgba(251,191,36,0.6)" }}>📝 Observación</label>
                    <textarea value={item.obs || ""} onChange={e => onChange({ ...item, obs: e.target.value })} rows={2}
                        placeholder="Ej: Mantené la espalda recta..."
                        style={{ ...INPUT_S, resize: "vertical", lineHeight: 1.6, fontSize: 13, border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.04)" }} />
                </div>
            )}
        </div>
    );
}

/* ═══ BLOQUE ETAPA ══════════════════════════════════════════ */
function BloqueEtapa({ etapaId, data, ejerciciosDB, onUpdate }) {
    const etapa = ETAPA_MAP[etapaId];
    const [selector, setSelector] = useState(false);
    const [open, setOpen] = useState(true);
    const ejercicios = data.ejercicios || [];
    const agregar = (ej) => { onUpdate({ ...data, ejercicios: [...ejercicios, { _id: uid(), id: ej.id, nombre: ej.nombre, videoLink: ej.videoLink || null, series: "3", reps: "10-12", descanso: "60s" }] }); setSelector(false); };
    const actualizar = (idx, u) => onUpdate({ ...data, ejercicios: ejercicios.map((e, i) => i === idx ? u : e) });
    const eliminar = (idx) => onUpdate({ ...data, ejercicios: ejercicios.filter((_, i) => i !== idx) });
    return (
        <div style={{ marginBottom: 12 }}>
            <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: etapa.bg, border: `1px solid ${etapa.color}22`, borderRadius: open ? "12px 12px 0 0" : 12, padding: "10px 16px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: FB, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: etapa.color }}>{etapa.label}</span>
                    <span style={{ fontFamily: FB, fontSize: 11, color: `${etapa.color}99` }}>{ejercicios.length} ejercicio{ejercicios.length !== 1 ? "s" : ""}</span>
                </div>
                <span style={{ color: etapa.color, fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
            </button>
            {open && (
                <div style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${etapa.color}22`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px" }}>
                    {ejercicios.length === 0 && <p style={{ fontFamily: FB, fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "8px 0", fontStyle: "italic" }}>Sin ejercicios</p>}
                    {ejercicios.map((item, idx) => (
                        <FilaEjercicio key={item._id} item={item} onChange={u => actualizar(idx, u)} onEliminar={() => eliminar(idx)} />
                    ))}
                    <button onClick={() => setSelector(true)} style={{ fontFamily: FB, fontSize: 12, padding: "7px 14px", borderRadius: 10, cursor: "pointer", width: "100%", marginTop: 4, background: etapa.bg, border: `1px solid ${etapa.color}44`, color: etapa.color }}>
                        + Agregar ejercicio de {etapa.label}
                    </button>
                </div>
            )}
            {selector && <SelectorEjercicio ejerciciosDB={ejerciciosDB} etapaId={etapaId} onSeleccionar={agregar} onClose={() => setSelector(false)} />}
        </div>
    );
}

/* ═══ CARD DÍA ══════════════════════════════════════════════ */
function CardDia({ dia, diaIdx, ejerciciosDB, onUpdate, onEliminar }) {
    const [open, setOpen] = useState(diaIdx === 0);
    const total = ETAPAS.reduce((a, et) => a + (dia.etapas[et.id]?.ejercicios?.length || 0), 0);
    return (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: FT, fontSize: 16, letterSpacing: 2, color: "white" }}>Día {diaIdx + 1}</span>
                    <span style={{ fontFamily: FB, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{total} ejercicio{total !== 1 ? "s" : ""}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                        {ETAPAS.map(et => { const c = dia.etapas[et.id]?.ejercicios?.length || 0; return c ? <span key={et.id} style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: et.bg, color: et.color, border: `1px solid ${et.color}44` }}>{c}</span> : null; })}
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button onClick={onEliminar} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.5)", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.color = "#f87171" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "rgba(239,68,68,0.5)" }}>✕ Día</button>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", cursor: "pointer" }}>▼</span>
                </div>
            </div>
            {open && (
                <div style={{ padding: "16px 18px" }}>
                    {ETAPAS.map(et => (
                        <BloqueEtapa key={et.id} etapaId={et.id} data={dia.etapas[et.id] || { ejercicios: [] }} ejerciciosDB={ejerciciosDB}
                            onUpdate={d => onUpdate({ ...dia, etapas: { ...dia.etapas, [et.id]: d } })} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ═══ CARD SEMANA ═══════════════════════════════════════════ */
function CardSemana({ semana, semanaIdx, ejerciciosDB, onUpdate, onEliminar }) {
    const [open, setOpen] = useState(semanaIdx === 0);
    const totalEj = semana.dias.reduce((a, d) => a + ETAPAS.reduce((b, et) => b + (d.etapas[et.id]?.ejercicios?.length || 0), 0), 0);
    const addDia = () => onUpdate({ ...semana, dias: [...semana.dias, { _id: uid(), nombre: `Día ${semana.dias.length + 1}`, etapas: { movilidad: { ejercicios: [] }, activacion: { ejercicios: [] }, general: { ejercicios: [] } } }] });
    const updateDia = (idx, d) => onUpdate({ ...semana, dias: semana.dias.map((x, i) => i === idx ? d : x) });
    const deleteDia = (idx) => { if (semana.dias.length <= 1) { alert("Mínimo 1 día."); return; } onUpdate({ ...semana, dias: semana.dias.filter((_, i) => i !== idx) }); };
    return (
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(0,180,216,0.04)", borderBottom: open ? "1px solid rgba(255,255,255,0.07)" : "none", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: FT, fontSize: 20, letterSpacing: 3, color: "#00b4d8" }}>Semana {semanaIdx + 1}</span>
                    <span style={{ fontFamily: FB, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{semana.dias.length} día{semana.dias.length !== 1 ? "s" : ""} · {totalEj} ejercicio{totalEj !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button onClick={onEliminar} style={{ fontFamily: FB, fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.5)" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f87171"} onMouseLeave={e => e.currentTarget.style.color = "rgba(239,68,68,0.5)"}>✕ Semana</button>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                </div>
            </div>
            {open && (
                <div style={{ padding: "16px 20px" }}>
                    {semana.dias.map((dia, diaIdx) => (
                        <CardDia key={dia._id} dia={dia} diaIdx={diaIdx} ejerciciosDB={ejerciciosDB}
                            onUpdate={d => updateDia(diaIdx, d)} onEliminar={() => deleteDia(diaIdx)} />
                    ))}
                    <button onClick={addDia} style={{ fontFamily: FB, fontSize: 13, background: "rgba(0,180,216,0.06)", border: "1px solid rgba(0,180,216,0.2)", color: "#00b4d8", width: "100%", borderRadius: 12, padding: "10px", cursor: "pointer" }}>
                        + Agregar día a Semana {semanaIdx + 1}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ═══ COMPONENTE PRINCIPAL ══════════════════════════════════ */
export default function EditorRutinaAlumno({ alumno, miDoc, onClose, onGuardado }) {
    const [rutinaDoc, setRutinaDoc] = useState(null); // doc completo de rutinas_asignadas
    const [rutina, setRutina] = useState(null); // estado editable con _ids
    const [ejerciciosDB, setEjerciciosDB] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("builder");

    useEffect(() => { cargar(); cargarEjercicios(); }, [alumno.id]);

    const cargar = async () => {
        setCargando(true);
        try {
            const snap = await getDocs(query(collection(db, "rutinas_asignadas"), where("alumnoId", "==", alumno.id)));
            if (snap.empty) { setError("No hay rutina asignada para este alumno."); setCargando(false); return; }
            const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            todas.sort((a, b) => (b.asignadoEn?.toMillis?.() ?? 0) - (a.asignadoEn?.toMillis?.() ?? 0));
            const doc_ = todas[0];
            setRutinaDoc(doc_);
            setRutina({ nombre: doc_.nombre || "", descripcion: doc_.descripcion || "", semanas: addIds(doc_.semanas || []) });
        } catch (e) { setError("Error al cargar: " + e.message); }
        finally { setCargando(false); }
    };

    const cargarEjercicios = async () => {
        try {
            const snap = await getDocs(collection(db, "ejercicios"));
            setEjerciciosDB(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const handleGuardar = async () => {
        if (!rutina.nombre.trim()) { setError("El nombre es obligatorio."); setTab("info"); return; }
        setGuardando(true); setError("");
        try {
            await updateDoc(doc(db, "rutinas_asignadas", rutinaDoc.id), {
                nombre: rutina.nombre,
                descripcion: rutina.descripcion || "",
                semanas: stripIds(rutina.semanas),
            });
            onGuardado?.();
            onClose();
        } catch (e) { setError("Error al guardar: " + e.message); }
        finally { setGuardando(false); }
    };

    const addSemana = () => setRutina(r => ({ ...r, semanas: [...r.semanas, { _id: uid(), nombre: `Semana ${r.semanas.length + 1}`, dias: [{ _id: uid(), nombre: "Día 1", etapas: { movilidad: { ejercicios: [] }, activacion: { ejercicios: [] }, general: { ejercicios: [] } } }] }] }));
    const updateSemana = (idx, s) => setRutina(r => ({ ...r, semanas: r.semanas.map((x, i) => i === idx ? s : x) }));
    const deleteSemana = (idx) => { if (rutina.semanas.length <= 1) { alert("Mínimo 1 semana."); return; } setRutina(r => ({ ...r, semanas: r.semanas.filter((_, i) => i !== idx) })); };

    const totalSemanas = rutina?.semanas.length || 0;
    const totalDias = rutina?.semanas.reduce((a, s) => a + s.dias.length, 0) || 0;
    const totalEj = rutina?.semanas.reduce((a, s) => a + s.dias.reduce((b, d) => b + ETAPAS.reduce((c, et) => c + (d.etapas[et.id]?.ejercicios?.length || 0), 0), 0), 0) || 0;

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 401, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, width: "min(820px,97vw)", maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.9)" }}
                className="editor-rutina-outer">
                <style>{`
          @media(max-width:600px){
            .editor-rutina-outer{top:0!important;left:0!important;transform:none!important;width:100vw!important;height:100svh!important;max-height:100svh!important;border-radius:0!important;}
          }
        `}</style>

                {/* Header */}
                <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                            <p style={{ fontFamily: FB, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(0,180,216,0.7)", margin: "0 0 2px" }}>
                                Editando rutina de
                            </p>
                            <h2 style={{ fontFamily: FT, fontSize: 26, letterSpacing: 2, color: "white", margin: "0 0 4px" }}>
                                {alumno.nombre?.toUpperCase()} {(alumno.apellido || "").toUpperCase()}
                            </h2>
                            {rutina && (
                                <div style={{ display: "flex", gap: 16 }}>
                                    {[{ val: totalSemanas, label: "semanas" }, { val: totalDias, label: "días" }, { val: totalEj, label: "ejercicios" }].map(s => (
                                        <span key={s.label} style={{ fontFamily: FB, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                                            <span style={{ color: "#00b4d8", fontWeight: 600 }}>{s.val}</span> {s.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 26, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                    {/* Tabs */}
                    <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        {[["info", "📝 Info"], ["builder", "🏗️ Builder"]].map(([v, l]) => (
                            <button key={v} onClick={() => setTab(v)} style={{ fontFamily: FB, fontSize: 13, fontWeight: 500, background: "none", border: "none", color: tab === v ? "#00b4d8" : "rgba(255,255,255,0.4)", padding: "8px 18px", cursor: "pointer", position: "relative", borderBottom: tab === v ? "2px solid #00b4d8" : "2px solid transparent" }}>{l}</button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
                    {cargando && <p style={{ fontFamily: FB, fontSize: 14, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "40px 0" }}>Cargando rutina...</p>}

                    {!cargando && error && !rutina && (
                        <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "16px 20px", textAlign: "center" }}>
                            <p style={{ fontFamily: FB, fontSize: 14, color: "#f87171", margin: 0 }}>⚠️ {error}</p>
                        </div>
                    )}

                    {!cargando && rutina && (
                        <>
                            {tab === "info" && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                    <div>
                                        <label style={LABEL_S}>Nombre de la rutina *</label>
                                        <input value={rutina.nombre} onChange={e => setRutina(r => ({ ...r, nombre: e.target.value }))}
                                            placeholder="Ej: Rutina de fuerza 4 semanas" style={INPUT_S} />
                                    </div>
                                    <div>
                                        <label style={LABEL_S}>Descripción <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", letterSpacing: 0 }}>— opcional</span></label>
                                        <textarea value={rutina.descripcion} onChange={e => setRutina(r => ({ ...r, descripcion: e.target.value }))}
                                            rows={3} style={{ ...INPUT_S, resize: "vertical", lineHeight: 1.6 }} />
                                    </div>
                                    {/* Aviso importante */}
                                    <div style={{ background: "rgba(0,180,216,0.05)", border: "1px solid rgba(0,180,216,0.2)", borderRadius: 12, padding: "12px 16px" }}>
                                        <p style={{ fontFamily: FB, fontSize: 13, color: "rgba(0,180,216,0.8)", margin: 0, lineHeight: 1.6 }}>
                                            💡 Los cambios que hagas acá solo afectan la rutina de <strong style={{ color: "white" }}>{alumno.nombre}</strong>. La rutina genérica no se modifica.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {tab === "builder" && (
                                <>
                                    {rutina.semanas.map((sem, idx) => (
                                        <CardSemana key={sem._id} semana={sem} semanaIdx={idx} ejerciciosDB={ejerciciosDB}
                                            onUpdate={s => updateSemana(idx, s)} onEliminar={() => deleteSemana(idx)} />
                                    ))}
                                    <button onClick={addSemana} style={{ fontFamily: FB, fontSize: 14, background: "rgba(0,180,216,0.05)", border: "1px dashed rgba(0,180,216,0.3)", color: "#00b4d8", width: "100%", borderRadius: 14, padding: "14px", cursor: "pointer", letterSpacing: 1 }}>
                                        + Agregar Semana {rutina.semanas.length + 1}
                                    </button>
                                </>
                            )}

                            {error && (
                                <p style={{ fontFamily: FB, fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 16 }}>
                                    {error}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!cargando && rutina && (
                    <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, flexShrink: 0 }}>
                        <button onClick={onClose} style={{ flex: 1, fontFamily: FB, fontSize: 14, fontWeight: 500, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "13px", borderRadius: 12, cursor: "pointer" }}>
                            Cancelar
                        </button>
                        <button onClick={handleGuardar} disabled={guardando} style={{ flex: 2, fontFamily: FB, fontSize: 14, fontWeight: 700, background: guardando ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: guardando ? "not-allowed" : "pointer" }}>
                            {guardando ? "Guardando..." : "✓ Guardar cambios"}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}