import { useState, useEffect } from "react";
import {
    collection, addDoc, getDocs, updateDoc, deleteDoc,
    doc, serverTimestamp, query, orderBy, where
} from "firebase/firestore";
import { db } from "../../firebase";
import ProfesorNavBar from "./ProfesorNavBar";

/* ─── Constantes ─────────────────────────────────────────── */
const ETAPAS = [
    { id: "movilidad", label: "Movilidad", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
    { id: "activacion", label: "Activación", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { id: "general", label: "General", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];
const ETAPA_MAP = Object.fromEntries(ETAPAS.map(e => [e.id, e]));
const GRUPOS = ["Hombro", "Espalda", "Bíceps", "Tríceps", "Abdomen", "Antebrazos", "Pecho", "Cuádriceps", "Isquios", "Gemelos"];

const FONT_TITLE = "'Bebas Neue', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const BTN_BASE = {
    fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500,
    padding: "6px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.5)",
};
const BTN_ACTIVE = { ...BTN_BASE, background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8" };
const LABEL_S = {
    fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
    textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8,
};
const INPUT_S = {
    fontFamily: FONT_BODY, fontSize: 14,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "11px 14px", color: "white", outline: "none", width: "100%", boxSizing: "border-box",
};
const CARD_S = { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" };
const uid = () => Math.random().toString(36).slice(2, 9);

const diaVacio = () => ({
    _id: uid(), nombre: "Día 1",
    etapas: { movilidad: { ejercicios: [] }, activacion: { ejercicios: [] }, general: { ejercicios: [] } },
});
const semanaVacia = (num) => ({ _id: uid(), nombre: `Semana ${num}`, dias: [diaVacio()] });
const rutinaVacia = () => ({ nombre: "", descripcion: "", semanas: [semanaVacia(1)] });

const addIds = (semanas) => (semanas || []).map(s => ({
    ...s, _id: uid(),
    dias: (s.dias || []).map(d => ({
        ...d, _id: uid(),
        etapas: Object.fromEntries(
            Object.entries(d.etapas || {}).map(([etId, etData]) => [
                etId, { ...etData, ejercicios: (etData.ejercicios || []).map(ej => ({ ...ej, _id: uid() })) }
            ])
        ),
    })),
}));

const limpiarIds = (semanas) => semanas.map(({ _id, ...s }) => ({
    ...s,
    dias: s.dias.map(({ _id, ...d }) => ({
        ...d,
        etapas: Object.fromEntries(
            Object.entries(d.etapas).map(([etId, etData]) => [
                etId, { ...etData, ejercicios: (etData.ejercicios || []).map(({ _id, ...ej }) => ej) }
            ])
        ),
    })),
}));

/* ═══ SELECTOR DE EJERCICIOS ═══════════════════════════════ */
function SelectorEjercicio({ ejerciciosDB, etapaId, onSeleccionar, onClose }) {
    const etapa = ETAPA_MAP[etapaId];
    const base = ejerciciosDB.filter(e => e.etapas?.includes(etapaId));
    const [busqueda, setBusqueda] = useState("");
    const [filtroGrupo, setFiltroGrupo] = useState("");
    const lista = base.filter(e =>
        (!busqueda || e.nombre?.toLowerCase().includes(busqueda.toLowerCase())) &&
        (!filtroGrupo || e.grupos?.includes(filtroGrupo))
    );
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 501, background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "min(560px,95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
                <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontFamily: FONT_TITLE, fontSize: 20, letterSpacing: 2, color: "white" }}>Agregar ejercicio</span>
                            <span style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: etapa.bg, color: etapa.color, border: `1px solid ${etapa.color}` }}>{etapa.label}</span>
                        </div>
                        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
                    </div>
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍  Buscar ejercicio..." style={{ ...INPUT_S, marginBottom: 10 }} />
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {["", ...GRUPOS].map(g => (
                            <button key={g} onClick={() => setFiltroGrupo(g)} style={{ ...BTN_BASE, ...(filtroGrupo === g ? BTN_ACTIVE : {}), fontSize: 11, padding: "4px 10px" }}>{g || "Todos"}</button>
                        ))}
                    </div>
                </div>
                <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
                    {lista.length === 0 ? (
                        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "32px 0" }}>
                            {base.length === 0 ? `No hay ejercicios de ${etapa.label} aún.` : "Sin resultados."}
                        </p>
                    ) : lista.map(ej => (
                        <div key={ej.id} onClick={() => onSeleccionar(ej)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, marginBottom: 6, cursor: "pointer", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.06)"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.2)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                            <div style={{ width: 48, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {ej.videoLink ? <img src={`https://img.youtube.com/vi/${ej.videoLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/default.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 16, opacity: 0.3 }}>🎬</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ej.nombre}</p>
                                <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>{ej.grupos?.join(", ")}</p>
                            </div>
                            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#00b4d8", flexShrink: 0 }}>+ Agregar</span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

/* ═══ FILA EJERCICIO ════════════════════════════════════════ */
function FilaEjercicio({ item, onChange, onEliminar }) {
    const [obsOpen, setObsOpen] = useState(false);
    const tieneObs = item.obs?.trim().length > 0;
    return (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, marginBottom: 6, overflow: "hidden" }}>
            <div className="fila-ej-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", flexWrap: "wrap" }}>
                <div style={{ width: 40, height: 30, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.videoLink ? <img src={`https://img.youtube.com/vi/${item.videoLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/default.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 14, opacity: 0.3 }}>🎬</span>}
                </div>
                <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: "white", flex: 1, minWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{item.nombre}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <input type="number" min={1} max={20} value={item.series || ""} onChange={e => onChange({ ...item, series: e.target.value })} placeholder="S" style={{ ...INPUT_S, width: 44, padding: "6px", textAlign: "center", fontSize: 13 }} />
                    <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>×</span>
                    <input type="text" value={item.reps || ""} onChange={e => onChange({ ...item, reps: e.target.value })} placeholder="Reps" style={{ ...INPUT_S, width: 60, padding: "6px", textAlign: "center", fontSize: 13 }} />
                    <input type="text" value={item.descanso || ""} onChange={e => onChange({ ...item, descanso: e.target.value })} placeholder="60s" style={{ ...INPUT_S, width: 48, padding: "6px", textAlign: "center", fontSize: 12 }} />
                    <button onClick={() => setObsOpen(o => !o)} style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, padding: "6px 10px", borderRadius: 8, cursor: "pointer", flexShrink: 0, position: "relative", border: obsOpen || tieneObs ? "1px solid rgba(251,191,36,0.5)" : "1px solid rgba(255,255,255,0.12)", background: obsOpen || tieneObs ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)", color: obsOpen || tieneObs ? "#fbbf24" : "rgba(255,255,255,0.45)", transition: "all 0.15s" }}>
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
                    <textarea value={item.obs || ""} onChange={e => onChange({ ...item, obs: e.target.value })} placeholder="Ej: Mantené la espalda recta..." rows={2} style={{ ...INPUT_S, resize: "vertical", lineHeight: 1.6, fontSize: 13, border: "1px solid rgba(251,191,36,0.25)", background: "rgba(251,191,36,0.04)" }} />
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
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: etapa.color }}>{etapa.label}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: `${etapa.color}99` }}>{ejercicios.length} ejercicio{ejercicios.length !== 1 ? "s" : ""}</span>
                </div>
                <span style={{ color: etapa.color, fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
            </button>
            {open && (
                <div style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${etapa.color}22`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px" }}>
                    {ejercicios.length === 0 && <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "10px 0", fontStyle: "italic" }}>Sin ejercicios aún</p>}
                    {ejercicios.map((item, idx) => <FilaEjercicio key={item._id} item={item} onChange={u => actualizar(idx, u)} onEliminar={() => eliminar(idx)} />)}
                    <button onClick={() => setSelector(true)} style={{ ...BTN_BASE, marginTop: 4, background: etapa.bg, border: `1px solid ${etapa.color}44`, color: etapa.color, fontSize: 12, padding: "7px 14px", borderRadius: 10, width: "100%" }}>+ Agregar ejercicio de {etapa.label}</button>
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
        <div style={{ ...CARD_S, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: FONT_TITLE, fontSize: 16, letterSpacing: 2, color: "white" }}>Día {diaIdx + 1}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{total} ejercicio{total !== 1 ? "s" : ""}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                        {ETAPAS.map(et => { const c = dia.etapas[et.id]?.ejercicios?.length || 0; return c ? <span key={et.id} style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: et.bg, color: et.color, border: `1px solid ${et.color}44` }}>{c}</span> : null; })}
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
                    {ETAPAS.map(et => <BloqueEtapa key={et.id} etapaId={et.id} data={dia.etapas[et.id] || { ejercicios: [] }} ejerciciosDB={ejerciciosDB} onUpdate={d => onUpdate({ ...dia, etapas: { ...dia.etapas, [et.id]: d } })} />)}
                </div>
            )}
        </div>
    );
}

