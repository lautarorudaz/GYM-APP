import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, authSecundaria } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { crearNotificacion } from "../../utils/notificaciones";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return "";
  const edad = Math.floor((new Date() - new Date(fechaNac)) / (365.25 * 24 * 60 * 60 * 1000));
  return isNaN(edad) ? "" : String(edad);
};

// ── Perfil Modal ─────────────────────────────────────────────
function PerfilModal({ alumno, profesores, onClose, onGuardar, onEliminar }) {
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({ ...alumno });
  const [guardando, setGuardando] = useState(false);

  const profNombre = profesores.find(p => p.id === alumno.profesorId)?.nombre || "Sin asignar";

  const setDato = (key, val) => {
    if (key === "nacimiento") {
      setDatos(d => ({ ...d, nacimiento: val, edad: calcularEdad(val) }));
    } else {
      setDatos(d => ({ ...d, [key]: val }));
    }
  };

  const guardar = async () => {
    setGuardando(true);
    await onGuardar(datos);
    setGuardando(false);
    setEditando(false);
  };

  const labelStyle = { fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6, display: "block" };
  const inputStyle = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,180,216,0.4)", borderRadius: 10, padding: "10px 14px", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none" };
  const readStyle  = { ...inputStyle, border: "1px solid rgba(255,255,255,0.07)", opacity: 0.7 };

  const campo = (label, key, tipo = "text", opciones = null, readOnly = false) => (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {!editando ? (
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: datos[key] ? "white" : "rgba(255,255,255,0.2)", fontStyle: datos[key] ? "normal" : "italic" }}>
          {key === "profesorId" ? profNombre : (datos[key] || "Sin cargar")}
        </p>
      ) : readOnly ? (
        <input style={readStyle} value={datos[key] ? `${datos[key]} años` : "—"} readOnly />
      ) : opciones ? (
        <select value={datos[key] || ""} onChange={e => setDato(key, e.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}>
          {opciones.map(o => <option key={o.v} value={o.v} style={{ background: "#111" }}>{o.l}</option>)}
        </select>
      ) : (
        <input type={tipo} value={datos[key] || ""} onChange={e => setDato(key, e.target.value)} style={inputStyle} />
      )}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.2s ease" }}
        onClick={e => e.stopPropagation()}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              {alumno.foto ? <img src={alumno.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
            </div>
            <div>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: 1, color: "white" }}>{alumno.nombre} {alumno.apellido || ""}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{alumno.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            {campo("Nombre",       "nombre")}
            {campo("Apellido",     "apellido")}
            {campo("DNI",          "dni")}
            {campo("Nacimiento",   "nacimiento", "date")}
            {campo("Edad",         "edad", "text", null, true)}
            {campo("Sede",         "sede", "text", [
              { v: "",       l: "Seleccionar sede" },
              { v: "Edison", l: "Edison" },
              { v: "Moreno", l: "Moreno" },
              { v: "GSM",    l: "General San Martín" }
            ])}
            {campo("Fecha de alta","fechaAlta")}
            {campo("Profesor",     "profesorId", "text", [
              { v: "", l: "Seleccionar profesor" },
              ...profesores
                .filter(p => !datos.sede || p.sedes?.includes(datos.sede))
                .map(p => ({ v: p.id, l: p.nombre }))
            ])}
          </div>

          {/* Credenciales */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px", marginTop: 4 }}>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>🔐 Credenciales</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "white", marginBottom: 6 }}>{alumno.email}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Contraseña: {alumno.passVisible || "••••••••"}</p>
          </div>

          {/* Botones */}
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            {editando ? (
              <>
                <button onClick={guardar} disabled={guardando}
                  style={{ flex: 1, background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: guardando ? 0.6 : 1 }}>
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
                <button onClick={() => { setEditando(false); setDatos({ ...alumno }); }}
                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer" }}>
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditando(true)}
                  style={{ flex: 1, background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  ✏️ Editar
                </button>
                <button onClick={() => onEliminar(alumno.id)}
                  style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: 10, padding: "12px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, cursor: "pointer" }}>
                  Eliminar
                </button>
              </>
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
  const [alumnos, setAlumnos]       = useState([]);
  const [rutinas, setRutinas]       = useState([]);
  const [filtroBusq, setFiltroBusq] = useState("");
  const [filtroSede, setFiltroSede] = useState("");
  const [filtroProf, setFiltroProf] = useState("");
  const [perfilModal, setPerfilModal] = useState(null);
  const [modalNuevo, setModalNuevo]   = useState(false);
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", pass: "", sede: "", profesorId: "", dni: "", nacimiento: "", edad: "" });
  const [creando, setCreando] = useState(false);

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const snap = await getDocs(collection(db, "usuarios"));
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setProfesores(todos.filter(u => u.rol === "profesor"));
    setAlumnos(todos.filter(u => u.rol === "alumno"));
    const rutSnap = await getDocs(collection(db, "rutinas"));
    setRutinas(rutSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const setFormField = (key, val) => {
    if (key === "nacimiento") {
      setForm(f => ({ ...f, nacimiento: val, edad: calcularEdad(val) }));
    } else {
      setForm(f => ({ ...f, [key]: val }));
    }
  };

  const crearAlumno = async () => {
    if (!form.nombre || !form.email || !form.pass || !form.sede || !form.profesorId)
      return alert("Completá nombre, email, contraseña, sede y profesor");
    setCreando(true);
    try {
      const cred = await createUserWithEmailAndPassword(authSecundaria, form.email, form.pass);
      await addDoc(collection(db, "usuarios"), {
        uid: cred.user.uid,
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        passVisible: form.pass,
        dni: form.dni,
        nacimiento: form.nacimiento,
        edad: form.edad,
        rol: "alumno",
        profesorId: form.profesorId,
        sede: form.sede,
        fechaAlta: new Date().toLocaleDateString("es-AR")
      });
      await crearNotificacion({
        usuarioId: form.profesorId,
        mensaje: `Se te asignó un nuevo alumno: ${form.nombre} ${form.apellido} (${form.sede})`,
        tipo: "nuevo_alumno"
      });
      setForm({ nombre: "", apellido: "", email: "", pass: "", sede: "", profesorId: "", dni: "", nacimiento: "", edad: "" });
      setModalNuevo(false);
      cargarDatos();
    } catch(e) { alert("Error: " + e.message); }
    setCreando(false);
  };

  const guardarEdicion = async (datos) => {
    const anterior = alumnos.find(a => a.id === datos.id);
    await updateDoc(doc(db, "usuarios", datos.id), {
      nombre:     datos.nombre     || "",
      apellido:   datos.apellido   || "",
      dni:        datos.dni        || "",
      nacimiento: datos.nacimiento || "",
      edad:       datos.edad       || "",
      sede:       datos.sede       || "",
      profesorId: datos.profesorId || "",
      fechaAlta:  datos.fechaAlta  || ""
    });
    if (anterior.profesorId !== datos.profesorId && datos.profesorId) {
      await crearNotificacion({
        usuarioId: datos.profesorId,
        mensaje: `Se te asignó un nuevo alumno: ${datos.nombre} (${datos.sede})`,
        tipo: "nuevo_alumno"
      });
    }
    setPerfilModal(null);
    cargarDatos();
  };

  const eliminarAlumno = async (id) => {
    if (!window.confirm("¿Eliminar alumno?")) return;
    await deleteDoc(doc(db, "usuarios", id));
    setPerfilModal(null);
    cargarDatos();
  };

  const alumnosFiltrados = alumnos.filter(a => {
    const nombreCompleto = `${a.nombre || ""} ${a.apellido || ""}`.toLowerCase();
    const busq = filtroBusq.toLowerCase();
    const matchBusq = !busq || nombreCompleto.includes(busq) || (a.dni || "").includes(busq);
    const matchSede = !filtroSede || a.sede === filtroSede;
    const matchProf = !filtroProf || a.profesorId === filtroProf;
    return matchBusq && matchSede && matchProf;
  });

  const totalEdison = alumnos.filter(a => a.sede === "Edison").length;
  const totalMoreno = alumnos.filter(a => a.sede === "Moreno").length;
  const totalGSM    = alumnos.filter(a => a.sede === "GSM").length;

  const inputStyle = { width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "white", fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none" };
  const labelStyle = { fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 7, display: "block" };

  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        input::placeholder{color:rgba(255,255,255,0.2)}
        select option{background:#1a1a1a;color:white}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.4}
        .tabla-tr:hover{background:rgba(255,255,255,0.03) !important}
      `}</style>

      {/* TOPBAR */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,10,10,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 40px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 3, color: "#00b4d8", cursor: "pointer" }} onClick={() => navigate("/admin")}>AnimaApp</span>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>/</span>
          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Alumnos</span>
        </div>
        <button onClick={() => navigate("/admin")}
          style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)", padding: "8px 18px", borderRadius: 20, cursor: "pointer" }}>
          ← Volver al panel
        </button>
      </div>

      <div style={{ padding: "90px 40px 60px", maxWidth: 1200, margin: "0 auto" }}>

        {/* STATS */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>resumen</p>
          <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: 2, color: "white", marginBottom: 24 }}>Alumnos</h1>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[
              { label: "Alumnos Generales", val: alumnos.length, accent: true },
              { label: "Alumnos Edison",    val: totalEdison },
              { label: "Alumnos Moreno",    val: totalMoreno },
              { label: "Alumnos GSM",       val: totalGSM },
              { label: "Rutinas Totales",   val: rutinas.length },
            ].map(s => (
              <div key={s.label} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 24px", minWidth: 140, flex: 1 }}>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, color: s.accent ? "#00b4d8" : "white", lineHeight: 1, marginBottom: 4 }}>{s.val}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FILTROS + BOTÓN */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={labelStyle}>Buscar por nombre, apellido o DNI</label>
            <input style={inputStyle} placeholder="Ej: Juan Pérez o 12345678" value={filtroBusq} onChange={e => setFiltroBusq(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={labelStyle}>Sede</label>
            <select style={inputStyle} value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
              <option value="">Todas</option>
              <option value="Edison">Edison</option>
              <option value="Moreno">Moreno</option>
              <option value="GSM">General San Martín</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>Profesor</label>
            <select style={inputStyle} value={filtroProf} onChange={e => setFiltroProf(e.target.value)}>
              <option value="">Todos</option>
              {profesores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <button onClick={() => setModalNuevo(true)}
            style={{ background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "11px 24px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            + Nuevo alumno
          </button>
        </div>

        {/* TABLA */}
        <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#0d0d0d" }}>
                {["Nombre y Apellido", "Sede", "Fecha de Alta", "Profesor a cargo", ""].map(h => (
                  <th key={h} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", padding: "14px 20px", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alumnosFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "48px 20px", textAlign: "center", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)" }}>No se encontraron alumnos con esos filtros</td></tr>
              ) : alumnosFiltrados.map(a => {
                const prof = profesores.find(p => p.id === a.profesorId);
                return (
                  <tr key={a.id} className="tabla-tr"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.15s" }}
                    onClick={() => setPerfilModal(a)}>
                    <td style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                          {a.foto ? <img src={a.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                        </div>
                        <div>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, color: "white", margin: 0 }}>{a.nombre} {a.apellido || ""}</p>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "2px 0 0" }}>{a.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "16px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: a.sede ? "#00b4d8" : "rgba(255,255,255,0.25)" }}>{a.sede || "—"}</td>
                    <td style={{ padding: "16px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{a.fechaAlta || "—"}</td>
                    <td style={{ padding: "16px 20px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{prof?.nombre || "Sin asignar"}</td>
                    <td style={{ padding: "16px 20px" }}>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8" }}>Ver perfil →</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 14 }}>
          Mostrando {alumnosFiltrados.length} de {alumnos.length} alumnos
        </p>
      </div>

      {/* MODAL NUEVO ALUMNO */}
      {modalNuevo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setModalNuevo(false)}>
          <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 2, color: "white" }}>Nuevo Alumno</span>
              <button onClick={() => setModalNuevo(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[["Nombre *", "nombre"], ["Apellido", "apellido"], ["DNI", "dni"]].map(([l, k]) => (
                  <div key={k}>
                    <label style={labelStyle}>{l}</label>
                    <input style={inputStyle} placeholder={l.replace(" *", "")} value={form[k]} onChange={e => setFormField(k, e.target.value)} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Fecha de Nacimiento</label>
                  <input style={inputStyle} type="date" value={form.nacimiento} onChange={e => setFormField("nacimiento", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Edad (calculada)</label>
                  <input style={{ ...inputStyle, opacity: 0.6 }} value={form.edad ? `${form.edad} años` : "—"} readOnly />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} type="email" placeholder="correo@email.com" value={form.email} onChange={e => setFormField("email", e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Contraseña *</label>
                <input style={inputStyle} type="text" placeholder="Contraseña visible" value={form.pass} onChange={e => setFormField("pass", e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Sede *</label>
                  <select style={inputStyle} value={form.sede} onChange={e => setFormField("sede", e.target.value)}>
                    <option value="">Seleccionar</option>
                    <option value="Edison">Edison</option>
                    <option value="Moreno">Moreno</option>
                    <option value="GSM">General San Martín</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Profesor *</label>
                  <select style={inputStyle} value={form.profesorId} onChange={e => setFormField("profesorId", e.target.value)}>
                    <option value="">Seleccionar</option>
                    {profesores.filter(p => !form.sede || p.sedes?.includes(form.sede)).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.6, marginTop: 4 }}>
                * La fecha de alta se registra automáticamente al crear.
              </p>

              <button onClick={crearAlumno} disabled={creando}
                style={{ background: "#00b4d8", color: "#03045e", border: "none", borderRadius: 10, padding: "14px", fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 700, cursor: creando ? "not-allowed" : "pointer", opacity: creando ? 0.6 : 1, marginTop: 4 }}>
                {creando ? "Creando..." : "Crear alumno →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERFIL MODAL */}
      {perfilModal && (
        <PerfilModal
          alumno={perfilModal}
          profesores={profesores}
          onClose={() => setPerfilModal(null)}
          onGuardar={guardarEdicion}
          onEliminar={eliminarAlumno}
        />
      )}
    </div>
  );
}