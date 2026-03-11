import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, authSecundaria, storage } from "../../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import { crearNotificacion } from "../../utils/notificaciones";
import AdminNavBar from "./AdminNavBar";

const calcularEdad = (f) => {
  if (!f) return "";
  const e = Math.floor((new Date() - new Date(f)) / (365.25 * 24 * 60 * 60 * 1000));
  return isNaN(e) ? "" : String(e);
};

// ── Modal perfil profesor ────────────────────────────────────
function PerfilProfesorModal({ profesor, alumnos, comentarios, onClose, onGuardar, onEliminar }) {
  const [tab, setTab] = useState("datos");
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({ ...profesor });
  const [guardando, setGuardando] = useState(false);
  const [editFoto, setEditFoto] = useState(null);

  const alumnosDelProfe = alumnos.filter(a => a.profesorId === profesor.id);
  const comsDelProfe = comentarios.filter(c => c.profesorId === profesor.id);
  const likes = alumnosDelProfe.filter(a => a.reaccionProfesor === "like").length;
  const dislikes = alumnosDelProfe.filter(a => a.reaccionProfesor === "dislike").length;

  const setDato = (k, v) => {
    if (k === "nacimiento") setDatos(d => ({ ...d, nacimiento: v, edad: calcularEdad(v) }));
    else setDatos(d => ({ ...d, [k]: v }));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      let fotoUrl = datos.foto || "";
      if (editFoto) {
        const sr = ref(storage, `fotos/profesores/${profesor.id}`);
        await uploadBytes(sr, editFoto);
        fotoUrl = await getDownloadURL(sr);
      }
      await onGuardar({ ...datos, foto: fotoUrl });
      setEditando(false); setEditFoto(null);
    } catch (e) { alert("Error: " + e.message); }
    setGuardando(false);
  };

  const ls = { fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6, display: "block" };
  const is = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,180,216,0.4)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none" };
  const rs = { ...is, border: "1px solid rgba(255,255,255,0.07)", opacity: 0.6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.2s ease" }} onClick={e => e.stopPropagation()}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ padding: "22px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 54, height: 54, borderRadius: 12, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
              {editFoto ? <img src={URL.createObjectURL(editFoto)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : datos.foto ? <img src={datos.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
            </div>
            <div>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: "white", lineHeight: 1 }}>{datos.nombre} {datos.apellido || ""}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{datos.email}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8", marginTop: 2 }}>{datos.sedes?.join(" · ")}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", margin: "18px 0 0", padding: "0 24px", overflowX: "auto" }}>
          {[["datos", "Datos"], ["alumnos", `Alumnos (${alumnosDelProfe.length})`], ["feedback", "Feedback"]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, background: "none", border: "none", color: tab === v ? "#00b4d8" : "rgba(255,255,255,0.4)", padding: "10px 14px", cursor: "pointer", position: "relative", whiteSpace: "nowrap" }}>
              {l}{tab === v && <span style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 2, background: "#00b4d8", display: "block" }} />}
            </button>
          ))}
        </div>
        <div style={{ padding: "20px 24px" }}>
          {tab === "datos" && (
            <>
              {editando && (
                <div style={{ marginBottom: 16 }}>
                  <label style={ls}>Foto</label>
                  <label style={{ border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: "rgba(255,255,255,0.02)" }}>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{editFoto ? editFoto.name : "Cambiar foto — click para subir"}</span>
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) setEditFoto(e.target.files[0]); }} />
                  </label>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                {[["Nombre", "nombre"], ["Apellido", "apellido"], ["DNI", "dni"], ["Nacimiento", "nacimiento", "date"], ["Edad", "edad", null, true], ["Fecha de alta", "fechaAlta"]].map(([label, key, tipo, readOnly]) => (
                  <div key={key} style={{ marginBottom: 16 }}>
                    <label style={ls}>{label}</label>
                    {editando ? (readOnly ? <input style={rs} value={datos[key] ? `${datos[key]} años` : "—"} readOnly /> : <input type={tipo || "text"} value={datos[key] || ""} onChange={e => setDato(key, e.target.value)} style={is} />)
                      : <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: datos[key] ? "white" : "rgba(255,255,255,0.2)", fontStyle: datos[key] ? "normal" : "italic" }}>{datos[key] || "Sin cargar"}</p>}
                  </div>
                ))}
                <div style={{ marginBottom: 16 }}>
                  <label style={ls}>Sedes</label>
                  {editando ? (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
                      {["Edison", "Moreno", "GSM"].map(sede => (
                        <label key={sede} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: datos.sedes?.includes(sede) ? "#00b4d8" : "rgba(255,255,255,0.5)" }}>
                          <input type="checkbox" checked={datos.sedes?.includes(sede) || false} onChange={e => { const s = datos.sedes || []; setDato("sedes", e.target.checked ? [...s, sede] : s.filter(x => x !== sede)); }} />
                          {sede === "GSM" ? "Gral. San Martín" : sede}
                        </label>
                      ))}
                    </div>
                  ) : <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "#00b4d8" }}>{datos.sedes?.join(", ") || "Sin sedes"}</p>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {editando ? (
                  <><button onClick={guardar} disabled={guardando} style={{ flex: 1, background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "12px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}>{guardando ? "Guardando..." : "Guardar"}</button>
                    <button onClick={() => { setEditando(false); setDatos({ ...profesor }); setEditFoto(null); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "12px 18px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer" }}>Cancelar</button></>
                ) : (
                  <><button onClick={() => setEditando(true)} style={{ flex: 1, background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "12px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✏️ Editar</button>
                    <button onClick={() => onEliminar(profesor.id)} style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 10, padding: "12px 18px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer" }}>Eliminar</button></>
                )}
              </div>
            </>
          )}
          {tab === "alumnos" && (
            alumnosDelProfe.length === 0
              ? <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "28px 0" }}>Sin alumnos asignados.</p>
              : alumnosDelProfe.map(a => (
                <div key={a.id} style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#222", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {a.foto ? <img src={a.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                  </div>
                  <div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: "white", margin: 0 }}>{a.nombre} {a.apellido || ""}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>{a.sede || "Sin sede"} · Alta: {a.fechaAlta || "—"}</p>
                  </div>
                </div>
              ))
          )}
          {tab === "feedback" && (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: "16px", textAlign: "center" }}>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, color: "#22c55e", lineHeight: 1 }}>👍 {likes}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>Me gusta</p>
                </div>
                <div style={{ flex: 1, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "16px", textAlign: "center" }}>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, color: "#ef4444", lineHeight: 1 }}>👎 {dislikes}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 }}>No me gusta</p>
                </div>
              </div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Comentarios ({comsDelProfe.length})</p>
              {comsDelProfe.length === 0
                ? <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Sin comentarios aún.</p>
                : comsDelProfe.map(c => (
                  <div key={c.id} style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, color: "#00b4d8" }}>{c.alumnoNombre || "Anónimo"}</p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{c.fecha}</p>
                    </div>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>{c.mensaje}</p>
                  </div>
                ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard principal ──────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Leer vista inicial desde location.state (para navegación desde AlumnosAdmin)
  const [vista, setVista] = useState(location.state?.vista || "panel");

  const [profesores, setProfesores] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [filtroBusq, setFiltroBusq] = useState("");
  const [filtroSede, setFiltroSede] = useState("");
  const [perfilModal, setPerfilModal] = useState(null);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", pass: "", sedes: [], dni: "", nacimiento: "", edad: "", foto: null, fotoPreview: null });
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  // Actualizar vista si cambia location.state (link desde otro componente)
  useEffect(() => {
    if (location.state?.vista) setVista(location.state.vista);
  }, [location.state]);

  const cargarDatos = async () => {
    const snap = await getDocs(collection(db, "usuarios"));
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setProfesores(todos.filter(u => u.rol === "profesor"));
    setAlumnos(todos.filter(u => u.rol === "alumno"));
    const rutSnap = await getDocs(collection(db, "rutinas"));
    setRutinas(rutSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const comSnap = await getDocs(collection(db, "comentarios"));
    setComentarios(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarNotificaciones = async () => {
    const adminSnap = await getDocs(query(collection(db, "usuarios"), where("rol", "==", "admin")));
    if (adminSnap.empty) return;
    const adminId = adminSnap.docs[0].id;
    const snap = await getDocs(query(collection(db, "notificaciones"), where("usuarioId", "==", adminId)));
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notifs.sort((a, b) => b.fecha.localeCompare(a.fecha));
    setNotificaciones(notifs);
  };

  useEffect(() => { cargarDatos(); cargarNotificaciones(); }, []);

  const setFormField = (key, val) => {
    if (key === "nacimiento") setForm(f => ({ ...f, nacimiento: val, edad: calcularEdad(val) }));
    else setForm(f => ({ ...f, [key]: val }));
  };

  const agregarProfesor = async () => {
    if (!form.nombre || !form.email || !form.pass) return alert("Completá nombre, email y contraseña");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return alert("Por favor ingresá un correo electrónico válido (ej: nombre@gmail.com)");
    if (form.sedes.length === 0) return alert("Seleccioná al menos una sede");
    setSubiendoFoto(true);
    try {
      const cred = await createUserWithEmailAndPassword(authSecundaria, form.email, form.pass);
      await addDoc(collection(db, "usuarios"), {
        uid: cred.user.uid, nombre: form.nombre, apellido: form.apellido,
        email: form.email, rol: "profesor", sedes: form.sedes,
        dni: form.dni, nacimiento: form.nacimiento, edad: form.edad,
        fechaAlta: new Date().toLocaleDateString("es-AR"), foto: ""
      });
      setForm({ nombre: "", apellido: "", email: "", pass: "", sedes: [], dni: "", nacimiento: "", edad: "" });
      cargarDatos();
      alert("Profesor agregado exitosamente.");
    } catch (e) {
      console.error("Error al crear profesor:", e);
      if (e.code === "auth/email-already-in-use") {
        alert("Ese correo electrónico ya está registrado. Por favor, usá otro.");
      } else if (e.code === "auth/weak-password") {
        alert("La contraseña es muy débil. Debe tener al menos 6 caracteres.");
      } else {
        alert("Error al agregar profesor. Revisá los datos e intentá de nuevo. (" + e.code + ")");
      }
    }
    setSubiendoFoto(false);
  };

  const guardarEdicionModal = async (datos) => {
    await updateDoc(doc(db, "usuarios", datos.id), {
      nombre: datos.nombre || "", apellido: datos.apellido || "",
      dni: datos.dni || "", nacimiento: datos.nacimiento || "",
      edad: datos.edad || "", sedes: datos.sedes || [],
      fechaAlta: datos.fechaAlta || "", foto: datos.foto || ""
    });
    setPerfilModal(null); cargarDatos();
  };

  const eliminarProfesor = async (id) => {
    if (!window.confirm("¿Eliminar profesor?")) return;
    await deleteDoc(doc(db, "usuarios", id));
    setPerfilModal(null); cargarDatos();
  };

  const marcarLeida = async (id) => {
    await updateDoc(doc(db, "notificaciones", id), { leida: true });
    cargarNotificaciones();
  };
  const marcarTodasLeidas = async () => {
    await Promise.all(notificaciones.filter(n => !n.leida).map(n => updateDoc(doc(db, "notificaciones", n.id), { leida: true })));
    cargarNotificaciones();
  };

  const profesoresFiltrados = profesores.filter(p => {
    const nombre = `${p.nombre || ""} ${p.apellido || ""}`.toLowerCase();
    const matchBusq = !filtroBusq || nombre.includes(filtroBusq.toLowerCase()) || (p.dni || "").includes(filtroBusq);
    const matchSede = !filtroSede || p.sedes?.includes(filtroSede);
    return matchBusq && matchSede;
  });

  const inp = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none" };
  const lbl = { fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 7, display: "block" };

  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        input::placeholder{color:rgba(255,255,255,0.2)}
        select option{background:#1a1a1a;color:white}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.4}
        .foto-upload{border:2px dashed rgba(255,255,255,0.1);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:border-color 0.2s;background:rgba(255,255,255,0.02)}
        .foto-upload:hover{border-color:rgba(0,180,216,0.4)}
        .prof-row:hover{background:rgba(255,255,255,0.025)!important}
        .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .prof-stats{display:flex;gap:20px;margin-right:12px}
        .footer { background: #000; border-top: 1px solid rgba(255,255,255,0.06); padding: 40px 60px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; color: #00b4d8; margin-bottom: 4px; }
        .footer-copy { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(255,255,255,0.3); }
        .footer-socials { display: flex; gap: 14px; }
        .social-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; color: rgba(255,255,255,0.5); font-size: 15px; transition: border-color 0.2s, color 0.2s; }
        .social-btn:hover { border-color: #00b4d8; color: #00b4d8; }
        @media(max-width:680px){
          .stat-grid{grid-template-columns:1fr 1fr!important}
          .form-grid{grid-template-columns:1fr!important}
          .prof-stats{display:none!important}
          .footer { padding: 32px 24px; }
        }
      `}</style>

      <AdminNavBar vistaActual={vista}
        notificaciones={notificaciones}
        onMarcarLeida={marcarLeida}
        onMarcarTodas={marcarTodasLeidas}
      />

      <div style={{ padding: "80px 20px 60px", maxWidth: 1100, margin: "0 auto", flex: 1, width: "100%" }}>

        {/* ── PANEL ── */}
        {vista === "panel" && (
          <>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8, marginTop: 12 }}>resumen</p>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: 2, marginBottom: 28 }}>Panel Admin</h1>
            <div className="stat-grid" style={{ marginBottom: 32 }}>
              {[
                { label: "Profesores activos", val: profesores.length },
                { label: "Alumnos activos", val: alumnos.length, accent: true, link: "/admin/alumnos" },
                { label: "Rutinas totales", val: rutinas.length },
              ].map(s => (
                <div key={s.label} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 24px", cursor: s.link ? "pointer" : "default" }} onClick={() => s.link && navigate(s.link)}>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 44, color: s.accent ? "#00b4d8" : "white", lineHeight: 1, marginBottom: 4 }}>{s.val}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 14 }}>Profesores</p>
            {profesores.map(p => (
              <div key={p.id} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px 18px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setPerfilModal(p)}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {p.foto ? <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 17 }}>👤</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre} {p.apellido || ""}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{p.sedes?.join(" · ")}</p>
                </div>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8", flexShrink: 0 }}>Ver perfil →</span>
              </div>
            ))}
            <button onClick={() => navigate("/admin/alumnos")} style={{ marginTop: 20, background: "none", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8", fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, padding: "12px 24px", borderRadius: 10, cursor: "pointer" }}>
              Ver todos los alumnos →
            </button>
          </>
        )}

        {/* ── PROFESORES ── */}
        {vista === "profesores" && (
          <>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8, marginTop: 12 }}>gestión</p>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: 2, marginBottom: 28 }}>Profesores</h1>

            {/* FORM */}
            <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "22px 20px", marginBottom: 24 }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 18 }}>Nuevo profesor</p>
              <div className="form-grid" style={{ marginBottom: 14 }}>
                {[["Nombre *", "nombre"], ["Apellido", "apellido"], ["DNI", "dni"], ["Email *", "email", "email"], ["Contraseña *", "pass", "text"]].map(([l, k, t]) => (
                  <div key={k}><label style={lbl}>{l}</label><input type={t || "text"} value={form[k]} onChange={e => setFormField(k, e.target.value)} placeholder={l.replace(" *", "")} style={inp} /></div>
                ))}
                <div><label style={lbl}>Fecha de Nacimiento</label><input type="date" value={form.nacimiento} onChange={e => setFormField("nacimiento", e.target.value)} style={inp} /></div>
                <div><label style={lbl}>Edad (calculada)</label><input style={{ ...inp, opacity: 0.6 }} value={form.edad ? `${form.edad} años` : "—"} readOnly /></div>
                <div>
                  <label style={lbl}>Sedes *</label>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", paddingTop: 4 }}>
                    {["Edison", "Moreno", "GSM"].map(sede => (
                      <label key={sede} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: form.sedes.includes(sede) ? "#00b4d8" : "rgba(255,255,255,0.5)" }}>
                        <input type="checkbox" checked={form.sedes.includes(sede)} onChange={e => setFormField("sedes", e.target.checked ? [...form.sedes, sede] : form.sedes.filter(s => s !== sede))} />
                        {sede === "GSM" ? "Gral. San Martín" : sede}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={agregarProfesor} disabled={subiendoFoto} style={{ background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "12px 28px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: subiendoFoto ? "not-allowed" : "pointer", opacity: subiendoFoto ? 0.6 : 1 }}>
                {subiendoFoto ? "Subiendo..." : "+ Agregar profesor"}
              </button>
            </div>

            {/* FILTROS */}
            <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 160 }}><label style={lbl}>Buscar</label><input style={inp} placeholder="Nombre, apellido o DNI..." value={filtroBusq} onChange={e => setFiltroBusq(e.target.value)} /></div>
              <div style={{ flex: 1, minWidth: 130 }}><label style={lbl}>Sede</label>
                <select style={inp} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                  <option value="">Todas</option><option value="Edison">Edison</option><option value="Moreno">Moreno</option><option value="GSM">General San Martín</option>
                </select>
              </div>
            </div>

            {/* LISTA */}
            {profesoresFiltrados.length === 0 && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "28px 0" }}>No se encontraron profesores.</p>}
            {profesoresFiltrados.map(p => {
              const apd = alumnos.filter(a => a.profesorId === p.id);
              const likes = apd.filter(a => a.reaccionProfesor === "like").length;
              const dislikes = apd.filter(a => a.reaccionProfesor === "dislike").length;
              const coms = comentarios.filter(c => c.profesorId === p.id).length;
              return (
                <div key={p.id} className="prof-row" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", marginBottom: 10, transition: "background 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => setPerfilModal(p)}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {p.foto ? <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 20 }}>👤</span>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre} {p.apellido || ""}</p>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>{p.email}</p>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8", margin: "2px 0 0" }}>{p.sedes?.join(" · ")}</p>
                      </div>
                    </div>
                    <div className="prof-stats">
                      {[{ val: apd.length, label: "Alumnos", color: "white" }, { val: `👍 ${likes}`, label: "Likes", color: "#22c55e" }, { val: `👎 ${dislikes}`, label: "Dislikes", color: "#ef4444" }, { val: coms, label: "Coms.", color: "#00b4d8" }].map(s => (
                        <div key={s.label} style={{ textAlign: "center" }}>
                          <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: s.color, lineHeight: 1 }}>{s.val}</p>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => setPerfilModal(p)} style={{ background: "none", border: "1px solid rgba(0,180,216,0.3)", color: "#00b4d8", borderRadius: 8, padding: "8px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>Ver perfil</button>
                      <button onClick={() => eliminarProfesor(p.id)} style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 8, padding: "8px 14px", fontFamily: "'DM Sans',sans-serif", fontSize: 13, cursor: "pointer" }}>Eliminar</button>
                    </div>
                  </div>
                </div>
              );
            })}
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 12 }}>Mostrando {profesoresFiltrados.length} de {profesores.length} profesores</p>
          </>
        )}
      </div>

      {perfilModal && <PerfilProfesorModal profesor={perfilModal} alumnos={alumnos} comentarios={comentarios} onClose={() => setPerfilModal(null)} onGuardar={guardarEdicionModal} onEliminar={eliminarProfesor} />}

      {/* ── FOOTER ── */}
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