/* ═══ CARD SEMANA ═══════════════════════════════════════════ */
function CardSemana({ semana, semanaIdx, ejerciciosDB, onUpdate, onEliminar }) {
    const [open, setOpen] = useState(semanaIdx === 0);
    const totalEj = semana.dias.reduce((a, d) => a + ETAPAS.reduce((b, et) => b + (d.etapas[et.id]?.ejercicios?.length || 0), 0), 0);
    const addDia = () => onUpdate({ ...semana, dias: [...semana.dias, { ...diaVacio(), nombre: `Día ${semana.dias.length + 1}` }] });
    const updateDia = (idx, d) => onUpdate({ ...semana, dias: semana.dias.map((x, i) => i === idx ? d : x) });
    const deleteDia = (idx) => { if (semana.dias.length <= 1) return alert("Mínimo 1 día."); onUpdate({ ...semana, dias: semana.dias.filter((_, i) => i !== idx) }); };
    return (
        <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(0,180,216,0.04)", borderBottom: open ? "1px solid rgba(255,255,255,0.07)" : "none", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontFamily: FONT_TITLE, fontSize: 20, letterSpacing: 3, color: "#00b4d8" }}>Semana {semanaIdx + 1}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{semana.dias.length} día{semana.dias.length !== 1 ? "s" : ""} · {totalEj} ejercicio{totalEj !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
                    <button onClick={onEliminar} style={{ ...BTN_BASE, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.5)", fontSize: 12, padding: "6px 12px" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f87171"} onMouseLeave={e => e.currentTarget.style.color = "rgba(239,68,68,0.5)"}>✕ Semana</button>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
                </div>
            </div>
            {open && (
                <div style={{ padding: "16px 20px" }}>
                    {semana.dias.map((dia, diaIdx) => <CardDia key={dia._id} dia={dia} diaIdx={diaIdx} ejerciciosDB={ejerciciosDB} onUpdate={d => updateDia(diaIdx, d)} onEliminar={() => deleteDia(diaIdx)} />)}
                    <button onClick={addDia} style={{ ...BTN_BASE, background: "rgba(0,180,216,0.06)", border: "1px solid rgba(0,180,216,0.2)", color: "#00b4d8", width: "100%", borderRadius: 12, padding: "10px", fontSize: 13 }}>+ Agregar día a Semana {semanaIdx + 1}</button>
                </div>
            )}
        </div>
    );
}

