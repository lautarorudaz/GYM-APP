import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, authSecundaria } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { crearNotificacion } from "../../utils/notificaciones";
import AdminNavBar from "./AdminNavBar";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return "";
  const edad = Math.floor((new Date() - new Date(fechaNac)) / (365.25 * 24 * 60 * 60 * 1000));
  return isNaN(edad) ? "" : String(edad);
};

// ── Modal perfil alumno ──────────────────────────────────────
function PerfilModal({ alumno, profesores, onClose, onGuardar, onEliminar }) {
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({ ...alumno });
  const [guardando, setGuardando] = useState(false);
  const profNombre = profesores.find(p => p.id === alumno.profesorId)?.nombre || "Sin asignar";

  const setDato = (key, val) => {
    if (key === "nacimiento") setDatos(d => ({ ...d, nacimiento: val, edad: calcularEdad(val) }));
    else setDatos(d => ({ ...d, [key]: val }));
  };

  const guardar = async () => { setGuardando(true); await onGuardar(datos); setGuardando(false); setEditando(false); };

  const ls = { fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6, display: "block" };
  const is = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,180,216,0.4)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none" };
  const rs = { ...is, border: "1px solid rgba(255,255,255,0.07)", opacity: 0.6 };

  const campo = (label, key, tipo = "text", opciones = null, readOnly = false) => (
    <div style={{ marginBottom: 16 }}>
      <label style={ls}>{label}</label>
      {!editando
        ? <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: datos[key] ? "white" : "rgba(255,255,255,0.2)", fontStyle: datos[key] ? "normal" : "italic" }}>{key === "profesorId" ? profNombre : (datos[key] || "Sin cargar")}</p>
        : readOnly ? <input style={rs} value={datos[key] ? `${datos[key]} años` : "—"} readOnly />
          : opciones ? (
            <select value={datos[key] || ""} onChange={e => setDato(key, e.target.value)} style={{ ...is, cursor: "pointer" }}>
              {opciones.map(o => <option key={o.v} value={o.v} style={{ background: "#111" }}>{o.l}</option>)}
            </select>
          ) : <input type={tipo} value={datos[key] || ""} onChange={e => setDato(key, e.target.value)} style={is} />
      }
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.2s ease" }} onClick={e => e.stopPropagation()}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              {alumno.foto ? <img src={alumno.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
            </div>
            <div>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: "white" }}>{alumno.nombre} {alumno.apellido || ""}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{alumno.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
            {campo("Nombre", "nombre")}
            {campo("Apellido", "apellido")}
            {campo("DNI", "dni")}
            {campo("Nacimiento", "nacimiento", "date")}
            {campo("Edad", "edad", "text", null, true)}
            {campo("Sede", "sede", "text", [{ v: "", l: "Seleccionar sede" }, { v: "Edison", l: "Edison" }, { v: "Moreno", l: "Moreno" }, { v: "GSM", l: "General San Martín" }])}
            {campo("Fecha de alta", "fechaAlta")}
            {campo("Profesor", "profesorId", "text", [{ v: "", l: "Seleccionar profesor" }, ...profesores.filter(p => !datos.sede || p.sedes?.includes(datos.sede)).map(p => ({ v: p.id, l: p.nombre }))])}
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", marginTop: 4 }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>🔐 Credenciales</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "white", marginBottom: 6 }}>{alumno.email}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Contraseña: {alumno.passVisible || "••••••••"}</p>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            {editando ? (
              <><button onClick={guardar} disabled={guardando} style={{ flex: 1, background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
                <button onClick={() => { setEditando(false); setDatos({ ...alumno }); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer" }}>Cancelar</button></>
            ) : (
              <><button onClick={() => setEditando(true)} style={{ flex: 1, background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✏️ Editar</button>
                <button onClick={() => onEliminar(alumno.id)} style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 10, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer" }}>Eliminar</button></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function AlumnosAdmin() {
  const navigate = useNavigate();
  const [profesores, setProfesores] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [filtroBusq, setFiltroBusq] = useState("");
  const [filtroSede, setFiltroSede] = useState("");
  const [filtroProf, setFiltroProf] = useState("");
  const [perfilModal, setPerfilModal] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", pass: "", sede: "", profesorId: "", dni: "", nacimiento: "", edad: "" });

  const [creando, setCreando] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const snap = await getDocs(collection(db, "usuarios"));
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    setProfesores(todos.filter(u => u.rol === "profesor"));
    setAlumnos(todos.filter(u => u.rol === "alumno"));

    const rutSnap = await getDocs(collection(db, "rutinas"));
    const rutsData = rutSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setRutinas(rutsData);
  };

  const setFormField = (key, val) => {
    if (key === "nacimiento") setForm(f => ({ ...f, nacimiento: val, edad: calcularEdad(val) }));
    else setForm(f => ({ ...f, [key]: val }));
  };

  const crearAlumno = async () => {
    if (!form.nombre || !form.email || !form.pass || !form.sede || !form.profesorId) return alert("Completá nombre, email, contraseña, sede y profesor");
    setCreando(true);
    try {
      const cred = await createUserWithEmailAndPassword(authSecundaria, form.email, form.pass);
      await addDoc(collection(db, "usuarios"), {
        uid: cred.user.uid, nombre: form.nombre, apellido: form.apellido,
        email: form.email, passVisible: form.pass, dni: form.dni,
        nacimiento: form.nacimiento, edad: form.edad,
        rol: "alumno", profesorId: form.profesorId, sede: form.sede,
        fechaAlta: new Date().toLocaleDateString("es-AR")
      });
      await crearNotificacion({ usuarioId: form.profesorId, mensaje: `Se te asignó un nuevo alumno: ${form.nombre} ${form.apellido} (${form.sede})`, tipo: "nuevo_alumno" });
      setForm({ nombre: "", apellido: "", email: "", pass: "", sede: "", profesorId: "", dni: "", nacimiento: "", edad: "" });
      setModalNuevo(false); cargarDatos();
    } catch (e) { alert("Error: " + e.message); }
    setCreando(false);
  };

  const guardarEdicion = async (datos) => {
    const anterior = alumnos.find(a => a.id === datos.id);
    await updateDoc(doc(db, "usuarios", datos.id), {
      nombre: datos.nombre || "", apellido: datos.apellido || "", dni: datos.dni || "",
      nacimiento: datos.nacimiento || "", edad: datos.edad || "",
      sede: datos.sede || "", profesorId: datos.profesorId || "", fechaAlta: datos.fechaAlta || ""
    });
    if (anterior.profesorId !== datos.profesorId && datos.profesorId) {
      await crearNotificacion({ usuarioId: datos.profesorId, mensaje: `Se te asignó un nuevo alumno: ${datos.nombre} (${datos.sede})`, tipo: "nuevo_alumno" });
    }
    setPerfilModal(null); cargarDatos();
  };

  const eliminarAlumno = async (id) => {
    if (!window.confirm("¿Eliminar alumno?")) return;
    await deleteDoc(doc(db, "usuarios", id));
    setPerfilModal(null); cargarDatos();
  };

  const alumnosFiltrados = alumnos.filter(a => {
    const nombre = `${a.nombre || ""} ${a.apellido || ""}`.toLowerCase();
    const matchBusq = !filtroBusq || nombre.includes(filtroBusq.toLowerCase()) || (a.dni || "").includes(filtroBusq);
    const matchSede = !filtroSede || a.sede === filtroSede;
    const matchProf = !filtroProf || a.profesorId === filtroProf;
    return matchBusq && matchSede && matchProf;
  });

  const inp = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none" };
  const lbl = { fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 7, display: "block" };

  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        input::placeholder{color:rgba(255,255,255,0.2)}
        select option{background:#1a1a1a;color:white}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.4}
        .tabla-tr:hover td{background:rgba(255,255,255,0.02)}
        .stat-cards{display:flex;gap:12px;flex-wrap:wrap}
        .stat-card{background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:16px 20px;flex:1;min-width:120px}
        .filtros-row{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end}
        .tabla-wrap{overflow-x:auto;border:1px solid rgba(255,255,255,0.07);border-radius:14px}
        .modal-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .footer { background: #000; border-top: 1px solid rgba(255,255,255,0.06); padding: 40px 60px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; color: #00b4d8; margin-bottom: 4px; }
        .footer-copy { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(255,255,255,0.3); }
        .footer-socials { display: flex; gap: 14px; }
        .social-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; color: rgba(255,255,255,0.5); font-size: 15px; transition: border-color 0.2s, color 0.2s; }
        .social-btn:hover { border-color: #00b4d8; color: #00b4d8; }
        @media(max-width:500px){
          .modal-form-grid{grid-template-columns:1fr!important}
          .filtros-row .busq{flex:unset!important;width:100%}
          .footer { padding: 32px 24px; }
        }
      `}</style>

      <AdminNavBar />

      <div style={{ padding: "80px 20px 60px", maxWidth: 1200, margin: "0 auto", flex: 1, width: "100%" }}>

        {/* STATS */}
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8, marginTop: 12 }}>resumen</p>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: 2, color: "white", marginBottom: 20 }}>Alumnos</h1>
        <div className="stat-cards" style={{ marginBottom: 28 }}>
          {[
            { label: "Alumnos Generales", val: alumnos.length, accent: true },
            { label: "Edison", val: alumnos.filter(a => a.sede === "Edison").length },
            { label: "Moreno", val: alumnos.filter(a => a.sede === "Moreno").length },
            { label: "GSM", val: alumnos.filter(a => a.sede === "GSM").length },
            { label: "Rutinas Totales", val: new Set(rutinas.map(r => r.nombre || r.id)).size },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 38, color: s.accent ? "#00b4d8" : "white", lineHeight: 1, marginBottom: 4 }}>{s.val}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div className="filtros-row" style={{ marginBottom: 20 }}>
          <div className="busq" style={{ flex: 2, minWidth: 180 }}>
            <label style={lbl}>Buscar por nombre, apellido o DNI</label>
            <input style={inp} placeholder="Ej: Juan Pérez o 12345678" value={filtroBusq} onChange={e => setFiltroBusq(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label style={lbl}>Sede</label>
            <select style={inp} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
              <option value="">Todas</option>
              <option value="Edison">Edison</option>
              <option value="Moreno">Moreno</option>
              <option value="GSM">General San Martín</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={lbl}>Profesor</label>
            <select style={inp} value={filtroProf} onChange={e => setFiltroProf(e.target.value)}>
              <option value="">Todos</option>
              {profesores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <button onClick={() => setModalNuevo(true)}
            style={{ background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "11px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", alignSelf: "flex-end" }}>
            + Nuevo alumno
          </button>
        </div>

        {/* TABLA */}
        <div className="tabla-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ background: "#0d0d0d" }}>
                {["Nombre y Apellido", "Sede", "Fecha de Alta", "Profesor a cargo", ""].map(h => (
                  <th key={h} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", padding: "13px 18px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alumnosFiltrados.length === 0
                ? <tr><td colSpan={5} style={{ padding: "40px 18px", textAlign: "center", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)" }}>No se encontraron alumnos</td></tr>
                : alumnosFiltrados.map(a => {
                  const prof = profesores.find(p => p.id === a.profesorId);
                  return (
                    <tr key={a.id} className="tabla-tr" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.15s" }} onClick={() => setPerfilModal(a)}>
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                            {a.foto ? <img src={a.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                          </div>
                          <div>
                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: "white", margin: 0 }}>{a.nombre} {a.apellido || ""}</p>
                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 18px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: a.sede ? "#00b4d8" : "rgba(255,255,255,0.25)" }}>{a.sede || "—"}</td>
                      <td style={{ padding: "14px 18px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{a.fechaAlta || "—"}</td>
                      <td style={{ padding: "14px 18px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{prof?.nombre || "Sin asignar"}</td>
                      <td style={{ padding: "14px 18px" }}><span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8" }}>Ver perfil →</span></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 12 }}>Mostrando {alumnosFiltrados.length} de {alumnos.length} alumnos</p>
      </div>

      {/* MODAL NUEVO ALUMNO */}
      {modalNuevo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setModalNuevo(false)}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 2, color: "white" }}>Nuevo Alumno</span>
              <button onClick={() => setModalNuevo(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="modal-form-grid">
                {[["Nombre *", "nombre"], ["Apellido", "apellido"], ["DNI", "dni"]].map(([l, k]) => (
                  <div key={k}>
                    <label style={lbl}>{l}</label>
                    <input style={inp} placeholder={l.replace(" *", "")} value={form[k]} onChange={e => setFormField(k, e.target.value)} />
                  </div>
                ))}
                <div>
                  <label style={lbl}>Fecha de Nacimiento</label>
                  <input style={inp} type="date" value={form.nacimiento} onChange={e => setFormField("nacimiento", e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Edad (calculada)</label>
                  <input style={{ ...inp, opacity: 0.6 }} value={form.edad ? `${form.edad} años` : "—"} readOnly />
                </div>
              </div>
              <div>
                <label style={lbl}>Email *</label>
                <input style={inp} type="email" placeholder="correo@email.com" value={form.email} onChange={e => setFormField("email", e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Contraseña *</label>
                <input style={inp} type="text" placeholder="Contraseña visible" value={form.pass} onChange={e => setFormField("pass", e.target.value)} />
              </div>
              <div className="modal-form-grid">
                <div>
                  <label style={lbl}>Sede *</label>
                  <select style={inp} value={form.sede} onChange={e => setFormField("sede", e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="Edison">Edison</option>
                    <option value="Moreno">Moreno</option>
                    <option value="GSM">General San Martín</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Profesor *</label>
                  <select style={inp} value={form.profesorId} onChange={e => setFormField("profesorId", e.target.value)}>
                    <option value="">Seleccionar</option>
                    {profesores.filter(p => !form.sede || p.sedes?.includes(form.sede)).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>* La fecha de alta se registra automáticamente al crear.</p>
              <button onClick={crearAlumno} disabled={creando}
                style={{ background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "14px", fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 700, cursor: creando ? "not-allowed" : "pointer", opacity: creando ? 0.6 : 1, marginTop: 4 }}>
                {creando ? "Creando..." : "Crear alumno →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {perfilModal && <PerfilModal alumno={perfilModal} profesores={profesores} onClose={() => setPerfilModal(null)} onGuardar={guardarEdicion} onEliminar={eliminarAlumno} />}

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