import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { db } from "../../firebase";
import AdminNavBar from "./AdminNavBar";

/* ─── Constantes ─────────────────────────────────────────── */
const ETAPAS = [
  { id: "movilidad", label: "Movilidad", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  { id: "activacion", label: "Activación", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { id: "general", label: "General", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];
const ETAPA_MAP = Object.fromEntries(ETAPAS.map(e => [e.id, e]));
const GRUPOS = [
  "Hombro", "Espalda", "Bíceps", "Tríceps",
  "Abdomen", "Antebrazos", "Pecho", "Cuádriceps", "Isquios", "Gemelos",
];

/* ─── Estilos base ───────────────────────────────────────── */
const FONT_TITLE = "'Bebas Neue', sans-serif";
const FONT_BODY = "'DM Sans', sans-serif";
const BTN_BASE = {
  fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500,
  padding: "6px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.5)",
};
const BTN_ACTIVE = {
  ...BTN_BASE,
  background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8",
};
const LABEL_S = {
  fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600,
  letterSpacing: 1.5, textTransform: "uppercase",
  color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8,
};
const INPUT_S = {
  fontFamily: FONT_BODY, fontSize: 14,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, padding: "11px 14px", color: "white", outline: "none", width: "100%",
  boxSizing: "border-box",
};
const CARD_S = {
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16, overflow: "hidden",
};

/* ─── Helper: ID temporal ────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

/* ─── Estructura vacía ───────────────────────────────────── */
const diaVacio = () => ({
  _id: uid(), nombre: "Día 1",
  etapas: {
    movilidad: { ejercicios: [] },
    activacion: { ejercicios: [] },
    general: { ejercicios: [] },
  },
});
const semanaVacia = (num) => ({
  _id: uid(), nombre: `Semana ${num}`, dias: [diaVacio()],
});
const rutinaVacia = () => ({
  nombre: "", descripcion: "",
  semanas: [semanaVacia(1)],
});

/* ═══════════════════════════════════════════════════════════
   SELECTOR DE EJERCICIOS (modal)
═══════════════════════════════════════════════════════════ */
function SelectorEjercicio({ ejerciciosDB, etapaId, onSeleccionar, onClose }) {
  const etapa = ETAPA_MAP[etapaId];
  const ejerciciosFiltrados_DB = ejerciciosDB.filter(e => e.etapas?.includes(etapaId));

  const [busqueda, setBusqueda] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");

  const lista = ejerciciosFiltrados_DB.filter(e => {
    const matchNombre = !busqueda || e.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const matchGrupo = !filtroGrupo || e.grupos?.includes(filtroGrupo);
    return matchNombre && matchGrupo;
  });

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 401, background: "#111", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, width: "min(560px,95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.8)", animation: "fadeUp 0.22s ease",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: FONT_TITLE, fontSize: 20, letterSpacing: 2, color: "white" }}>
                Agregar ejercicio
              </span>
              <span style={{
                fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                background: etapa.bg, color: etapa.color, border: `1px solid ${etapa.color}`,
              }}>{etapa.label}</span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer" }}>×</button>
          </div>
          {/* Búsqueda */}
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍  Buscar ejercicio..."
            style={{ ...INPUT_S, marginBottom: 10 }} />
          {/* Filtro grupo */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["", ...GRUPOS].map(g => (
              <button key={g} onClick={() => setFiltroGrupo(g)} style={{
                ...BTN_BASE,
                ...(filtroGrupo === g ? BTN_ACTIVE : {}),
                fontSize: 11, padding: "4px 10px",
              }}>{g || "Todos"}</button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px" }}>
          {lista.length === 0 ? (
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "32px 0" }}>
              {ejerciciosFiltrados_DB.length === 0
                ? `No hay ejercicios de ${etapa.label} cargados aún.`
                : "Sin resultados con los filtros aplicados."}
            </p>
          ) : lista.map(ej => (
            <div key={ej.id} onClick={() => onSeleccionar(ej)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderRadius: 12, marginBottom: 6, cursor: "pointer",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.06)"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
              {/* Thumbnail */}
              <div style={{ width: 48, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ej.videoLink
                  ? <img src={`https://img.youtube.com/vi/${ej.videoLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/default.jpg`}
                    alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontSize: 16, opacity: 0.3 }}>🎬</span>}
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

/* ═══════════════════════════════════════════════════════════
   FILA DE EJERCICIO dentro de una etapa
═══════════════════════════════════════════════════════════ */
function FilaEjercicio({ item, onChange, onEliminar }) {
  const [obsOpen, setObsOpen] = useState(false);
  const tieneObs = item.obs && item.obs.trim().length > 0;

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 12, marginBottom: 6, overflow: "hidden",
    }}>
      {/* ── Fila principal ── */}
      <div className="fila-ej-row" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", flexWrap: "wrap" }}>

        {/* Thumbnail */}
        <div style={{ width: 40, height: 30, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {item.videoLink
            ? <img src={`https://img.youtube.com/vi/${item.videoLink.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]}/default.jpg`}
              alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 14, opacity: 0.3 }}>🎬</span>}
        </div>

        {/* Nombre — ocupa todo el espacio disponible */}
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: "white", flex: 1, minWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
          {item.nombre}
        </p>

        {/* Campos numéricos — en mobile se van a la segunda fila gracias a flexWrap */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Series */}
          <input type="number" min={1} max={20}
            value={item.series || ""}
            onChange={e => onChange({ ...item, series: e.target.value })}
            placeholder="S"
            style={{ ...INPUT_S, width: 44, padding: "6px 6px", textAlign: "center", fontSize: 13 }} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>×</span>
          {/* Reps */}
          <input type="text"
            value={item.reps || ""}
            onChange={e => onChange({ ...item, reps: e.target.value })}
            placeholder="Reps"
            style={{ ...INPUT_S, width: 60, padding: "6px 6px", textAlign: "center", fontSize: 13 }} />
          {/* Descanso */}
          <input type="text"
            value={item.descanso || ""}
            onChange={e => onChange({ ...item, descanso: e.target.value })}
            placeholder="60s"
            style={{ ...INPUT_S, width: 48, padding: "6px 6px", textAlign: "center", fontSize: 12 }} />

          {/* Botón Obs */}
          <button onClick={() => setObsOpen(o => !o)} style={{
            fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600,
            padding: "6px 10px", borderRadius: 8, cursor: "pointer", flexShrink: 0,
            border: obsOpen || tieneObs
              ? "1px solid rgba(251,191,36,0.5)"
              : "1px solid rgba(255,255,255,0.12)",
            background: obsOpen || tieneObs
              ? "rgba(251,191,36,0.1)"
              : "rgba(255,255,255,0.04)",
            color: obsOpen || tieneObs ? "#fbbf24" : "rgba(255,255,255,0.45)",
            transition: "all 0.15s",
            position: "relative",
          }}>
            Obs
            {/* Punto indicador si hay obs guardada */}
            {tieneObs && !obsOpen && (
              <span style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: "#fbbf24" }} />
            )}
          </button>

          {/* Eliminar */}
          <button onClick={onEliminar} style={{
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
            color: "rgba(239,68,68,0.6)", borderRadius: 8, padding: "6px 8px", cursor: "pointer", flexShrink: 0, fontSize: 13,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "rgba(239,68,68,0.6)"; }}>
            ✕
          </button>
        </div>
      </div>

      {/* ── Panel de observación (se despliega abajo) ── */}
      {obsOpen && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <label style={{ ...LABEL_S, marginTop: 10, marginBottom: 6, color: "rgba(251,191,36,0.6)" }}>
            📝 Observación para este ejercicio
          </label>
          <textarea
            value={item.obs || ""}
            onChange={e => onChange({ ...item, obs: e.target.value })}
            placeholder="Ej: Mantené la espalda recta, bajá lento en la fase excéntrica..."
            rows={2}
            style={{
              ...INPUT_S, resize: "vertical", lineHeight: 1.6, fontSize: 13,
              border: "1px solid rgba(251,191,36,0.25)",
              background: "rgba(251,191,36,0.04)",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BLOQUE DE ETAPA dentro de un día
═══════════════════════════════════════════════════════════ */
function BloqueEtapa({ etapaId, data, ejerciciosDB, onUpdate }) {
  const etapa = ETAPA_MAP[etapaId];
  const [selector, setSelector] = useState(false);
  const [open, setOpen] = useState(true);

  const ejercicios = data.ejercicios || [];

  const agregarEjercicio = (ej) => {
    const nuevo = { _id: uid(), id: ej.id, nombre: ej.nombre, videoLink: ej.videoLink || null, series: "3", reps: "10-12", descanso: "60s" };
    onUpdate({ ...data, ejercicios: [...ejercicios, nuevo] });
    setSelector(false);
  };
  const actualizarEjercicio = (idx, updated) => {
    const arr = ejercicios.map((e, i) => i === idx ? updated : e);
    onUpdate({ ...data, ejercicios: arr });
  };
  const eliminarEjercicio = (idx) => {
    onUpdate({ ...data, ejercicios: ejercicios.filter((_, i) => i !== idx) });
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header etapa */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: etapa.bg, border: `1px solid ${etapa.color}22`,
        borderRadius: open ? "12px 12px 0 0" : 12, padding: "10px 16px",
        cursor: "pointer", transition: "border-radius 0.2s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: etapa.color }}>
            {etapa.label}
          </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 11, color: `${etapa.color}99` }}>
            {ejercicios.length} ejercicio{ejercicios.length !== 1 ? "s" : ""}
          </span>
        </div>
        <span style={{ color: etapa.color, fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>

      {open && (
        <div style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${etapa.color}22`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 14px" }}>
          {ejercicios.length === 0 && (
            <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "10px 0", fontStyle: "italic" }}>
              Sin ejercicios aún
            </p>
          )}
          {ejercicios.map((item, idx) => (
            <FilaEjercicio
              key={item._id}
              item={item}
              onChange={(updated) => actualizarEjercicio(idx, updated)}
              onEliminar={() => eliminarEjercicio(idx)}
            />
          ))}
          <button onClick={() => setSelector(true)} style={{
            ...BTN_BASE, marginTop: 4,
            background: etapa.bg, border: `1px solid ${etapa.color}44`,
            color: etapa.color, fontSize: 12, padding: "7px 14px", borderRadius: 10, width: "100%",
          }}>
            + Agregar ejercicio de {etapa.label}
          </button>
        </div>
      )}

      {selector && (
        <SelectorEjercicio
          ejerciciosDB={ejerciciosDB}
          etapaId={etapaId}
          onSeleccionar={agregarEjercicio}
          onClose={() => setSelector(false)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CARD DE DÍA
═══════════════════════════════════════════════════════════ */
function CardDia({ dia, semanaIdx, diaIdx, ejerciciosDB, onUpdate, onEliminar }) {
  const [open, setOpen] = useState(diaIdx === 0);
  const totalEjercicios = ETAPAS.reduce((acc, et) => acc + (dia.etapas[et.id]?.ejercicios?.length || 0), 0);

  const updateEtapa = (etapaId, data) => {
    onUpdate({ ...dia, etapas: { ...dia.etapas, [etapaId]: data } });
  };

  return (
    <div style={{ ...CARD_S, marginBottom: 12 }}>
      {/* Header día */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: open ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: FONT_TITLE, fontSize: 16, letterSpacing: 2, color: "white" }}>
            Día {diaIdx + 1}
          </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            {totalEjercicios} ejercicio{totalEjercicios !== 1 ? "s" : ""}
          </span>
          {/* Badges de etapas con ejercicios */}
          <div style={{ display: "flex", gap: 4 }}>
            {ETAPAS.map(et => {
              const count = dia.etapas[et.id]?.ejercicios?.length || 0;
              if (!count) return null;
              return (
                <span key={et.id} style={{
                  fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                  background: et.bg, color: et.color, border: `1px solid ${et.color}44`,
                }}>{count}</span>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
          <button onClick={onEliminar} style={{
            background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
            color: "rgba(239,68,68,0.5)", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "rgba(239,68,68,0.5)"; }}>
            ✕ Día
          </button>
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", cursor: "pointer" }}
            onClick={() => setOpen(o => !o)}>▼</span>
        </div>
      </div>

      {/* Cuerpo: etapas */}
      {open && (
        <div style={{ padding: "16px 18px" }}>
          {ETAPAS.map(et => (
            <BloqueEtapa
              key={et.id}
              etapaId={et.id}
              data={dia.etapas[et.id] || { ejercicios: [] }}
              ejerciciosDB={ejerciciosDB}
              onUpdate={(data) => updateEtapa(et.id, data)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CARD DE SEMANA
═══════════════════════════════════════════════════════════ */
function CardSemana({ semana, semanaIdx, ejerciciosDB, onUpdate, onEliminar }) {
  const [open, setOpen] = useState(semanaIdx === 0);
  const totalEj = semana.dias.reduce((acc, d) =>
    acc + ETAPAS.reduce((a, et) => a + (d.etapas[et.id]?.ejercicios?.length || 0), 0), 0);

  const addDia = () => {
    const newDia = diaVacio();
    newDia.nombre = `Día ${semana.dias.length + 1}`;
    onUpdate({ ...semana, dias: [...semana.dias, newDia] });
  };
  const updateDia = (idx, dia) => {
    onUpdate({ ...semana, dias: semana.dias.map((d, i) => i === idx ? dia : d) });
  };
  const deleteDia = (idx) => {
    if (semana.dias.length <= 1) return alert("La semana debe tener al menos 1 día.");
    onUpdate({ ...semana, dias: semana.dias.filter((_, i) => i !== idx) });
  };

  return (
    <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, marginBottom: 16, overflow: "hidden" }}>
      {/* Header semana */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(0,180,216,0.04)", borderBottom: open ? "1px solid rgba(255,255,255,0.07)" : "none", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: FONT_TITLE, fontSize: 20, letterSpacing: 3, color: "#00b4d8" }}>
            Semana {semanaIdx + 1}
          </span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            {semana.dias.length} día{semana.dias.length !== 1 ? "s" : ""} · {totalEj} ejercicio{totalEj !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
          <button onClick={onEliminar} style={{
            ...BTN_BASE, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
            color: "rgba(239,68,68,0.5)", fontSize: 12, padding: "6px 12px",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(239,68,68,0.5)"; }}>
            ✕ Semana
          </button>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "16px 20px" }}>
          {semana.dias.map((dia, diaIdx) => (
            <CardDia
              key={dia._id}
              dia={dia}
              semanaIdx={semanaIdx}
              diaIdx={diaIdx}
              ejerciciosDB={ejerciciosDB}
              onUpdate={(d) => updateDia(diaIdx, d)}
              onEliminar={() => deleteDia(diaIdx)}
            />
          ))}
          <button onClick={addDia} style={{
            ...BTN_BASE,
            background: "rgba(0,180,216,0.06)", border: "1px solid rgba(0,180,216,0.2)",
            color: "#00b4d8", width: "100%", borderRadius: 12, padding: "10px", fontSize: 13,
          }}>
            + Agregar día a Semana {semanaIdx + 1}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL BUILDER DE RUTINA (crear / editar)
═══════════════════════════════════════════════════════════ */
function ModalBuilder({ rutinaInicial, ejerciciosDB, onClose, onSave }) {
  const esEdicion = !!rutinaInicial?.id;
  const [rutina, setRutina] = useState(() =>
    rutinaInicial
      ? { nombre: rutinaInicial.nombre, descripcion: rutinaInicial.descripcion || "", semanas: rutinaInicial.semanas }
      : rutinaVacia()
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("builder"); // "builder" | "info"

  const addSemana = () => {
    setRutina(r => ({ ...r, semanas: [...r.semanas, semanaVacia(r.semanas.length + 1)] }));
  };
  const updateSemana = (idx, s) => {
    setRutina(r => ({ ...r, semanas: r.semanas.map((x, i) => i === idx ? s : x) }));
  };
  const deleteSemana = (idx) => {
    if (rutina.semanas.length <= 1) return alert("La rutina debe tener al menos 1 semana.");
    setRutina(r => ({ ...r, semanas: r.semanas.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    if (!rutina.nombre.trim()) { setError("El nombre es obligatorio."); setTab("info"); return; }
    setGuardando(true); setError("");
    try { await onSave(rutina); onClose(); }
    catch (e) { setError("Error al guardar: " + e.message); }
    finally { setGuardando(false); }
  };

  // Stats resumen
  const totalSemanas = rutina.semanas.length;
  const totalDias = rutina.semanas.reduce((a, s) => a + s.dias.length, 0);
  const totalEj = rutina.semanas.reduce((a, s) =>
    a + s.dias.reduce((b, d) => b + ETAPAS.reduce((c, et) => c + (d.etapas[et.id]?.ejercicios?.length || 0), 0), 0), 0);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 301, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 22, width: "min(800px,97vw)", maxHeight: "94vh", display: "flex", flexDirection: "column",
        boxShadow: "0 40px 100px rgba(0,0,0,0.9)", animation: "fadeUp 0.22s ease",
      }} className="rutina-modal-outer">
        <style>{`
          @keyframes fadeUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}
          @media(max-width:600px){
            .rutina-modal-outer{
              top:0!important;left:0!important;transform:none!important;
              width:100vw!important;height:100svh!important;max-height:100svh!important;
              border-radius:0!important;animation:none!important;
            }
            .fila-ej-row>p{min-width:calc(100% - 48px)!important;}
            .fila-ej-row>div{flex-wrap:wrap!important;}
          }
        `}</style>

        {/* Header */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <p style={{ fontFamily: FONT_BODY, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", margin: "0 0 4px" }}>
                {esEdicion ? "Editando rutina" : "Nueva rutina"}
              </p>
              <h2 style={{ fontFamily: FONT_TITLE, fontSize: 26, letterSpacing: 2, color: "white", margin: 0 }}>
                {rutina.nombre || "Sin nombre"}
              </h2>
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                {[
                  { val: totalSemanas, label: "semanas" },
                  { val: totalDias, label: "días" },
                  { val: totalEj, label: "ejercicios" },
                ].map(s => (
                  <span key={s.label} style={{ fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    <span style={{ color: "#00b4d8", fontWeight: 600 }}>{s.val}</span> {s.label}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 26, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", gap: 0 }}>
            {[["info", "📝 Info"], ["builder", "🏗️ Builder"]].map(([v, l]) => (
              <button key={v} onClick={() => setTab(v)} style={{
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, background: "none", border: "none",
                color: tab === v ? "#00b4d8" : "rgba(255,255,255,0.4)",
                padding: "8px 18px", cursor: "pointer", position: "relative",
              }}>
                {l}
                {tab === v && <span style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "#00b4d8" }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Body scrollable */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>

          {/* TAB INFO */}
          {tab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={LABEL_S}>Nombre de la rutina *</label>
                <input value={rutina.nombre} onChange={e => setRutina(r => ({ ...r, nombre: e.target.value }))}
                  placeholder="Ej: Rutina de fuerza 4 semanas"
                  style={INPUT_S} />
              </div>
              <div>
                <label style={LABEL_S}>Descripción <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "none", letterSpacing: 0 }}>— opcional</span></label>
                <textarea value={rutina.descripcion} onChange={e => setRutina(r => ({ ...r, descripcion: e.target.value }))}
                  placeholder="Descripción breve de la rutina, objetivos, nivel requerido..."
                  rows={3}
                  style={{ ...INPUT_S, resize: "vertical", lineHeight: 1.6 }} />
              </div>
            </div>
          )}

          {/* TAB BUILDER */}
          {tab === "builder" && (
            <>
              {rutina.semanas.map((semana, semanaIdx) => (
                <CardSemana
                  key={semana._id}
                  semana={semana}
                  semanaIdx={semanaIdx}
                  ejerciciosDB={ejerciciosDB}
                  onUpdate={(s) => updateSemana(semanaIdx, s)}
                  onEliminar={() => deleteSemana(semanaIdx)}
                />
              ))}
              <button onClick={addSemana} style={{
                ...BTN_BASE,
                width: "100%", borderRadius: 14, padding: "14px", fontSize: 14,
                background: "rgba(0,180,216,0.05)", border: "1px dashed rgba(0,180,216,0.3)",
                color: "#00b4d8", letterSpacing: 1,
              }}>
                + Agregar Semana {rutina.semanas.length + 1}
              </button>
            </>
          )}

          {error && (
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px", marginTop: 16 }}>
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{
            flex: 1, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.5)", padding: "13px", borderRadius: 12, cursor: "pointer",
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={guardando} style={{
            flex: 2, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 700,
            background: guardando ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)",
            border: "none", color: "white", padding: "13px", borderRadius: 12,
            cursor: guardando ? "not-allowed" : "pointer",
          }}>
            {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear rutina"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CARD RUTINA (listado)
═══════════════════════════════════════════════════════════ */
function RutinaCard({ rutina, onEditar, onEliminar, onClonar }) {
  const totalDias = rutina.semanas?.reduce((a, s) => a + (s.dias?.length || 0), 0) || 0;
  const totalEj = rutina.semanas?.reduce((a, s) =>
    a + (s.dias?.reduce((b, d) =>
      b + ETAPAS.reduce((c, et) => c + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0), 0) || 0), 0) || 0;

  return (
    <div style={{
      ...CARD_S,
      transition: "border-color 0.2s,transform 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,180,216,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}>

      <div style={{ padding: "18px 20px" }}>
        {/* Título */}
        <p style={{ fontFamily: FONT_TITLE, fontSize: 20, letterSpacing: 2, color: "white", margin: "0 0 6px", lineHeight: 1.2 }}>
          {rutina.nombre}
        </p>
        {rutina.descripcion && (
          <p style={{
            fontFamily: FONT_BODY, fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 12px", lineHeight: 1.5,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
          }}>
            {rutina.descripcion}
          </p>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          {[
            { val: rutina.semanas?.length || 0, label: "semanas", color: "#00b4d8" },
            { val: totalDias, label: "días", color: "rgba(255,255,255,0.6)" },
            { val: totalEj, label: "ejercicios", color: "rgba(255,255,255,0.6)" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "8px 14px", textAlign: "center" }}>
              <p style={{ fontFamily: FONT_TITLE, fontSize: 22, color: s.color, lineHeight: 1, margin: 0 }}>{s.val}</p>
              <p style={{ fontFamily: FONT_BODY, fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase", margin: "2px 0 0" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Etapas presentes */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {ETAPAS.map(et => {
            const count = rutina.semanas?.reduce((a, s) =>
              a + s.dias?.reduce((b, d) => b + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0), 0) || 0;
            return (
              <span key={et.id} style={{
                fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                background: count > 0 ? et.bg : "rgba(255,255,255,0.03)",
                color: count > 0 ? et.color : "rgba(255,255,255,0.2)",
                border: `1px solid ${count > 0 ? et.color + "44" : "rgba(255,255,255,0.06)"}`,
              }}>
                {et.label} {count > 0 ? `(${count})` : "—"}
              </span>
            );
          })}
        </div>

        {/* Acciones */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onEditar(rutina)} style={{
            flex: 1, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 500,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px", cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.08)"; e.currentTarget.style.color = "#00b4d8"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.25)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
            ✏️ Editar
          </button>
          <button onClick={() => onClonar(rutina)} style={{
            fontFamily: FONT_BODY, fontSize: 12,
            background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.2)",
            color: "rgba(139,92,246,0.8)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.14)"; e.currentTarget.style.color = "#a78bfa"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(139,92,246,0.06)"; e.currentTarget.style.color = "rgba(139,92,246,0.8)"; }}>
            📋 Clonar
          </button>
          <button onClick={() => onEliminar(rutina)} style={{
            fontFamily: FONT_BODY, fontSize: 12,
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

/* ═══════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function RutinasAdmin() {
  const [rutinas, setRutinas] = useState([]);
  const [ejerciciosDB, setEjerciciosDB] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null); // null | "nuevo" | rutinaObj
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [notificaciones] = useState([]);

  /* ── Carga inicial ── */
  useEffect(() => {
    Promise.all([cargarRutinas(), cargarEjercicios()]);
  }, []);

  const cargarRutinas = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(query(collection(db, "rutinas"), orderBy("creadoEn", "desc")));
      setRutinas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const cargarEjercicios = async () => {
    try {
      const snap = await getDocs(collection(db, "ejercicios"));
      setEjerciciosDB(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  /* ── Guardar (crear / editar) ── */
  const handleSave = async (data) => {
    // Limpiar IDs temporales antes de guardar
    const semanas = data.semanas.map(({ _id, ...s }) => ({
      ...s,
      dias: s.dias.map(({ _id, ...d }) => ({
        ...d,
        etapas: Object.fromEntries(
          Object.entries(d.etapas).map(([etId, etData]) => [
            etId,
            {
              ...etData,
              ejercicios: (etData.ejercicios || []).map(({ _id, ...ej }) => ej),
            },
          ])
        ),
      })),
    }));

    const payload = { nombre: data.nombre, descripcion: data.descripcion || "", semanas };

    if (modal === "nuevo") {
      await addDoc(collection(db, "rutinas"), { ...payload, tipo: "generica", creadoEn: serverTimestamp() });
    } else {
      await updateDoc(doc(db, "rutinas", modal.id), payload);
    }
    await cargarRutinas();
  };

  /* ── Clonar ── */
  const handleClonar = (rutina) => {
    // Agrega IDs temporales para el builder
    const addIds = (semanas) => semanas.map(s => ({
      ...s, _id: uid(),
      dias: s.dias.map(d => ({
        ...d, _id: uid(),
        etapas: Object.fromEntries(
          Object.entries(d.etapas || {}).map(([etId, etData]) => [
            etId,
            { ...etData, ejercicios: (etData.ejercicios || []).map(ej => ({ ...ej, _id: uid() })) }
          ])
        ),
      })),
    }));
    setModal({
      nombre: `${rutina.nombre} (copia)`,
      descripcion: rutina.descripcion || "",
      semanas: addIds(rutina.semanas || [semanaVacia(1)]),
    });
  };

  /* ── Editar ── */
  const handleEditar = (rutina) => {
    const addIds = (semanas) => semanas.map(s => ({
      ...s, _id: uid(),
      dias: s.dias.map(d => ({
        ...d, _id: uid(),
        etapas: Object.fromEntries(
          Object.entries(d.etapas || {}).map(([etId, etData]) => [
            etId,
            { ...etData, ejercicios: (etData.ejercicios || []).map(ej => ({ ...ej, _id: uid() })) }
          ])
        ),
      })),
    }));
    setModal({ ...rutina, semanas: addIds(rutina.semanas || []) });
  };

  /* ── Eliminar ── */
  const handleEliminar = async () => {
    if (!confirmarEliminar) return;
    setEliminando(true);
    try { await deleteDoc(doc(db, "rutinas", confirmarEliminar.id)); setConfirmarEliminar(null); await cargarRutinas(); }
    catch (e) { console.error(e); }
    finally { setEliminando(false); }
  };

  const rutinasFiltradas = rutinas.filter(r =>
    !filtroBusqueda || r.nombre?.toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  /* ── Render ── */
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

      <AdminNavBar notificaciones={notificaciones} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px", width: "100%" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: FONT_TITLE, fontSize: 36, letterSpacing: 3, color: "white", margin: 0 }}>📋 Rutinas</h1>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
              {rutinas.length} rutina{rutinas.length !== 1 ? "s" : ""} genérica{rutinas.length !== 1 ? "s" : ""} disponible{rutinas.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={() => setModal("nuevo")} style={{
            fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
            background: "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none",
            color: "white", padding: "12px 22px", borderRadius: 12, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: "0 4px 20px rgba(0,180,216,0.25)", whiteSpace: "nowrap",
          }}>
            ＋ Nueva rutina
          </button>
        </div>

        {/* Búsqueda */}
        <div style={{ marginBottom: 24 }}>
          <input value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)}
            placeholder="🔍  Buscar rutina por nombre..."
            style={{ ...INPUT_S, fontSize: 14 }} />
        </div>

        {/* Grid */}
        {cargando ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Cargando rutinas...</p>
          </div>
        ) : rutinasFiltradas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <p style={{ fontFamily: FONT_TITLE, fontSize: 32, letterSpacing: 2, color: "rgba(255,255,255,0.08)", marginBottom: 8 }}>
              {rutinas.length === 0 ? "Aún no hay rutinas" : "Sin resultados"}
            </p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: "rgba(255,255,255,0.25)" }}>
              {rutinas.length === 0 ? 'Hacé clic en "Nueva rutina" para crear la primera.' : "Probá cambiando la búsqueda."}
            </p>
          </div>
        ) : (
          <div className="rut-grid">
            {rutinasFiltradas.map(r => (
              <RutinaCard
                key={r.id}
                rutina={r}
                onEditar={handleEditar}
                onEliminar={setConfirmarEliminar}
                onClonar={handleClonar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal builder */}
      {modal && (
        <ModalBuilder
          rutinaInicial={modal === "nuevo" ? null : modal}
          ejerciciosDB={ejerciciosDB}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {/* Confirmar eliminar */}
      {confirmarEliminar && (
        <>
          <div onClick={() => setConfirmarEliminar(null)} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 301, background: "#111", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "28px", width: "min(400px,90vw)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
            <p style={{ fontFamily: FONT_TITLE, fontSize: 22, letterSpacing: 2, color: "white", marginBottom: 10 }}>⚠️ Eliminar rutina</p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 24 }}>
              ¿Seguro que querés eliminar <strong style={{ color: "white" }}>{confirmarEliminar.nombre}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmarEliminar(null)} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "12px", borderRadius: 12, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleEliminar} disabled={eliminando} style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, background: eliminando ? "rgba(239,68,68,0.3)" : "#ef4444", border: "none", color: "white", padding: "12px", borderRadius: 12, cursor: eliminando ? "not-allowed" : "pointer" }}>
                {eliminando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}