/* ═══ MODAL BUILDER ═════════════════════════════════════════ */
function ModalBuilder({ rutinaInicial, ejerciciosDB, onClose, onSave, tituloExtra }) {
    const esEdicion = !!rutinaInicial?.id;
    const [rutina, setRutina] = useState(() =>
        rutinaInicial ? { nombre: rutinaInicial.nombre, descripcion: rutinaInicial.descripcion || "", semanas: rutinaInicial.semanas } : rutinaVacia()
    );
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [tab, setTab] = useState("builder");
    const addSemana = () => setRutina(r => ({ ...r, semanas: [...r.semanas, semanaVacia(r.semanas.length + 1)] }));
    const updateSemana = (idx, s) => setRutina(r => ({ ...r, semanas: r.semanas.map((x, i) => i === idx ? s : x) }));
    const deleteSemana = (idx) => { if (rutina.semanas.length <= 1) return alert("Mínimo 1 semana."); setRutina(r => ({ ...r, semanas: r.semanas.filter((_, i) => i !== idx) })); };
    const handleSave = async () => {
        if (!rutina.nombre.trim()) { setError("El nombre es obligatorio."); setTab("info"); return; }
        setGuardando(true); setError("");
        try { await onSave(rutina); onClose(); } catch (e) { setError("Error: " + e.message); } finally { setGuardando(false); }
    };
    const totalSemanas = rutina.semanas.length;
    const totalDias = rutina.semanas.reduce((a, s) => a + s.dias.length, 0);
    const totalEj = rutina.semanas.reduce((a, s) => a + s.dias.reduce((b, d) => b + ETAPAS.reduce((c, et) => c + (d.etapas[et.id]?.ejercicios?.length || 0), 0), 0), 0);
    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }} />
            <div className="rutina-modal-outer" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 401, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 22, width: "min(800px,97vw)", maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.9)" }}>
                <style>{`@keyframes fadeUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}@media(max-width:600px){.rutina-modal-outer{top:0!important;left:0!important;transform:none!important;width:100vw!important;height:100svh!important;max-height:100svh!important;border-radius:0!important;}.fila-ej-row>p{min-width:calc(100% - 48px)!important;}.fila-ej-row>div{flex-wrap:wrap!important;}}`}</style>
                <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                            {tituloExtra && <p style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#00b4d8", margin: "0 0 4px" }}>{tituloExtra}</p>}
                            <p style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 4px" }}>{esEdicion ? "Editando rutina" : "Nueva rutina"}</p>
                            <h2 style={{ fontFamily: FONT_TITLE, fontSize: 26, letterSpacing: 2, color: "white", margin: 0 }}>{rutina.nombre || "Sin nombre"}</h2>
                            <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                                {[{ val: totalSemanas, label: "semanas" }, { val: totalDias, label: "días" }, { val: totalEj, label: "ejercicios" }].map(s => (
                                    <span key={s.label} style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.35)" }}><span style={{ color: "#00b4d8", fontWeight: 600 }}>{s.val}</span> {s.label}</span>
                                ))}
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 26, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
                    </div>
                    <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        {[["info", "📝 Info"], ["builder", "🏗️ Builder"]].map(([v, l]) => (
                            <button key={v} onClick={() => setTab(v)} style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, background: "none", border: "none", color: tab === v ? "#00b4d8" : "rgba(255,255,255,0.4)", padding: "8px 18px", cursor: "pointer", position: "relative" }}>
                                {l}{tab === v && <span style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "#00b4d8" }} />}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
                    {tab === "info" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            <div><label style={LABEL_S}>Nombre *</label><input value={rutina.nombre} onChange={e => setRutina(r => ({ ...r, nombre: e.target.value }))} placeholder="Ej: Rutina de fuerza 4 semanas" style={INPUT_S} /></div>
                            <div><label style={LABEL_S}>Descripción <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", letterSpacing: 0 }}>— opcional</span></label><textarea value={rutina.descripcion} onChange={e => setRutina(r => ({ ...r, descripcion: e.target.value }))} rows={3} style={{ ...INPUT_S, resize: "vertical", lineHeight: 1.6 }} /></div>
                        </div>
                    )}
                    {tab === "builder" && (
                        <>
                            {rutina.semanas.map((s, idx) => <CardSemana key={s._id} semana={s} semanaIdx={idx} ejerciciosDB={ejerciciosDB} onUpdate={s => updateSemana(idx, s)} onEliminar={() => deleteSemana(idx)} />)}
                            <button onClick={addSemana} style={{ ...BTN_BASE, width: "100%", borderRadius: 14, padding: "14px", fontSize: 14, background: "rgba(0,180,216,0.05)", border: "1px dashed rgba(0,180,216,0.3)", color: "#00b4d8", letterSpacing: 1 }}>+ Agregar Semana {rutina.semanas.length + 1}</button>
                        </>
                    )}
                    {error && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 16 }}>{error}</p>}
                </div>
                <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, flexShrink: 0 }}>
                    <button onClick={onClose} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "13px", borderRadius: 12, cursor: "pointer" }}>Cancelar</button>
                    <button onClick={handleSave} disabled={guardando} style={{ flex: 2, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, background: guardando ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: guardando ? "not-allowed" : "pointer" }}>
                        {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear rutina"}
                    </button>
                </div>
            </div>
        </>
    );
}

