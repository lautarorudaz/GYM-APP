import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { crearNotificacion } from "../../utils/notificaciones";



export default function ProfesorDashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [vista, setVista] = useState("alumnos");
  const [alumnos, setAlumnos] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [miDoc, setMiDoc] = useState(null);

  // Form rutina
  const [nombreRutina, setNombreRutina] = useState("");
  const [descripcion, setDescripcion] = useState([{ ejercicio: "", series: "", repeticiones: "" }]);
  const [editRutina, setEditRutina] = useState(null);

  const cargarMiDoc = async () => {
    const snap = await getDocs(query(collection(db, "usuarios"), where("uid", "==", usuario.uid)));
    if (!snap.empty) setMiDoc({ id: snap.docs[0].id, ...snap.docs[0].data() });
  };

  const cargarAlumnos = async (profDocId) => {
    const snap = await getDocs(query(collection(db, "usuarios"), where("profesorId", "==", profDocId)));
    setAlumnos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarRutinas = async (profDocId) => {
    const snap = await getDocs(query(collection(db, "rutinas"), where("profesorId", "==", profDocId)));
    setRutinas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cargarComentarios = async (profDocId) => {
    const snap = await getDocs(query(collection(db, "comentarios"), where("profesorId", "==", profDocId)));
    setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    if (usuario) cargarMiDoc();
  }, [usuario]);

  useEffect(() => {
    if (miDoc) {
      cargarAlumnos(miDoc.id);
      cargarRutinas(miDoc.id);
      cargarComentarios(miDoc.id);
      cargarNotificaciones(miDoc.id);
    }
  }, [miDoc]);

  const agregarEjercicio = () => setDescripcion([...descripcion, { ejercicio: "", series: "", repeticiones: "" }]);
  const updateEjercicio = (i, campo, valor) => {
    const nueva = [...descripcion];
    nueva[i][campo] = valor;
    setDescripcion(nueva);
  };

const guardarRutina = async () => {
  if (!nombreRutina) return alert("Ponele un nombre a la rutina");
  await addDoc(collection(db, "rutinas"), {
    nombre: nombreRutina,
    ejercicios: descripcion,
    profesorId: miDoc.id
  });
  const adminId = await obtenerAdminId();
  if (adminId) {
    await crearNotificacion({
      usuarioId: adminId,
      mensaje: `${miDoc.nombre} creó una nueva rutina: "${nombreRutina}"`,
      tipo: "actividad_profesor"
    });
  }
  setNombreRutina("");
  setDescripcion([{ ejercicio: "", series: "", repeticiones: "" }]);
  cargarRutinas(miDoc.id);
  alert("Rutina guardada!");
};



const [filtroSede, setFiltroSede] = useState("Todos");


const eliminarRutina = async (id) => {
  if (!window.confirm("¿Eliminar rutina?")) return;
  const rutina = rutinas.find(r => r.id === id);
  await deleteDoc(doc(db, "rutinas", id));
  const adminId = await obtenerAdminId();
  if (adminId) {
    await crearNotificacion({
      usuarioId: adminId,
      mensaje: `${miDoc.nombre} eliminó la rutina: "${rutina?.nombre}"`,
      tipo: "actividad_profesor"
    });
  }
  cargarRutinas(miDoc.id);
};






  const guardarEdicion = async () => {
  await updateDoc(doc(db, "rutinas", editRutina.id), {
    nombre: editRutina.nombre,
    ejercicios: editRutina.ejercicios
  });
  const adminId = await obtenerAdminId();
  if (adminId) {
    await crearNotificacion({
      usuarioId: adminId,
      mensaje: `${miDoc.nombre} editó la rutina: "${editRutina.nombre}"`,
      tipo: "actividad_profesor"
    });
  }
  setEditRutina(null);
  cargarRutinas(miDoc.id);
};






const asignarRutina = async (rutinaId, alumnoId, alumnoNombre) => {
  await updateDoc(doc(db, "usuarios", alumnoId), { rutinaId });
  const rutina = rutinas.find(r => r.id === rutinaId);
  const adminId = await obtenerAdminId();
  if (adminId) {
    await crearNotificacion({
      usuarioId: adminId,
      mensaje: `${miDoc.nombre} asignó la rutina "${rutina?.nombre}" al alumno ${alumnoNombre}`,
      tipo: "actividad_profesor"
    });
  }
  alert("Rutina asignada!");
};

  const cerrarSesion = async () => {
    await signOut(auth);
    navigate("/");
  };

  const [notificaciones, setNotificaciones] = useState([]);

const cargarNotificaciones = async (profDocId) => {
  const snap = await getDocs(query(
    collection(db, "notificaciones"),
    where("usuarioId", "==", profDocId)
  ));
  const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  notifs.sort((a, b) => b.fecha.localeCompare(a.fecha));
  setNotificaciones(notifs);
};

const marcarLeida = async (id) => {
  await updateDoc(doc(db, "notificaciones", id), { leida: true });
  cargarNotificaciones(miDoc.id);
};

const marcarTodasLeidas = async () => {
  const noLeidas = notificaciones.filter(n => !n.leida);
  await Promise.all(noLeidas.map(n => updateDoc(doc(db, "notificaciones", n.id), { leida: true })));
  cargarNotificaciones(miDoc.id);
};


const obtenerAdminId = async () => {
  const snap = await getDocs(query(collection(db, "usuarios"), where("rol", "==", "admin")));
  if (!snap.empty) return snap.docs[0].id;
  return null;
};

  const s = {
    container: { fontFamily: "sans-serif", padding: "20px", maxWidth: "900px", margin: "0 auto" },
    nav: { display: "flex", gap: "10px", marginBottom: "24px" },
    btn: { padding: "8px 16px", cursor: "pointer", borderRadius: "6px", border: "none", background: "#3b82f6", color: "white", fontWeight: "bold" },
    btnGris: { padding: "8px 16px", cursor: "pointer", borderRadius: "6px", border: "none", background: "#374151", color: "white" },
    btnRojo: { padding: "6px 12px", cursor: "pointer", borderRadius: "6px", border: "none", background: "#ef4444", color: "white" },
    btnVerde: { padding: "6px 12px", cursor: "pointer", borderRadius: "6px", border: "none", background: "#22c55e", color: "white" },
    input: { padding: "8px", borderRadius: "6px", border: "1px solid #ccc", width: "100%", boxSizing: "border-box" },
    card: { background: "#1f2937", color: "white", padding: "16px", borderRadius: "8px", marginBottom: "10px" },
    form: { display: "flex", flexDirection: "column", gap: "10px", maxWidth: "500px", marginBottom: "24px" },
    titulo: { color: "#3b82f6", marginBottom: "16px" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={{ color: "#3b82f6" }}>Panel del Profesor 💪</h1>
        <button style={s.btnRojo} onClick={cerrarSesion}>Cerrar Sesión</button>
        <button style={vista === "notificaciones" ? s.btn : s.btnGris} onClick={() => setVista("notificaciones")}>
  🔔 Notificaciones {notificaciones.filter(n => !n.leida).length > 0 && (
    <span style={{ background: "#ef4444", borderRadius: "50%", padding: "2px 7px", marginLeft: "6px", fontSize: "12px" }}>
      {notificaciones.filter(n => !n.leida).length}
    </span>
  )}
</button>
      </div>

      <div style={s.nav}>
        <button style={vista === "alumnos" ? s.btn : s.btnGris} onClick={() => setVista("alumnos")}>Mis Alumnos</button>
        <button style={vista === "rutinas" ? s.btn : s.btnGris} onClick={() => setVista("rutinas")}>Rutinas</button>
        <button style={vista === "comentarios" ? s.btn : s.btnGris} onClick={() => setVista("comentarios")}>Comentarios</button>
      </div>

    {vista === "notificaciones" && (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h2 style={s.titulo}>🔔 Notificaciones</h2>
      {notificaciones.some(n => !n.leida) && (
        <button style={s.btnGris} onClick={marcarTodasLeidas}>Marcar todas como leídas</button>
      )}
    </div>
    {notificaciones.length === 0 && <p style={{ color: "#9ca3af" }}>No tenés notificaciones.</p>}
    {notificaciones.map(n => (
      <div key={n.id} style={{ ...s.card, borderLeft: n.leida ? "4px solid #374151" : "4px solid #3b82f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontWeight: n.leida ? "normal" : "bold" }}>{n.mensaje}</p>
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: "4px 0 0" }}>{n.fecha}</p>
        </div>
        {!n.leida && (
          <button style={s.btnGris} onClick={() => marcarLeida(n.id)}>✓ Leída</button>
        )}
      </div>
    ))}
  </div>
)}


      {vista === "alumnos" && (
        <div>
          <h2 style={s.titulo}>Mis Alumnos</h2>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
  {["Todos", "Edison", "Moreno", "GSM"].map(sede => (
    <button
      key={sede}
      style={filtroSede === sede ? s.btn : s.btnGris}
      onClick={() => setFiltroSede(sede)}
    >
      {sede === "GSM" ? "General San Martín" : sede}
    </button>
  ))}
</div>

          {alumnos.length === 0 && <p style={{ color: "#9ca3af" }}>No tenés alumnos asignados aún.</p>}
          
          {alumnos
             .filter(a => filtroSede === "Todos" || a.sede === filtroSede)
             .map(a => (
            
            <div key={a.id} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontWeight: "bold", margin: 0 }}>{a.nombre}</p>
                  <p style={{ color: "#9ca3af", margin: 0 }}>{a.email}</p>
                </div>
                <select style={{ ...s.input, width: "200px" }} onChange={e => asignarRutina(e.target.value, a.id, a.nombre)} defaultValue={a.rutinaId || ""}>
                  <option value="">Asignar rutina</option>
                  {rutinas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {vista === "rutinas" && (
        <div>
          <h2 style={s.titulo}>Crear Rutina</h2>
          <div style={s.form}>
            <input style={s.input} placeholder="Nombre de la rutina" value={nombreRutina} onChange={e => setNombreRutina(e.target.value)} />
            {descripcion.map((ej, i) => (
              <div key={i} style={{ display: "flex", gap: "8px" }}>
                <input style={s.input} placeholder="Ejercicio" value={ej.ejercicio} onChange={e => updateEjercicio(i, "ejercicio", e.target.value)} />
                <input style={{ ...s.input, width: "80px" }} placeholder="Series" value={ej.series} onChange={e => updateEjercicio(i, "series", e.target.value)} />
                <input style={{ ...s.input, width: "100px" }} placeholder="Reps" value={ej.repeticiones} onChange={e => updateEjercicio(i, "repeticiones", e.target.value)} />
              </div>
            ))}
            <button style={s.btnGris} onClick={agregarEjercicio}>+ Agregar ejercicio</button>
            <button style={s.btn} onClick={guardarRutina}>Guardar Rutina</button>
          </div>

          <h2 style={s.titulo}>Mis Rutinas</h2>
          {rutinas.length === 0 && <p style={{ color: "#9ca3af" }}>No tenés rutinas creadas aún.</p>}
          {rutinas.map(r => (
            <div key={r.id} style={s.card}>
              {editRutina?.id === r.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input style={s.input} value={editRutina.nombre} onChange={e => setEditRutina({ ...editRutina, nombre: e.target.value })} />
                  {editRutina.ejercicios.map((ej, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px" }}>
                      <input style={s.input} value={ej.ejercicio} onChange={e => { const ejs = [...editRutina.ejercicios]; ejs[i].ejercicio = e.target.value; setEditRutina({ ...editRutina, ejercicios: ejs }); }} />
                      <input style={{ ...s.input, width: "80px" }} value={ej.series} onChange={e => { const ejs = [...editRutina.ejercicios]; ejs[i].series = e.target.value; setEditRutina({ ...editRutina, ejercicios: ejs }); }} />
                      <input style={{ ...s.input, width: "100px" }} value={ej.repeticiones} onChange={e => { const ejs = [...editRutina.ejercicios]; ejs[i].repeticiones = e.target.value; setEditRutina({ ...editRutina, ejercicios: ejs }); }} />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button style={s.btnVerde} onClick={guardarEdicion}>Guardar</button>
                    <button style={s.btnGris} onClick={() => setEditRutina(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontWeight: "bold", margin: 0 }}>{r.nombre}</p>
                    <p style={{ color: "#9ca3af", margin: "4px 0 0" }}>{r.ejercicios?.length} ejercicios</p>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button style={s.btnVerde} onClick={() => setEditRutina(r)}>Editar</button>
                    <button style={s.btnRojo} onClick={() => eliminarRutina(r.id)}>Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {vista === "comentarios" && (
        <div>
          <h2 style={s.titulo}>Comentarios de Alumnos</h2>
          {comentarios.length === 0 && <p style={{ color: "#9ca3af" }}>No tenés comentarios aún.</p>}
          {comentarios.map(c => (
            <div key={c.id} style={s.card}>
              <p style={{ fontWeight: "bold", margin: "0 0 4px" }}>{c.alumnoNombre}</p>
              <p style={{ margin: 0 }}>{c.mensaje}</p>
              <p style={{ color: "#9ca3af", fontSize: "12px", margin: "8px 0 0" }}>{c.fecha}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}