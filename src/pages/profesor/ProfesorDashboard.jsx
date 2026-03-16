import { useState, useEffect } from "react";
import {
  collection, getDocs, query, where, updateDoc, doc,
  deleteDoc, addDoc, orderBy
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { crearNotificacion } from "../../utils/notificaciones";
import ProfesorNavBar from "./ProfesorNavBar";
import RutinasProfesor from "./RutinasProfesor";
import BtnEnviarRutina from "../../components/BtnEnviarRutina";
import HistorialRutinas from "../../components/HistorialRutinas";
import EditorRutinaAlumno from "../../components/EditorRutinaAlumno";

/* ════════════════════════════════════════════════════════════
   MÓDULO EJERCICIOS (inline, igual al de admin)
════════════════════════════════════════════════════════════ */
const ETAPAS_EJ = [
  { id: "movilidad", label: "Movilidad", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  { id: "activacion", label: "Activación", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { id: "general", label: "General", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];
const GRUPOS_EJ = ["Hombro", "Espalda", "Bíceps", "Tríceps", "Abdomen", "Antebrazos", "Pecho", "Cuádriceps", "Isquios", "Gemelos"];
const SEDES_EJ = [
  { id: "general", label: "General" },
  { id: "Edison", label: "Edison" },
  { id: "Moreno", label: "Moreno" },
  { id: "GSM", label: "Gral. San Martín" },
];
const FT = "'Bebas Neue', sans-serif";
const FB = "'DM Sans', sans-serif";
const INP = {
  fontFamily: FB, fontSize: 14,
  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10, padding: "11px 14px", color: "white", outline: "none",
  width: "100%", boxSizing: "border-box",
};
const BTN = {
  fontFamily: FB, fontSize: 12, fontWeight: 500, padding: "6px 14px",
  borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.5)",
};
const BTN_ON = { ...BTN, background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8" };

function getYtId(url) { return url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1]; }

function EjerciciosProfesor({ miDoc, notificaciones, onMarcarLeida, onMarcarTodas, onClickNotif, vistaActual, sedeActiva, setSedeActiva }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null); // null | "nuevo" | ejercicioObj
  const [confirmar, setConfirmar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(null);
  // form
  const [form, setForm] = useState({
    nombre: "", videoLink: "", etapas: [], grupos: [], sucursales: [],
  });
  const [guardando, setGuardando] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => { cargar(); }, []);
  const cargar = async () => {
    setCargando(true);
    try {
      const snap = await getDocs(query(collection(db, "ejercicios"), orderBy("creadoEn", "desc")));
      setEjercicios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const abrirNuevo = () => { setForm({ nombre: "", videoLink: "", etapas: [], grupos: [], sucursales: [] }); setFormError(""); setModal("nuevo"); };
  const abrirEditar = (ej) => { setForm({ nombre: ej.nombre || "", videoLink: ej.videoLink || "", etapas: ej.etapas || [], grupos: ej.grupos || [], sucursales: ej.sucursales || [] }); setFormError(""); setModal(ej); };

  const toggle = (field, val) => setForm(f => ({
    ...f, [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val]
  }));

  const handleSave = async () => {
    if (!form.nombre.trim()) { setFormError("El nombre es obligatorio."); return; }
    if (!form.etapas.length) { setFormError("Seleccioná al menos una etapa."); return; }
    setGuardando(true); setFormError("");
    try {
      const payload = { nombre: form.nombre.trim(), videoLink: form.videoLink.trim(), etapas: form.etapas, grupos: form.grupos, sucursales: form.sucursales };
      if (modal === "nuevo") {
        const { serverTimestamp } = await import("firebase/firestore");
        await addDoc(collection(db, "ejercicios"), { ...payload, creadoEn: serverTimestamp() });
      } else {
        await updateDoc(doc(db, "ejercicios", modal.id), payload);
      }
      setModal(null); cargar();
    } catch (e) { setFormError("Error: " + e.message); }
    finally { setGuardando(false); }
  };

  const handleEliminar = async () => {
    if (!confirmar) return;
    setEliminando(true);
    try { await deleteDoc(doc(db, "ejercicios", confirmar.id)); setConfirmar(null); cargar(); }
    catch (e) { console.error(e); } finally { setEliminando(false); }
  };

  const lista = ejercicios.filter(ej => {
    const mN = !busqueda || ej.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const mE = !filtroEtapa || ej.etapas?.includes(filtroEtapa);
    const mG = !filtroGrupo || ej.grupos?.includes(filtroGrupo);
    const mV = true; // sin filtro video para simplificar
    return mN && mE && mG && mV;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingTop: 62, boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{box-sizing:border-box}
        body{display:block!important;place-items:unset!important}
        .ej-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}
        @media(max-width:600px){.ej-grid{grid-template-columns:1fr}}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.2)}
        button:focus{outline:none}
      `}</style>
      <ProfesorNavBar usuario={miDoc} notificaciones={notificaciones} onMarcarLeida={onMarcarLeida} onMarcarTodas={onMarcarTodas} onClickNotif={onClickNotif} vistaActual={vistaActual} sedeActiva={sedeActiva} setSedeActiva={setSedeActiva} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
          <div>
            <p style={{ fontFamily: FB, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>BIBLIOTECA</p>
            <h1 style={{ fontFamily: FT, fontSize: 36, letterSpacing: 3, color: "white", margin: 0 }}>💪 Ejercicios</h1>
            <p style={{ fontFamily: FB, fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{ejercicios.length} ejercicio{ejercicios.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={abrirNuevo} style={{ fontFamily: FB, fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "12px 22px", borderRadius: 12, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,180,216,0.25)", whiteSpace: "nowrap" }}>
            ＋ Nuevo ejercicio
          </button>
        </div>

        {/* Búsqueda + filtros */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍  Buscar ejercicio..." style={{ ...INP, flex: 1, fontSize: 14 }} />
            <button onClick={() => setFiltrosOpen(o => !o)} style={{ ...BTN, ...(filtrosOpen ? BTN_ON : {}), padding: "10px 16px", borderRadius: 10, fontSize: 13, flexShrink: 0 }}>
              {filtrosOpen ? "▲ Ocultar" : "▼ Filtros"}
            </button>
          </div>
          {filtrosOpen && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontFamily: FB, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Etapa</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ id: "", label: "Todas" }, ...ETAPAS_EJ].map(et => (
                    <button key={et.id} onClick={() => setFiltroEtapa(et.id)} style={{ ...BTN, ...(filtroEtapa === et.id ? BTN_ON : {}), fontSize: 12 }}>{et.label || "Todas"}</button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontFamily: FB, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Grupo muscular</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["", ...GRUPOS_EJ].map(g => (
                    <button key={g} onClick={() => setFiltroGrupo(g)} style={{ ...BTN, ...(filtroGrupo === g ? BTN_ON : {}), fontSize: 11, padding: "4px 10px" }}>{g || "Todos"}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grid ejercicios */}
        {cargando ? (
          <p style={{ fontFamily: FB, fontSize: 14, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "60px 0" }}>Cargando...</p>
        ) : lista.length === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 0" }}>
            <p style={{ fontFamily: FT, fontSize: 32, letterSpacing: 2, color: "rgba(255,255,255,0.08)" }}>{ejercicios.length === 0 ? "Sin ejercicios aún" : "Sin resultados"}</p>
          </div>
        ) : (
          <div className="ej-grid">
            {lista.map(ej => {
              const ytId = getYtId(ej.videoLink);
              return (
                <div key={ej.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s,transform 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,180,216,0.25)"; e.currentTarget.style.transform = "translateY(-2px)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)" }}>
                  {/* Thumbnail */}
                  <div style={{ position: "relative", height: 140, background: "#111", cursor: ytId ? "pointer" : "default" }} onClick={() => ytId && setPlayerOpen(playerOpen === ej.id ? null : ej.id)}>
                    {ytId ? (
                      playerOpen === ej.id
                        ? <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} frameBorder="0" allow="autoplay;encrypted-media" allowFullScreen style={{ display: "block" }} />
                        : <>
                          <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(0,180,216,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>▶</div>
                          </div>
                        </>
                    ) : (
                      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, opacity: 0.2 }}>🎬</div>
                    )}
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <p style={{ fontFamily: FT, fontSize: 18, letterSpacing: 2, color: "white", margin: "0 0 8px", lineHeight: 1.2 }}>{ej.nombre}</p>
                    {/* Etapas */}
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                      {(ej.etapas || []).map(etId => { const et = ETAPAS_EJ.find(e => e.id === etId); return et ? <span key={etId} style={{ fontFamily: FB, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: et.bg, color: et.color, border: `1px solid ${et.color}44` }}>{et.label}</span> : null; })}
                    </div>
                    {/* Grupos */}
                    {(ej.grupos || []).length > 0 && <p style={{ fontFamily: FB, fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>{ej.grupos.join(", ")}</p>}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => abrirEditar(ej)} style={{ flex: 1, fontFamily: FB, fontSize: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "8px", cursor: "pointer", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,180,216,0.08)"; e.currentTarget.style.color = "#00b4d8"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.25)" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)" }}>✏️ Editar</button>
                      <button onClick={() => setConfirmar(ej)} style={{ fontFamily: FB, fontSize: 12, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.6)", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171" }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.color = "rgba(239,68,68,0.6)" }}>🗑️</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nuevo/editar */}
      {modal && (
        <>
          <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 401, background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "min(580px,95vw)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: FT, fontSize: 24, letterSpacing: 2, color: "white", margin: 0 }}>{modal === "nuevo" ? "Nuevo ejercicio" : "Editar ejercicio"}</h3>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
              <div><label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Press de banca" style={INP} /></div>
              <div><label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>Link de YouTube</label>
                <input value={form.videoLink} onChange={e => setForm(f => ({ ...f, videoLink: e.target.value }))} placeholder="https://youtube.com/watch?v=..." style={INP} />
                {getYtId(form.videoLink) && <img src={`https://img.youtube.com/vi/${getYtId(form.videoLink)}/hqdefault.jpg`} alt="" style={{ width: 120, borderRadius: 8, marginTop: 8, border: "1px solid rgba(255,255,255,0.1)" }} />}
              </div>
              <div>
                <label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>Etapas *</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {ETAPAS_EJ.map(et => (
                    <button key={et.id} onClick={() => toggle("etapas", et.id)} style={{ ...BTN, ...(form.etapas.includes(et.id) ? { background: et.bg, border: `1px solid ${et.color}`, color: et.color } : {}), fontSize: 13, padding: "8px 16px" }}>{et.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>Grupos musculares</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {GRUPOS_EJ.map(g => (
                    <button key={g} onClick={() => toggle("grupos", g)} style={{ ...BTN, ...(form.grupos.includes(g) ? BTN_ON : {}), fontSize: 11, padding: "5px 12px" }}>{g}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: FB, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 8 }}>Disponible en</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SEDES_EJ.map(s => (
                    <button key={s.id} onClick={() => toggle("sucursales", s.id)} style={{ ...BTN, ...(form.sucursales.includes(s.id) ? BTN_ON : {}), fontSize: 12 }}>{s.label}</button>
                  ))}
                </div>
              </div>
              {formError && <p style={{ fontFamily: FB, fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px" }}>{formError}</p>}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, flexShrink: 0 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, fontFamily: FB, fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "13px", borderRadius: 12, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSave} disabled={guardando} style={{ flex: 2, fontFamily: FB, fontSize: 14, fontWeight: 700, background: guardando ? "rgba(0,180,216,0.3)" : "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: guardando ? "not-allowed" : "pointer" }}>
                {guardando ? "Guardando..." : modal === "nuevo" ? "Crear ejercicio" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirmar eliminar */}
      {confirmar && (
        <>
          <div onClick={() => setConfirmar(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 401, background: "#111", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "28px", width: "min(400px,90vw)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
            <p style={{ fontFamily: FT, fontSize: 22, letterSpacing: 2, color: "white", marginBottom: 10 }}>⚠️ Eliminar ejercicio</p>
            <p style={{ fontFamily: FB, fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginBottom: 24 }}>¿Seguro que querés eliminar <strong style={{ color: "white" }}>{confirmar.nombre}</strong>?</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmar(null)} style={{ flex: 1, fontFamily: FB, fontSize: 14, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)", padding: "12px", borderRadius: 12, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleEliminar} disabled={eliminando} style={{ flex: 1, fontFamily: FB, fontSize: 14, fontWeight: 600, background: eliminando ? "rgba(239,68,68,0.3)" : "#ef4444", border: "none", color: "white", padding: "12px", borderRadius: 12, cursor: eliminando ? "not-allowed" : "pointer" }}>{eliminando ? "Eliminando..." : "Sí, eliminar"}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PROFESOR DASHBOARD — PRINCIPAL
════════════════════════════════════════════════════════════ */
export default function ProfesorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const [vista, setVista] = useState(location.state?.vista || "panel");
  const [miDoc, setMiDoc] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [chat, setChat] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [sedeActiva, setSedeActiva] = useState("todas");
  const [alumnoActivoChat, setAlumnoActivoChat] = useState(null);
  const [mensajeChat, setMensajeChat] = useState("");
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

  // Modal Edición Alumno
  const [modalEdit, setModalEdit] = useState(false);
  const [alumnoEdit, setAlumnoEdit] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [guardandoEdit, setGuardandoEdit] = useState(false);

  // Filtros vista alumnos
  const [filtroBusq, setFiltroBusq] = useState("");
  const [filtroEdad, setFiltroEdad] = useState("");
  const [filtroRutina, setFiltroRutina] = useState("");

  // Para asignar rutina desde el listado de alumnos
  const [alumnoParaRutina, setAlumnoParaRutina] = useState(null);
  // Para ver historial de rutinas de un alumno
  const [alumnoHistorial, setAlumnoHistorial] = useState(null);
  // Para editar la rutina activa de un alumno específico
  const [alumnoEditorRutina, setAlumnoEditorRutina] = useState(null);

  useEffect(() => {
    if (location.state?.vista) setVista(location.state.vista);
  }, [location.state]);

  const sedes = miDoc?.sedes || [];

  useEffect(() => {
    const cargarMiDoc = async () => {
      const snap = await getDocs(query(collection(db, "usuarios"), where("uid", "==", usuario.uid)));
      if (!snap.empty) setMiDoc({ id: snap.docs[0].id, ...snap.docs[0].data() });
    };
    if (usuario) cargarMiDoc();
  }, [usuario]);

  useEffect(() => { if (miDoc?.id) cargarDatos(); }, [miDoc]);

  useEffect(() => {
    if (vista === "chat" && alumnoActivoChat) {
      const msgsNoLeidos = chat.filter(m => m.alumnoId === alumnoActivoChat.id && m.de === "alumno" && !m.leido);
      if (msgsNoLeidos.length > 0) {
        const t = setTimeout(() => {
          Promise.all(msgsNoLeidos.map(m => updateDoc(doc(db, "chat", m.id), { leido: true })))
            .then(() => cargarDatos());
        }, 800);
        return () => clearTimeout(t);
      }
      const notifsMsg = notificaciones.filter(n =>
        n.tipo === "nuevo_mensaje" &&
        (n.extraData?.alumnoId === alumnoActivoChat.id || n.extraData?.alumnoId === alumnoActivoChat.uid) &&
        !n.leida
      );
      if (notifsMsg.length > 0) {
        Promise.all(notifsMsg.map(n => updateDoc(doc(db, "notificaciones", n.id), { leida: true })))
          .then(() => cargarDatos());
      }
    }
    if (vista === "perfil") {
      const notifsCom = notificaciones.filter(n => n.tipo === "nuevo_comentario" && !n.leida);
      if (notifsCom.length > 0) {
        Promise.all(notifsCom.map(n => updateDoc(doc(db, "notificaciones", n.id), { leida: true })))
          .then(() => cargarDatos());
      }
      const comsNoLeidos = comentarios.filter(c => !c.leido);
      if (comsNoLeidos.length > 0) {
        Promise.all(comsNoLeidos.map(c => updateDoc(doc(db, "comentarios", c.id), { leido: true })))
          .then(() => cargarDatos());
      }
    }
  }, [vista, alumnoActivoChat]);

  const cargarDatos = async () => {
    if (!miDoc) return;
    // Solo alumnos de este profe
    const snap = await getDocs(query(collection(db, "usuarios"), where("profesorId", "==", miDoc.id)));
    setAlumnos(snap.docs.map(d => ({ id: d.id, ...d.data() })));

    const comSnap = await getDocs(query(collection(db, "comentarios"), where("profesorId", "==", miDoc.id)));
    setComentarios(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const chatSnap = await getDocs(query(collection(db, "chat"), where("profesorId", "==", miDoc.id)));
    setChat(chatSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const notifSnap = await getDocs(query(collection(db, "notificaciones"), where("usuarioId", "==", miDoc.id)));
    const notifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    notifs.sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha));
    setNotificaciones(notifs);
  };

  const marcarLeida = async (id) => { await updateDoc(doc(db, "notificaciones", id), { leida: true }); cargarDatos(); };
  const marcarTodasLeidas = async () => {
    const noLeidas = notificaciones.filter(n => !n.leida);
    await Promise.all(noLeidas.map(n => updateDoc(doc(db, "notificaciones", n.id), { leida: true })));
    cargarDatos();
  };
  const handleClickNotif = async (n) => {
    await updateDoc(doc(db, "notificaciones", n.id), { leida: true });
    if (n.tipo === "nuevo_mensaje" && n.extraData?.alumnoId) {
      const alumno = alumnos.find(a => a.id === n.extraData.alumnoId || a.uid === n.extraData.alumnoId);
      if (alumno) { setAlumnoActivoChat(alumno); setVista("chat"); }
    } else if (n.tipo === "nuevo_comentario") {
      setVista("perfil");
    }
    cargarDatos();
  };

  const parseFecha = (str) => {
    if (!str) return new Date(0);
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;
    try {
      const [dPart, tPart] = str.split(", ");
      const [day, month, year] = dPart.split("/").map(Number);
      const parts = tPart.split(" ");
      const [hh, mm] = parts[0].split(":").map(Number);
      let h = hh;
      if (parts[1] === "p." && h < 12) h += 12;
      if (parts[1] === "a." && h === 12) h = 0;
      return new Date(year, month - 1, day, h, mm);
    } catch (e) { return new Date(0); }
  };

  const calcularEdad = (nac) => {
    if (!nac) return "";
    return Math.floor((new Date() - new Date(nac)) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const handleEliminarRutina = async (alumno) => {
    if (!window.confirm(`¿Seguro que querés quitarle la rutina activa a ${alumno.nombre}?\n\nLa rutina quedará en el historial del alumno, solo se desvincula como rutina activa.`)) return;
    try {
      // Solo marcar al alumno como sin rutina activa — NO borrar de rutinas_asignadas
      await updateDoc(doc(db, "usuarios", alumno.id), { tieneRutina: false });
      cargarDatos();
    } catch (e) { alert("Error al quitar la rutina: " + e.message); }
  };

  const handleEdit = (alumno) => { setAlumnoEdit(alumno); setEditForm({ ...alumno }); setModalEdit(true); };
  const handleSaveEdit = async () => {
    setGuardandoEdit(true);
    try {
      const nuevosDatos = { ...editForm, edad: calcularEdad(editForm.nacimiento) };
      await updateDoc(doc(db, "usuarios", alumnoEdit.id), nuevosDatos);
      const adminSnap = await getDocs(query(collection(db, "usuarios"), where("rol", "==", "admin")));
      const adminId = !adminSnap.empty ? adminSnap.docs[0].id : null;
      if (adminId) await crearNotificacion({ usuarioId: adminId, mensaje: `El profesor ${miDoc?.nombre || "Profe"} editó al alumno ${nuevosDatos.nombre} ${nuevosDatos.apellido || ""}`, tipo: "edicion_alumno" });
      setModalEdit(false); cargarDatos();
    } catch (e) { alert("Error al guardar: " + e.message); }
    setGuardandoEdit(false);
  };

  const handleDelete = async (alumno) => {
    if (!window.confirm(`¿Seguro que querés eliminar a ${alumno.nombre}?`)) return;
    try {
      await deleteDoc(doc(db, "usuarios", alumno.id));
      const adminSnap = await getDocs(query(collection(db, "usuarios"), where("rol", "==", "admin")));
      const adminId = !adminSnap.empty ? adminSnap.docs[0].id : null;
      if (adminId) await crearNotificacion({ usuarioId: adminId, mensaje: `El profesor ${miDoc?.nombre || "Profe"} eliminó al alumno ${alumno.nombre} ${alumno.apellido || ""}`, tipo: "eliminacion_alumno" });
      cargarDatos();
    } catch (e) { alert("Error: " + e.message); }
  };

  const enviarMensajeProfe = async () => {
    if (!mensajeChat.trim() || !alumnoActivoChat) return;
    setEnviandoMensaje(true);
    try {
      await addDoc(collection(db, "chat"), { mensaje: mensajeChat, alumnoId: alumnoActivoChat.id, alumnoNombre: alumnoActivoChat.nombre, profesorId: miDoc.id, de: "profesor", fecha: new Date().toISOString() });
      await crearNotificacion({ usuarioId: alumnoActivoChat.id, mensaje: `${miDoc?.nombre || "Tu profesor"} te ha enviado un mensaje`, tipo: "nuevo_mensaje", extraData: { profesorId: miDoc.id } });
      setMensajeChat(""); cargarDatos();
    } catch (e) { console.error(e); }
    setEnviandoMensaje(false);
  };

  // ── Filtros por sede ──
  const alumnosFiltrados = sedeActiva === "todas" ? alumnos : alumnos.filter(a => a.sede === sedeActiva);

  const mensajesNoLeidos = chat.filter(m => m.de === "alumno" && !m.leido &&
    (sedeActiva === "todas" || alumnosFiltrados.some(a => a.id === m.alumnoId))
  ).length;

  const likes = alumnos.filter(a => a.reaccionProfesor === "like").length;
  const dislikes = alumnos.filter(a => a.reaccionProfesor === "dislike").length;
  const comsNoLeidas = comentarios.filter(c => !c.leido && (sedeActiva === "todas" || alumnosFiltrados.some(a => a.id === c.alumnoId))).length;

  // ── STAT CLAVE: alumnos con rutina asignada (tieneRutina: true) ──
  const alumnosConRutina = alumnosFiltrados.filter(a => a.tieneRutina).length;

  const alumnosVistaFiltrados = alumnosFiltrados.filter(a => {
    const nombre = `${a.nombre || ""} ${a.apellido || ""}`.toLowerCase();
    const matchBusq = !filtroBusq || nombre.includes(filtroBusq.toLowerCase());
    let matchEdad = true;
    if (filtroEdad) {
      const e = parseInt(a.edad) || 0;
      if (filtroEdad === "-18") matchEdad = e > 0 && e < 18;
      else if (filtroEdad === "18-30") matchEdad = e >= 18 && e <= 30;
      else if (filtroEdad === "31-50") matchEdad = e > 30 && e <= 50;
      else if (filtroEdad === "50+") matchEdad = e > 50;
    }
    let matchRutina = true;
    if (filtroRutina === "con") matchRutina = !!a.tieneRutina;
    else if (filtroRutina === "sin") matchRutina = !a.tieneRutina;
    return matchBusq && matchEdad && matchRutina;
  });

  const nombreProfe = miDoc?.nombre ? miDoc.nombre.toUpperCase() : "PROFE";

  const navProps = { usuario: miDoc, notificaciones, onMarcarLeida: marcarLeida, onMarcarTodas: marcarTodasLeidas, onClickNotif: handleClickNotif, vistaActual: vista, sedeActiva, setSedeActiva };

  // ── Vistas que tienen su propio componente con NavBar ──
  if (vista === "ejercicios") return <EjerciciosProfesor {...navProps} />;
  if (vista === "rutinas") return (
    <RutinasProfesor
      {...navProps}
      miDoc={miDoc}
      alumnos={alumnosFiltrados}
      // Si llegamos desde "Asignar Rutina" de un alumno específico, lo pre-seleccionamos
      alumnoPreseleccionado={alumnoParaRutina}
      onAsignadaCallback={() => { setAlumnoParaRutina(null); cargarDatos(); }}
    />
  );

  // ── Vistas inline (panel / alumnos / perfil / chat) ──
  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        .stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:48px}
        .action-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .action-card{background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px 24px;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;gap:12px}
        .action-card:hover{border-color:rgba(0,180,216,0.4);background:rgba(0,180,216,0.04);transform:translateY(-2px)}
        .footer{background:#000;border-top:1px solid rgba(255,255,255,0.06);padding:40px 60px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px}
        .footer-brand{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:#00b4d8;margin-bottom:4px}
        .footer-copy{font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(255,255,255,0.3)}
        .footer-socials{display:flex;gap:14px}
        .social-btn{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:none;color:rgba(255,255,255,0.5);font-size:15px;transition:border-color 0.2s,color 0.2s}
        .social-btn:hover{border-color:#00b4d8;color:#00b4d8}
        .alumnos-filtro-inp{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:11px 14px;color:white;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color 0.2s}
        .alumnos-filtro-inp:focus{border-color:rgba(0,180,216,0.4)}
        .alumnos-filtro-inp::placeholder{color:rgba(255,255,255,0.2)}
        select.alumnos-filtro-inp option{background:#1a1a1a;color:white}
        .alumnos-btn-action{background:none;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);border-radius:8px;padding:8px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all 0.2s}
        .alumnos-btn-action:hover{background:rgba(255,255,255,0.05);color:white;border-color:rgba(255,255,255,0.3)}
        .alumnos-btn-action.accent{border-color:rgba(0,180,216,0.3);color:#00b4d8}
        .alumnos-btn-action.accent:hover{background:rgba(0,180,216,0.1);border-color:#00b4d8}
        .alumnos-btn-action.danger{border-color:rgba(239,68,68,0.3);color:#ef4444}
        .alumnos-btn-action.danger:hover{background:rgba(239,68,68,0.1);border-color:#ef4444}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.2s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .modal-box{background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:20px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;overflow-x:hidden;position:relative;animation:slideUp 0.3s ease}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .modal-header{padding:24px 28px 16px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center}
        .modal-body{padding:28px}
        .modal-label{font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:8px;display:block}
        .modal-input{width:100%;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 14px;color:white;font-family:'DM Sans',sans-serif;font-size:14px;outline:none;transition:border-color 0.2s}
        .modal-input:focus{border-color:#00b4d8}
        .modal-btn-save{background:#00b4d8;color:#03045e;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;padding:14px;border-radius:10px;border:none;cursor:pointer;transition:all 0.2s;width:100%;margin-top:10px}
        .modal-btn-save:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,180,216,0.3)}
        .modal-btn-save:disabled{opacity:0.6;cursor:not-allowed}
        .modal-btn-cancel{background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);font-family:'DM Sans',sans-serif;font-size:14px;padding:14px;border-radius:10px;cursor:pointer;transition:all 0.2s;width:100%;margin-top:10px}
        .modal-btn-cancel:hover{background:rgba(255,255,255,0.05);color:white}
        .modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        select.modal-input option{background:#1a1a1a;color:white}
        .chat-container{display:flex;gap:20px;height:calc(100vh - 180px);min-height:450px}
        .chat-sidebar{width:300px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;display:flex;flex-direction:column;flex-shrink:0;overflow:hidden}
        .chat-main{flex:1;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
        @media(max-width:850px){
          .stat-grid{grid-template-columns:1fr 1fr!important}
          .action-grid{grid-template-columns:1fr!important}
          .footer{padding:32px 24px}
          .alumnos-filtros{flex-direction:column}
          .alumnos-row{flex-direction:column;align-items:stretch!important;gap:16px}
          .alumnos-actions{flex-wrap:wrap;justify-content:flex-start}
          .modal-grid{grid-template-columns:1fr}
          .chat-container{height:calc(100vh - 140px);gap:0}
          .chat-sidebar{width:100%;height:100%}
          .chat-main{width:100%;height:100%;position:fixed;inset:0;z-index:400;border-radius:0;border:none}
        }
      `}</style>

      <ProfesorNavBar {...navProps} />

      <div style={{ padding: "80px 20px 60px", maxWidth: 1100, margin: "0 auto", flex: 1, width: "100%" }}>

        {/* ══ PANEL ══════════════════════════════════════════ */}
        {vista === "panel" && (
          <>
            <div style={{ marginBottom: 32, marginTop: 12 }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
                {sedeActiva === "todas" ? (sedes.length > 1 ? "Todas las sedes" : sedes[0] || "") : (sedeActiva === "GSM" ? "Gral. San Martín" : sedeActiva)}
              </p>
              <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, letterSpacing: 2, lineHeight: 1, marginBottom: 4 }}>
                Hola, {nombreProfe}
              </h1>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
                {sedeActiva === "todas"
                  ? `Sede: ${sedes.map(s => s === "GSM" ? "Gral. San Martín" : s).join(" / ")}`
                  : `Trabajando en sede ${sedeActiva === "GSM" ? "Gral. San Martín" : sedeActiva}`}
              </p>
            </div>

            {/* STATS — el primero muestra alumnos con rutina asignada */}
            <div className="stat-grid">
              {[
                {
                  label: "Alumnos con rutina",
                  val: alumnosConRutina,
                  sub: `de ${alumnosFiltrados.length} alumnos`,
                  icon: "📋",
                  color: "#00b4d8",
                  accent: true,
                  action: () => { setFiltroRutina("con"); setVista("alumnos"); },
                },
                {
                  label: "Alumnos activos",
                  val: alumnosFiltrados.length,
                  icon: "🏃",
                  color: "white",
                  action: () => setVista("alumnos"),
                  style: { cursor: "pointer" },
                },
                {
                  label: "Mensajes no leídos",
                  val: mensajesNoLeidos,
                  icon: "💬",
                  color: mensajesNoLeidos > 0 ? "#f59e0b" : "white",
                  action: () => setVista("chat"),
                  style: { cursor: mensajesNoLeidos > 0 ? "pointer" : "default" },
                },
                {
                  label: "Me gusta / No me gusta",
                  val: `${likes} / ${dislikes}`,
                  icon: "👍",
                  color: "#22c55e",
                },
              ].map(s => (
                <div key={s.label} onClick={s.action} style={{ background: "#111", border: `1px solid ${s.accent ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "20px 22px", cursor: s.action ? "pointer" : "default", transition: "border-color 0.2s", ...(s.style || {}) }}
                  onMouseEnter={e => s.action && (e.currentTarget.style.borderColor = "rgba(0,180,216,0.35)")}
                  onMouseLeave={e => s.action && (e.currentTarget.style.borderColor = s.accent ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.07)")}>
                  <p style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{s.icon}</p>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.val}</p>
                  {s.sub && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(0,180,216,0.6)", marginBottom: 4 }}>{s.sub}</p>}
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", lineHeight: 1.3 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Barra de progreso rutinas */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 20px", marginBottom: 32 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>
                  Cobertura de rutinas
                </p>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "#00b4d8", letterSpacing: 2 }}>
                  {alumnosFiltrados.length > 0 ? Math.round((alumnosConRutina / alumnosFiltrados.length) * 100) : 0}%
                </p>
              </div>
              <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${alumnosFiltrados.length > 0 ? (alumnosConRutina / alumnosFiltrados.length) * 100 : 0}%`,
                  background: "linear-gradient(90deg,#00b4d8,#0077b6)",
                  borderRadius: 8,
                  transition: "width 0.8s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {alumnosConRutina} con rutina
                </p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {alumnosFiltrados.length - alumnosConRutina} sin rutina
                </p>
              </div>
            </div>

            {/* Accesos rápidos */}
            <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, letterSpacing: 2, color: "white", marginBottom: 32, textAlign: "center" }}>¿Qué hacemos hoy?</p>
            <div className="action-grid">
              {[
                { icon: "🏃", titulo: "Ver Alumnos", desc: `${alumnosFiltrados.length} alumnos${sedeActiva !== "todas" ? ` en ${sedeActiva}` : ""}`, badge: comsNoLeidas > 0 ? `${comsNoLeidas} comentario${comsNoLeidas > 1 ? "s" : ""} nuevo${comsNoLeidas > 1 ? "s" : ""}` : null, badgeColor: "#f59e0b", action: () => setVista("alumnos") },
                { icon: "💪", titulo: "Ver Ejercicios", desc: "Biblioteca de ejercicios", badge: null, action: () => setVista("ejercicios") },
                { icon: "📋", titulo: "Ver Rutinas", desc: `${alumnosConRutina} alumno${alumnosConRutina !== 1 ? "s" : ""} con rutina`, badge: null, action: () => setVista("rutinas") },
              ].map(card => (
                <div key={card.titulo} className="action-card" onClick={card.action}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 32, lineHeight: 1 }}>{card.icon}</span>
                    {card.badge && <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, color: card.badgeColor, background: `${card.badgeColor}18`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${card.badgeColor}40` }}>{card.badge}</span>}
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, color: "white", marginBottom: 4 }}>{card.titulo}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{card.desc}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8", fontWeight: 500 }}>Ir ahora</span>
                    <span style={{ color: "#00b4d8", fontSize: 14 }}>→</span>
                  </div>
                </div>
              ))}
            </div>

            {mensajesNoLeidos > 0 && (
              <div style={{ marginTop: 24, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setVista("chat")}>
                <div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#f59e0b", margin: 0 }}>💬 Tenés {mensajesNoLeidos} mensaje{mensajesNoLeidos > 1 ? "s" : ""} sin leer</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Tus alumnos te escribieron</p>
                </div>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#f59e0b", fontWeight: 500 }}>Ver chat →</span>
              </div>
            )}
          </>
        )}

        {/* ══ ALUMNOS ════════════════════════════════════════ */}
        {vista === "alumnos" && (
          <>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8, marginTop: 12 }}>GESTIÓN DE ALUMNOS</p>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: 2, marginBottom: 28, lineHeight: 1 }}>Mis Alumnos</h1>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              {[
                { val: alumnosFiltrados.length, label: `Total (${sedeActiva === "todas" ? "Todas las sedes" : sedeActiva})`, color: "#00b4d8", accent: true },
                { val: alumnosConRutina, label: "Con rutina asignada", color: "#22c55e" },
                { val: alumnosFiltrados.length - alumnosConRutina, label: "Sin rutina", color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} style={{ background: "#111", border: `1px solid ${s.accent ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 14, padding: "18px 24px", flex: 1, minWidth: 130 }}>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.val}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filtros */}
            <div className="alumnos-filtros" style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 2 }}><input className="alumnos-filtro-inp" placeholder="Buscar por nombre o apellido..." value={filtroBusq} onChange={e => setFiltroBusq(e.target.value)} /></div>
              <div style={{ flex: 1 }}>
                <select className="alumnos-filtro-inp" value={filtroEdad} onChange={e => setFiltroEdad(e.target.value)}>
                  <option value="">Cualquier edad</option>
                  <option value="-18">Menores de 18</option>
                  <option value="18-30">18 - 30 años</option>
                  <option value="31-50">31 - 50 años</option>
                  <option value="50+">Más de 50 años</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <select className="alumnos-filtro-inp" value={filtroRutina} onChange={e => setFiltroRutina(e.target.value)}>
                  <option value="">Todas las rutinas</option>
                  <option value="con">Con rutina asignada</option>
                  <option value="sin">Sin rutina asignada</option>
                </select>
              </div>
            </div>

            {/* Lista */}
            {alumnosVistaFiltrados.length === 0 ? (
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "40px 0", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)" }}>
                No se encontraron alumnos con los filtros seleccionados.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {alumnosVistaFiltrados.map(a => (
                  <div key={a.id} className="alumnos-row" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, transition: "background 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 0 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {a.nombre} {a.apellido || ""}
                          </p>
                          {/* Badge rutina */}
                          {a.tieneRutina
                            ? <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, color: "#22c55e", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "1px 8px", flexShrink: 0 }}>📋 Con rutina</span>
                            : <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: "1px 8px", flexShrink: 0 }}>Sin rutina</span>
                          }
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{a.edad ? `${a.edad} años` : "Edad N/A"}</span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8" }}>{a.sede || "Sede N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="alumnos-actions" style={{ display: "flex", gap: 8 }}>
                      <button className="alumnos-btn-action" onClick={() => handleEdit(a)}>✏️ Editar</button>
                      <button className="alumnos-btn-action" onClick={() => { setAlumnoActivoChat(a); setVista("chat"); }}>💬 Chat</button>
                      <button className="alumnos-btn-action" onClick={() => setAlumnoHistorial(a)} title="Ver historial de rutinas">
                        📋 Historial
                      </button>
                      {a.tieneRutina ? (
                        <button className="alumnos-btn-action accent" onClick={() => setAlumnoEditorRutina(a)}>
                          ✏️ Ver/Editar Rutina
                        </button>
                      ) : (
                        <button className="alumnos-btn-action accent" onClick={() => { setAlumnoParaRutina(a); setVista("rutinas"); }}>
                          ➕ Asignar Rutina
                        </button>
                      )}
                      {a.tieneRutina && (
                        <button className="alumnos-btn-action danger" onClick={() => handleEliminarRutina(a)} title="Quitar rutina asignada">
                          📋✕
                        </button>
                      )}
                      <BtnEnviarRutina alumno={a} miDoc={miDoc} />
                      <button className="alumnos-btn-action danger" onClick={() => handleDelete(a)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 16 }}>
              Mostrando {alumnosVistaFiltrados.length} alumnos
            </p>
          </>
        )}

        {/* ══ PERFIL ═════════════════════════════════════════ */}
        {vista === "perfil" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 24, marginTop: 12 }}>Mi Perfil de Profesor</p>
            <div style={{ display: "flex", gap: 40, alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ width: 140, height: 140, borderRadius: 16, background: "#111", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1, minWidth: 280, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                {[
                  { label: "Nombre", val: miDoc?.nombre },
                  { label: "Apellido", val: miDoc?.apellido },
                  { label: "Sedes", val: miDoc?.sedes?.join(", "), accent: true },
                  { label: "Nacimiento", val: miDoc?.nacimiento },
                  { label: "Edad", val: miDoc?.edad ? `${miDoc.edad} años` : null },
                  { label: "Fecha de Alta", val: miDoc?.fechaAlta, accent: true },
                ].map(i => (
                  <div key={i.label} style={{ padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>{i.label}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, fontWeight: 500, color: i.accent ? "#00b4d8" : "white" }}>{i.val || "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)", margin: "40px 0" }} />

            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 24, textAlign: "center" }}>Feedback de Alumnos</p>
            <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
              <div style={{ flex: 1, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 16, padding: "20px", textAlign: "center" }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>👍</p>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: "#22c55e", lineHeight: 1 }}>{likes}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>Me gusta</p>
              </div>
              <div style={{ flex: 1, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 16, padding: "20px", textAlign: "center" }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>👎</p>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 42, color: "#ef4444", lineHeight: 1 }}>{dislikes}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>No me gusta</p>
              </div>
            </div>

            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>Comentarios y Firmas</p>
            {comentarios.length === 0 ? (
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.2)", fontStyle: "italic", textAlign: "center", padding: "40px 0", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: 16 }}>Aún no recibiste comentarios.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {comentarios.map(c => (
                  <div key={c.id} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#00b4d8" }}>{c.alumnoNombre || "Anónimo"}</p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{c.fecha}</p>
                    </div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{c.mensaje}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ CHAT ═══════════════════════════════════════════ */}
        {vista === "chat" && (
          <div className="chat-container">
            <div className="chat-sidebar" style={{ display: (alumnoActivoChat && window.innerWidth <= 850) ? "none" : "flex" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12 }}>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: "#00b4d8" }}>Tus Alumnos</p>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
                {alumnosFiltrados.map(a => {
                  const msgsCount = chat.filter(m => m.alumnoId === a.id && m.de === "alumno" && !m.leido).length;
                  return (
                    <div key={a.id} onClick={() => setAlumnoActivoChat(a)} style={{ padding: "14px 16px", borderRadius: 12, cursor: "pointer", background: alumnoActivoChat?.id === a.id ? "rgba(0,180,216,0.1)" : "transparent", border: alumnoActivoChat?.id === a.id ? "1px solid rgba(0,180,216,0.25)" : "1px solid transparent", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre} {a.apellido || ""}</p>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{a.sede}</p>
                      </div>
                      {msgsCount > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: 20, minWidth: 20, height: 20, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{msgsCount}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {(!alumnoActivoChat && window.innerWidth > 850) ? (
              <div className="chat-main" style={{ alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)" }}>
                <span style={{ fontSize: 60, marginBottom: 16 }}>💬</span>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, letterSpacing: 1 }}>Seleccioná un alumno para chatear</p>
              </div>
            ) : alumnoActivoChat && (
              <div className="chat-main">
                <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 14, background: "#111" }}>
                  <button onClick={() => setAlumnoActivoChat(null)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer", marginRight: 4, display: window.innerWidth <= 850 ? "block" : "none" }}>←</button>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, fontWeight: 600 }}>{alumnoActivoChat.nombre} {alumnoActivoChat.apellido || ""}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{alumnoActivoChat.sede}</p>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: 12, background: "#0d0d0d" }}>
                  {chat.filter(m => m.alumnoId === alumnoActivoChat.id).sort((a, b) => a.fecha?.localeCompare(b.fecha)).map(m => (
                    <div key={m.id} style={{ maxWidth: "85%", alignSelf: m.de === "profesor" ? "flex-end" : "flex-start" }}>
                      <div style={{ padding: "12px 16px", borderRadius: 18, background: m.de === "profesor" ? "#00b4d8" : "#1a1a1a", color: m.de === "profesor" ? "#03045e" : "white", border: m.de === "profesor" ? "none" : "1px solid rgba(255,255,255,0.08)", borderBottomRightRadius: m.de === "profesor" ? 4 : 18, borderBottomLeftRadius: m.de === "alumno" ? 4 : 18, boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, lineHeight: 1.5 }}>{m.mensaje}</p>
                        <p style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: "right" }}>{m.fecha ? new Date(m.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 12, background: "#111" }}>
                  <textarea value={mensajeChat} onChange={e => setMensajeChat(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensajeProfe(); } }} placeholder="Escribí un mensaje..." style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "12px 16px", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 14, resize: "none", outline: "none", height: 48 }} />
                  <button onClick={enviarMensajeProfe} disabled={enviandoMensaje} style={{ background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 14, width: 48, height: 48, fontSize: 20, cursor: "pointer", opacity: enviandoMensaje ? 0.6 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>➤</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ MODAL EDITOR RUTINA ALUMNO ═════════════════════════ */}
      {alumnoEditorRutina && (
        <EditorRutinaAlumno
          alumno={alumnoEditorRutina}
          miDoc={miDoc}
          onClose={() => setAlumnoEditorRutina(null)}
          onGuardado={() => cargarDatos()}
        />
      )}

      {/* ══ MODAL HISTORIAL RUTINAS ════════════════════════════ */}
      {alumnoHistorial && (
        <HistorialRutinas
          alumno={alumnoHistorial}
          miDoc={miDoc}
          onClose={() => setAlumnoHistorial(null)}
        />
      )}

      {/* ══ MODAL EDICIÓN ALUMNO ════════════════════════════ */}
      {modalEdit && (
        <div className="modal-overlay" onClick={() => setModalEdit(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 2, color: "white" }}>✏️ Editar Alumno</span>
              <button onClick={() => setModalEdit(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 28, cursor: "pointer" }}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div style={{ marginBottom: 16 }}><label className="modal-label">Nombre</label><input className="modal-input" value={editForm.nombre || ""} onChange={e => setEditForm({ ...editForm, nombre: e.target.value })} /></div>
                <div style={{ marginBottom: 16 }}><label className="modal-label">Apellido</label><input className="modal-input" value={editForm.apellido || ""} onChange={e => setEditForm({ ...editForm, apellido: e.target.value })} /></div>
              </div>
              <div className="modal-grid">
                <div style={{ marginBottom: 16 }}><label className="modal-label">Nacimiento</label><input type="date" className="modal-input" value={editForm.nacimiento || ""} onChange={e => setEditForm({ ...editForm, nacimiento: e.target.value })} /></div>
                <div style={{ marginBottom: 16 }}>
                  <label className="modal-label">Sede</label>
                  <select className="modal-input" value={editForm.sede || ""} onChange={e => setEditForm({ ...editForm, sede: e.target.value })}>
                    <option value="">Seleccionar</option>
                    <option value="Edison">Edison</option>
                    <option value="Moreno">Moreno</option>
                    <option value="GSM">Gral. San Martín</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <button className="modal-btn-cancel" onClick={() => setModalEdit(false)}>Cancelar</button>
                <button className="modal-btn-save" onClick={handleSaveEdit} disabled={guardandoEdit}>{guardandoEdit ? "Guardando..." : "Guardar Cambios"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ FOOTER ═════════════════════════════════════════ */}
      <footer className="footer">
        <div>
          <p className="footer-brand">AnimaApp</p>
          <p className="footer-copy">© {new Date().getFullYear()} Gimnasio Anima · Derechos reservados por el autor</p>
        </div>
        <div className="footer-socials">
          <a href="#" className="social-btn" title="Facebook">f</a>
          <a href="#" className="social-btn" title="Instagram">📷</a>
          <a href="#" className="social-btn" title="WhatsApp">💬</a>
        </div>
      </footer>
    </div>
  );
}