/* ═══ MODAL ASIGNAR RUTINA ══════════════════════════════════
   Flujo: elegir alumno → previsualizar/editar → confirmar
══════════════════════════════════════════════════════════ */
function ModalAsignar({ rutina, alumnos, ejerciciosDB, profesorId, onClose, onAsignada }) {
    // paso: "alumno" | "preview"
    const [paso, setPaso] = useState("alumno");
    const [alumnoSel, setAlumnoSel] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [rutinaEdit, setRutinaEdit] = useState(null); // se setea al pasar a preview
    const [asignando, setAsignando] = useState(false);
    const [editando, setEditando] = useState(false); // abre el builder sobre el preview

    const alumnosFiltrados = alumnos.filter(a => {
        const n = `${a.nombre || ""} ${a.apellido || ""}`.toLowerCase();
        return !busqueda || n.includes(busqueda.toLowerCase());
    });

    const irAPreview = (alumno) => {
        setAlumnoSel(alumno);
        // Hacer copia con IDs temporales para que el builder funcione
        setRutinaEdit({ ...rutina, semanas: addIds(rutina.semanas || []) });
        setPaso("preview");
    };

    const handleAsignar = async () => {
        if (!alumnoSel || !rutinaEdit) return;
        setAsignando(true);
        try {
            const semanas = limpiarIds(rutinaEdit.semanas);
            await addDoc(collection(db, "rutinas_asignadas"), {
                nombre: rutinaEdit.nombre,
                descripcion: rutinaEdit.descripcion || "",
                semanas,
                alumnoId: alumnoSel.id,
                alumnoNombre: `${alumnoSel.nombre} ${alumnoSel.apellido || ""}`.trim(),
                profesorId,
                rutinaOrigenId: rutina.id || null,
                asignadoEn: serverTimestamp(),
            });
            // Marcar en el doc del alumno que tiene rutina
            await updateDoc(doc(db, "usuarios", alumnoSel.id), { tieneRutina: true });
            onAsignada(alumnoSel);
            onClose();
        } catch (e) { alert("Error al asignar: " + e.message); }
        finally { setAsignando(false); }
    };

    return (
        <>
            <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }} />

            {/* ── PASO 1: elegir alumno ── */}
            {paso === "alumno" && (
                <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 401, background: "#111", border: "1px solid rgba(0,180,216,0.2)", borderRadius: 20, width: "min(500px,95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
                    <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <div>
                                <p style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(0,180,216,0.7)", margin: "0 0 4px" }}>Asignar rutina</p>
                                <h3 style={{ fontFamily: FONT_TITLE, fontSize: 22, letterSpacing: 2, color: "white", margin: 0 }}>{rutina.nombre}</h3>
                            </div>
                            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer" }}>×</button>
                        </div>
                        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 8, marginBottom: 14 }}>
                            Elegí el alumno al que querés asignarle esta rutina. Vas a poder editarla antes de confirmar.
                        </p>
                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍  Buscar alumno..." style={INPUT_S} />
                    </div>
                    <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
                        {alumnosFiltrados.length === 0 ? (
                            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "32px 0" }}>No se encontraron alumnos.</p>
                        ) : alumnosFiltrados.map(a => (
                            <div key={a.id} onClick={() => irAPreview(a)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: 12, marginBottom: 6, cursor: "pointer", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", transition: "all 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.06)"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.2)" }}
                                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)" }}>
                                <div>
                                    <p style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, color: "white", margin: 0 }}>{a.nombre} {a.apellido || ""}</p>
                                    <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>{a.sede || "Sin sede"} · {a.edad ? `${a.edad} años` : "Edad N/A"}</p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {a.tieneRutina && <span style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: "2px 8px" }}>Ya tiene rutina</span>}
                                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "#00b4d8" }}>Seleccionar →</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── PASO 2: previsualizar / editar ── */}
            {paso === "preview" && rutinaEdit && (
                <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 401, background: "#0d0d0d", border: "1px solid rgba(0,180,216,0.2)", borderRadius: 22, width: "min(820px,97vw)", maxHeight: "94vh", display: "flex", flexDirection: "column", boxShadow: "0 40px 100px rgba(0,0,0,0.9)" }}>
                    {/* Header */}
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <p style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#00b4d8", margin: "0 0 2px" }}>
                                    Asignando a: <strong style={{ color: "white" }}>{alumnoSel.nombre} {alumnoSel.apellido || ""}</strong>
                                </p>
                                <h2 style={{ fontFamily: FONT_TITLE, fontSize: 24, letterSpacing: 2, color: "white", margin: "4px 0 0" }}>{rutinaEdit.nombre}</h2>
                                {rutinaEdit.descripcion && <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{rutinaEdit.descripcion}</p>}
                            </div>
                            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer", flexShrink: 0 }}>×</button>
                        </div>
                        {/* Aviso edición */}
                        <div style={{ marginTop: 14, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                                💡 Podés editar esta rutina antes de asignarla. Los cambios solo afectan la copia del alumno.
                            </p>
                            <button onClick={() => setEditando(true)} style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24", borderRadius: 8, padding: "7px 14px", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
                                ✏️ Editar rutina
                            </button>
                        </div>
                    </div>

                    {/* Preview de semanas (solo lectura) */}
                    <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
                        {(rutinaEdit.semanas || []).map((sem, si) => (
                            <div key={si} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, marginBottom: 14, overflow: "hidden" }}>
                                <div style={{ padding: "14px 20px", background: "rgba(0,180,216,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                    <span style={{ fontFamily: FONT_TITLE, fontSize: 18, letterSpacing: 3, color: "#00b4d8" }}>Semana {si + 1}</span>
                                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 12 }}>{sem.dias?.length} días</span>
                                </div>
                                <div style={{ padding: "12px 20px" }}>
                                    {(sem.dias || []).map((dia, di) => {
                                        const total = ETAPAS.reduce((a, et) => a + (dia.etapas?.[et.id]?.ejercicios?.length || 0), 0);
                                        return (
                                            <div key={di} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 8 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                                    <span style={{ fontFamily: FONT_TITLE, fontSize: 14, letterSpacing: 2, color: "white" }}>Día {di + 1}</span>
                                                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{total} ejercicios</span>
                                                    <div style={{ display: "flex", gap: 4 }}>
                                                        {ETAPAS.map(et => { const c = dia.etapas?.[et.id]?.ejercicios?.length || 0; return c ? <span key={et.id} style={{ fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: et.bg, color: et.color, border: `1px solid ${et.color}44` }}>{et.label} {c}</span> : null; })}
                                                    </div>
                                                </div>
                                                {ETAPAS.map(et => {
                                                    const ejs = dia.etapas?.[et.id]?.ejercicios || [];
                                                    if (!ejs.length) return null;
                                                    return (
                                                        <div key={et.id} style={{ marginBottom: 6 }}>
                                                            <p style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: et.color, margin: "0 0 4px" }}>{et.label}</p>
                                                            {ejs.map((ej, ei) => (
                                                                <div key={ei} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)", marginBottom: 3 }}>
                                                                    <div style={{ width: 32, height: 24, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                        {ej.videoLink ? <img src={`https://img.youtube.com/vi/${ej.videoLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/default.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 10, opacity: 0.3 }}>🎬</span>}
                                                                    </div>
                                                                    <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: "white", flex: 1 }}>{ej.nombre}</span>
                                                                    <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{ej.series}×{ej.reps}</span>
                                                                    <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{ej.descanso}</span>
                                                                    {ej.obs && <span style={{ fontSize: 12 }} title={ej.obs}>📝</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer acciones */}
                    <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, flexShrink: 0 }}>
                        <button onClick={() => setPaso("alumno")} style={{ fontFamily: FONT_BODY, fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "13px 20px", borderRadius: 12, cursor: "pointer" }}>← Volver</button>
                        <button onClick={handleAsignar} disabled={asignando} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700, background: asignando ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: asignando ? "not-allowed" : "pointer" }}>
                            {asignando ? "Asignando..." : "✅ Confirmar asignación"}
                        </button>
                    </div>
                </div>
            )}

            {/* Builder modal sobre el preview para editar */}
            {editando && rutinaEdit && (
                <ModalBuilder
                    rutinaInicial={rutinaEdit}
                    ejerciciosDB={ejerciciosDB}
                    tituloExtra={`Editando para: ${alumnoSel.nombre}`}
                    onClose={() => setEditando(false)}
                    onSave={(data) => { setRutinaEdit({ ...rutinaEdit, ...data, semanas: addIds(data.semanas) }); setEditando(false); }}
                />
            )}
        </>
    );
}

/* ═══ CARD RUTINA ════════════════════════════════════════════ */
function RutinaCard({ rutina, alumnos, ejerciciosDB, profesorId, onEditar, onEliminar, onClonar, onAsignada }) {
    const [modalAsignar, setModalAsignar] = useState(false);
    const totalDias = rutina.semanas?.reduce((a, s) => a + (s.dias?.length || 0), 0) || 0;
    const totalEj = rutina.semanas?.reduce((a, s) => a + (s.dias?.reduce((b, d) => b + ETAPAS.reduce((c, et) => c + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0), 0) || 0), 0) || 0;
    return (
        <>
            <div style={{ ...CARD_S, transition: "border-color 0.2s,transform 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,180,216,0.25)"; e.currentTarget.style.transform = "translateY(-2px)" }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)" }}>
                <div style={{ padding: "18px 20px" }}>
                    <p style={{ fontFamily: FONT_TITLE, fontSize: 20, letterSpacing: 2, color: "white", margin: "0 0 6px", lineHeight: 1.2 }}>{rutina.nombre}</p>
                    {rutina.descripcion && <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 12px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{rutina.descripcion}</p>}
                    <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                        {[{ val: rutina.semanas?.length || 0, label: "semanas", color: "#00b4d8" }, { val: totalDias, label: "días", color: "rgba(255,255,255,0.6)" }, { val: totalEj, label: "ejercicios", color: "rgba(255,255,255,0.6)" }].map(s => (
                            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
                                <p style={{ fontFamily: FONT_TITLE, fontSize: 22, color: s.color, lineHeight: 1, margin: 0 }}>{s.val}</p>
                                <p style={{ fontFamily: FONT_BODY, fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", margin: "2px 0 0" }}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                        {ETAPAS.map(et => { const c = rutina.semanas?.reduce((a, s) => a + s.dias?.reduce((b, d) => b + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0), 0) || 0; return (<span key={et.id} style={{ fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: c > 0 ? et.bg : "rgba(255,255,255,0.03)", color: c > 0 ? et.color : "rgba(255,255,255,0.2)", border: `1px solid ${c > 0 ? et.color + "44" : "rgba(255,255,255,0.06)"}` }}>{et.label} {c > 0 ? `(${c})` : "—"}</span>); })}
                    </div>
                    {/* Botones */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => onEditar(rutina)} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px", cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.08)"; e.currentTarget.style.color = "#00b4d8"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.25)" }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)" }}>✏️ Editar</button>
                        <button onClick={() => onClonar(rutina)} style={{ fontFamily: FONT_BODY, fontSize: 12, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(139,92,246,0.8)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.14)"; e.currentTarget.style.color = "#a78bfa" }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.06)"; e.currentTarget.style.color = "rgba(139,92,246,0.8)" }}>📋 Clonar</button>
                        <button onClick={() => onEliminar(rutina)} style={{ fontFamily: FONT_BODY, fontSize: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.6)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171" }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "rgba(239,68,68,0.6)" }}>🗑️</button>
                    </div>
                    {/* Botón exclusivo del profesor */}
                    <button onClick={() => setModalAsignar(true)} style={{ width: "100%", marginTop: 10, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,rgba(0,180,216,0.15),rgba(0,119,182,0.15))", border: "1px solid rgba(0,180,216,0.35)", color: "#00b4d8", borderRadius: 10, padding: "11px", cursor: "pointer", transition: "all 0.15s", letterSpacing: 0.5 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "linear-gradient(135deg,rgba(0,180,216,0.25),rgba(0,119,182,0.25))"; e.currentTarget.style.borderColor = "#00b4d8" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "linear-gradient(135deg,rgba(0,180,216,0.15),rgba(0,119,182,0.15))"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.35)" }}>
                        👤 Asignar rutina a alumno
                    </button>
                </div>
            </div>

            {modalAsignar && (
                <ModalAsignar
                    rutina={rutina}
                    alumnos={alumnos}
                    ejerciciosDB={ejerciciosDB}
                    profesorId={profesorId}
                    onClose={() => setModalAsignar(false)}
                    onAsignada={(alumno) => { onAsignada?.(alumno); setModalAsignar(false); }}
                />
            )}
        </>
    );
}

/* ═══ PÁGINA PRINCIPAL ══════════════════════════════════════ */
export default function RutinasProfesor({ miDoc, alumnos, notificaciones = [], onMarcarLeida, onMarcarTodas, onClickNotif, vistaActual, sedeActiva, setSedeActiva }) {
    const [rutinas, setRutinas] = useState([]);
    const [ejerciciosDB, setEjerciciosDB] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modal, setModal] = useState(null);
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);
    const [filtroBusqueda, setFiltroBusqueda] = useState("");
    const [toastMsg, setToastMsg] = useState("");

    useEffect(() => { if (miDoc?.id) Promise.all([cargarRutinas(), cargarEjercicios()]); }, [miDoc]);

    const cargarRutinas = async () => {
        setCargando(true);
        try {
            // Carga rutinas genéricas del profe + rutinas genéricas de admin (tipo: "generica")
            const [snapProfe, snapGenericas] = await Promise.all([
                getDocs(query(collection(db, "rutinas"), where("profesorId", "==", miDoc.id))),
                getDocs(query(collection(db, "rutinas"), where("tipo", "==", "generica"))),
            ]);
            const map = new Map();
            [...snapGenericas.docs, ...snapProfe.docs].forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
            setRutinas([...map.values()].sort((a, b) => 0)); // mantener orden
        } catch (e) { console.error(e); }
        finally { setCargando(false); }
    };

    const cargarEjercicios = async () => {
        try {
            const snap = await getDocs(collection(db, "ejercicios"));
            setEjerciciosDB(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
    };

    const handleSave = async (data) => {
        const semanas = limpiarIds(data.semanas);
        const payload = { nombre: data.nombre, descripcion: data.descripcion || "", semanas, profesorId: miDoc.id };
        if (modal === "nuevo") {
            await addDoc(collection(db, "rutinas"), { ...payload, tipo: "generica_profe", creadoEn: serverTimestamp() });
        } else {
            await updateDoc(doc(db, "rutinas", modal.id), payload);
        }
        await cargarRutinas();
    };

    const handleEditar = (rutina) => setModal({ ...rutina, semanas: addIds(rutina.semanas || []) });
    const handleClonar = (rutina) => setModal({ nombre: `${rutina.nombre} (copia)`, descripcion: rutina.descripcion || "", semanas: addIds(rutina.semanas || []) });

    const handleEliminar = async () => {
        if (!confirmarEliminar) return;
        setEliminando(true);
        try { await deleteDoc(doc(db, "rutinas", confirmarEliminar.id)); setConfirmarEliminar(null); await cargarRutinas(); }
        catch (e) { console.error(e); } finally { setEliminando(false); }
    };

    const handleAsignada = (alumno) => {
        setToastMsg(`✅ Rutina asignada a ${alumno.nombre} correctamente`);
        setTimeout(() => setToastMsg(""), 3500);
    };

    const rutinasFiltradas = rutinas.filter(r => !filtroBusqueda || r.nombre?.toLowerCase().includes(filtroBusqueda.toLowerCase()));

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingTop: 62, boxSizing: "border-box", width: "100%" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box}
        body{display:block!important;place-items:unset!important}
        .rut-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
        @media(max-width:640px){.rut-grid{grid-template-columns:1fr}}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.2)}
        input[type=number]::-webkit-inner-spin-button{opacity:0.3}
        button:focus,button:focus-visible{outline:none!important}
      `}</style>

            <ProfesorNavBar usuario={miDoc} notificaciones={notificaciones} onMarcarLeida={onMarcarLeida} onMarcarTodas={onMarcarTodas} onClickNotif={onClickNotif} vistaActual={vistaActual} sedeActiva={sedeActiva} setSedeActiva={setSedeActiva} />

            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
                    <div>
                        <p style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>PLANEAMIENTO</p>
                        <h1 style={{ fontFamily: FONT_TITLE, fontSize: 36, letterSpacing: 3, color: "white", margin: 0 }}>📋 Rutinas</h1>
                        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                            {rutinas.length} rutina{rutinas.length !== 1 ? "s" : ""} disponible{rutinas.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    <button onClick={() => setModal("nuevo")} style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "12px 22px", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(0,180,216,0.25)", whiteSpace: "nowrap" }}>
                        ＋ Nueva rutina
                    </button>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <input value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)} placeholder="🔍  Buscar rutina por nombre..." style={{ ...INPUT_S, fontSize: 14 }} />
                </div>

                {cargando ? (
                    <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "60px 0" }}>Cargando rutinas...</p>
                ) : rutinasFiltradas.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "70px 0" }}>
                        <p style={{ fontFamily: FONT_TITLE, fontSize: 32, letterSpacing: 2, color: "rgba(255,255,255,0.08)", marginBottom: 8 }}>{rutinas.length === 0 ? "Aún no hay rutinas" : "Sin resultados"}</p>
                        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>{rutinas.length === 0 ? 'Hacé clic en "Nueva rutina" para crear la primera.' : "Probá cambiando la búsqueda."}</p>
                    </div>
                ) : (
                    <div className="rut-grid">
                        {rutinasFiltradas.map(r => (
                            <RutinaCard
                                key={r.id}
                                rutina={r}
                                alumnos={alumnos}
                                ejerciciosDB={ejerciciosDB}
                                profesorId={miDoc?.id}
                                onEditar={handleEditar}
                                onEliminar={setConfirmarEliminar}
                                onClonar={handleClonar}
                                onAsignada={handleAsignada}
                            />
                        ))}
                    </div>
                )}
            </div>

            {modal && <ModalBuilder rutinaInicial={modal === "nuevo" ? null : modal} ejerciciosDB={ejerciciosDB} onClose={() => setModal(null)} onSave={handleSave} />}

            {confirmarEliminar && (
                <>
                    <div onClick={() => setConfirmarEliminar(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} />
                    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 401, background: "#111", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "28px", width: "min(400px,90vw)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
                        <p style={{ fontFamily: FONT_TITLE, fontSize: 22, letterSpacing: 2, color: "white", marginBottom: 10 }}>⚠️ Eliminar rutina</p>
                        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 24 }}>¿Seguro que querés eliminar <strong style={{ color: "white" }}>{confirmarEliminar.nombre}</strong>? Esta acción no se puede deshacer.</p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setConfirmarEliminar(null)} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "12px", borderRadius: 12, cursor: "pointer" }}>Cancelar</button>
                            <button onClick={handleEliminar} disabled={eliminando} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, background: eliminando ? "rgba(239,68,68,0.3)" : "#ef4444", border: "none", color: "white", padding: "12px", borderRadius: 12, cursor: eliminando ? "not-allowed" : "pointer" }}>{eliminando ? "Eliminando..." : "Sí, eliminar"}</button>
                        </div>
                    </div>
                </>
            )}

            {/* Toast */}
            {toastMsg && (
                <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: "rgba(0,180,216,0.15)", border: "1px solid rgba(0,180,216,0.4)", borderRadius: 14, padding: "14px 24px", fontFamily: FONT_BODY, fontSize: 14, color: "#00b4d8", fontWeight: 600, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", whiteSpace: "nowrap" }}>
                    {toastMsg}
                </div>
            )}
        </div>
    );
}