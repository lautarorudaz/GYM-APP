import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth, authSecundaria, storage } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { crearNotificacion } from "../../utils/notificaciones";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return "";
  const edad = Math.floor((new Date() - new Date(fechaNac)) / (365.25 * 24 * 60 * 60 * 1000));
  return isNaN(edad) ? "" : String(edad);
};

// ── Modal perfil/edición profesor ───────────────────────────
function PerfilProfesorModal({ profesor, alumnos, comentarios, onClose, onGuardar, onEliminar }) {
  const [tab, setTab]           = useState("datos");
  const [editando, setEditando] = useState(false);
  const [datos, setDatos]       = useState({ ...profesor });
  const [guardando, setGuardando] = useState(false);
  const [editFoto, setEditFoto] = useState(null);

  const alumnosDelProfe = alumnos.filter(a => a.profesorId === profesor.id);
  const comsDelProfe    = comentarios.filter(c => c.profesorId === profesor.id);
  const likes    = alumnosDelProfe.filter(a => a.reaccionProfesor === "like").length;
  const dislikes = alumnosDelProfe.filter(a => a.reaccionProfesor === "dislike").length;

  const setDato = (key, val) => {
    if (key === "nacimiento") setDatos(d => ({ ...d, nacimiento: val, edad: calcularEdad(val) }));
    else setDatos(d => ({ ...d, [key]: val }));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      let fotoUrl = datos.foto || "";
      if (editFoto) {
        const storageRef = ref(storage, `fotos/profesores/${profesor.id}`);
        await uploadBytes(storageRef, editFoto);
        fotoUrl = await getDownloadURL(storageRef);
      }
      await onGuardar({ ...datos, foto: fotoUrl });
      setEditando(false); setEditFoto(null);
    } catch(e) { alert("Error: " + e.message); }
    setGuardando(false);
  };

  const ls = { fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:3, textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:6, display:"block" };
  const is = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(0,180,216,0.4)", borderRadius:10, padding:"10px 14px", color:"white", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none" };
  const rs = { ...is, border:"1px solid rgba(255,255,255,0.07)", opacity:0.6 };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
      onClick={onClose}>
      <div style={{background:"#111",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto",animation:"slideUp 0.2s ease"}}
        onClick={e=>e.stopPropagation()}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* Header */}
        <div style={{padding:"24px 28px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:60,height:60,borderRadius:14,background:"#1a1a1a",border:"1px solid rgba(255,255,255,0.1)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>
              {editFoto ? <img src={URL.createObjectURL(editFoto)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                : datos.foto ? <img src={datos.foto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                : "👤"}
            </div>
            <div>
              <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,color:"white",lineHeight:1}}>{datos.nombre} {datos.apellido||""}</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"rgba(255,255,255,0.35)",marginTop:3}}>{datos.email}</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#00b4d8",marginTop:2}}>{datos.sedes?.join(" · ")}</p>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.4)",fontSize:24,cursor:"pointer",marginTop:-4}}>×</button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.07)",margin:"20px 0 0",padding:"0 28px"}}>
          {[["datos","Datos"],["alumnos",`Alumnos (${alumnosDelProfe.length})`],["feedback","Feedback"]].map(([v,l])=>(
            <button key={v} onClick={()=>setTab(v)}
              style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,background:"none",border:"none",color:tab===v?"#00b4d8":"rgba(255,255,255,0.4)",padding:"10px 16px",cursor:"pointer",position:"relative"}}>
              {l}
              {tab===v && <span style={{position:"absolute",bottom:-1,left:0,right:0,height:2,background:"#00b4d8",display:"block"}} />}
            </button>
          ))}
        </div>

        <div style={{padding:"24px 28px"}}>

          {/* TAB DATOS */}
          {tab==="datos" && (
            <>
              {editando && (
                <div style={{marginBottom:20}}>
                  <label style={ls}>Foto</label>
                  <label style={{border:"2px dashed rgba(255,255,255,0.1)",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:"rgba(255,255,255,0.02)"}}>
                    <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"rgba(255,255,255,0.35)"}}>
                      {editFoto ? editFoto.name : "Cambiar foto — click para subir"}
                    </span>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])setEditFoto(e.target.files[0]);}} />
                  </label>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
                {[
                  ["Nombre","nombre"],["Apellido","apellido"],
                  ["DNI","dni"],["Nacimiento","nacimiento","date"],
                  ["Edad","edad",null,true],
                  ["Fecha de alta","fechaAlta"],
                ].map(([label,key,tipo,readOnly])=>(
                  <div key={key} style={{marginBottom:18}}>
                    <label style={ls}>{label}</label>
                    {editando ? (
                      readOnly
                        ? <input style={rs} value={datos[key]?`${datos[key]} años`:"—"} readOnly />
                        : <input type={tipo||"text"} value={datos[key]||""} onChange={e=>setDato(key,e.target.value)} style={is} />
                    ) : (
                      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:15,color:datos[key]?"white":"rgba(255,255,255,0.2)",fontStyle:datos[key]?"normal":"italic"}}>
                        {datos[key]||"Sin cargar"}
                      </p>
                    )}
                  </div>
                ))}
                <div style={{marginBottom:18}}>
                  <label style={ls}>Sedes</label>
                  {editando ? (
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",paddingTop:4}}>
                      {["Edison","Moreno","GSM"].map(sede=>(
                        <label key={sede} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:datos.sedes?.includes(sede)?"#00b4d8":"rgba(255,255,255,0.5)"}}>
                          <input type="checkbox" checked={datos.sedes?.includes(sede)||false}
                            onChange={e=>{
                              const s=datos.sedes||[];
                              setDato("sedes",e.target.checked?[...s,sede]:s.filter(x=>x!==sede));
                            }} />
                          {sede==="GSM"?"Gral. San Martín":sede}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:15,color:"#00b4d8"}}>{datos.sedes?.join(", ")||"Sin sedes"}</p>
                  )}
                </div>
              </div>

              <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap"}}>
                {editando ? (
                  <>
                    <button onClick={guardar} disabled={guardando}
                      style={{flex:1,background:"#00b4d8",color:"#03045e",border:"none",borderRadius:10,padding:"12px 20px",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",opacity:guardando?0.6:1}}>
                      {guardando?"Guardando...":"Guardar cambios"}
                    </button>
                    <button onClick={()=>{setEditando(false);setDatos({...profesor});setEditFoto(null);}}
                      style={{background:"none",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.6)",borderRadius:10,padding:"12px 20px",fontFamily:"'DM Sans',sans-serif",fontSize:14,cursor:"pointer"}}>
                      Cancelar
                    </button>
                  </>
                ):(
                  <>
                    <button onClick={()=>setEditando(true)}
                      style={{flex:1,background:"#00b4d8",color:"#03045e",border:"none",borderRadius:10,padding:"12px 20px",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                      ✏️ Editar
                    </button>
                    <button onClick={()=>onEliminar(profesor.id)}
                      style={{background:"none",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",borderRadius:10,padding:"12px 20px",fontFamily:"'DM Sans',sans-serif",fontSize:14,cursor:"pointer"}}>
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {/* TAB ALUMNOS */}
          {tab==="alumnos" && (
            alumnosDelProfe.length===0
              ? <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"rgba(255,255,255,0.25)",textAlign:"center",padding:"32px 0"}}>Este profesor no tiene alumnos asignados.</p>
              : alumnosDelProfe.map(a=>(
                <div key={a.id} style={{background:"#1a1a1a",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"14px 18px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:36,height:36,borderRadius:8,background:"#222",border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {a.foto?<img src={a.foto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />:"👤"}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:500,color:"white",margin:0}}>{a.nombre} {a.apellido||""}</p>
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"rgba(255,255,255,0.3)",margin:"2px 0 0"}}>{a.sede||"Sin sede"} · Alta: {a.fechaAlta||"—"}</p>
                  </div>
                </div>
              ))
          )}

          {/* TAB FEEDBACK */}
          {tab==="feedback" && (
            <>
              <div style={{display:"flex",gap:14,marginBottom:24}}>
                <div style={{flex:1,background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)",borderRadius:14,padding:"18px 20px",textAlign:"center"}}>
                  <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:"#22c55e",lineHeight:1}}>👍 {likes}</p>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:2,textTransform:"uppercase",marginTop:4}}>Me gusta</p>
                </div>
                <div style={{flex:1,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:14,padding:"18px 20px",textAlign:"center"}}>
                  <p style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:"#ef4444",lineHeight:1}}>👎 {dislikes}</p>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:2,textTransform:"uppercase",marginTop:4}}>No me gusta</p>
                </div>
              </div>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,letterSpacing:3,textTransform:"uppercase",color:"rgba(255,255,255,0.3)",marginBottom:14}}>
                Comentarios ({comsDelProfe.length})
              </p>
              {comsDelProfe.length===0
                ? <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>Sin comentarios aún.</p>
                : comsDelProfe.map(c=>(
                  <div key={c.id} style={{background:"#1a1a1a",border:"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"14px 18px",marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,color:"#00b4d8"}}>{c.alumnoNombre||"Anónimo"}</p>
                      <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:"rgba(255,255,255,0.25)"}}>{c.fecha}</p>
                    </div>
                    <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"rgba(255,255,255,0.8)",lineHeight:1.6}}>{c.mensaje}</p>
                  </div>
                ))
              }
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
  const [profesores, setProfesores]   = useState([]);
  const [alumnos, setAlumnos]         = useState([]);
  const [rutinas, setRutinas]         = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [vista, setVista]             = useState("panel");
  const [notificaciones, setNotificaciones] = useState([]);

  // Filtros
  const [filtroBusq, setFiltroBusq] = useState("");
  const [filtroSede, setFiltroSede] = useState("");

  // Modal perfil profesor
  const [perfilModal, setPerfilModal] = useState(null);

  // Form nuevo profesor
  const [form, setForm] = useState({
    nombre:"", apellido:"", email:"", pass:"", sedes:[],
    dni:"", nacimiento:"", edad:"", foto:null, fotoPreview:null
  });
  const [subiendoFoto, setSubiendoFoto] = useState(false);

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

  const cerrarSesion = async () => { await signOut(auth); navigate("/"); };

  const setFormField = (key, val) => {
    if (key === "nacimiento") setForm(f => ({ ...f, nacimiento: val, edad: calcularEdad(val) }));
    else setForm(f => ({ ...f, [key]: val }));
  };

  const agregarProfesor = async () => {
    if (!form.nombre || !form.email || !form.pass) return alert("Completá nombre, email y contraseña");
    if (form.sedes.length === 0) return alert("Seleccioná al menos una sede");
    setSubiendoFoto(true);
    try {
      const cred = await createUserWithEmailAndPassword(authSecundaria, form.email, form.pass);
      let fotoUrl = "";
      if (form.foto) {
        const storageRef = ref(storage, `fotos/profesores/${cred.user.uid}`);
        await uploadBytes(storageRef, form.foto);
        fotoUrl = await getDownloadURL(storageRef);
      }
      await addDoc(collection(db, "usuarios"), {
        uid: cred.user.uid, nombre: form.nombre, apellido: form.apellido,
        email: form.email, rol: "profesor", sedes: form.sedes,
        dni: form.dni, nacimiento: form.nacimiento, edad: form.edad,
        fechaAlta: new Date().toLocaleDateString("es-AR"), foto: fotoUrl
      });
      setForm({ nombre:"", apellido:"", email:"", pass:"", sedes:[], dni:"", nacimiento:"", edad:"", foto:null, fotoPreview:null });
      cargarDatos();
    } catch(e) { alert("Error: " + e.message); }
    setSubiendoFoto(false);
  };

  const guardarEdicionModal = async (datos) => {
    await updateDoc(doc(db, "usuarios", datos.id), {
      nombre: datos.nombre||"", apellido: datos.apellido||"",
      dni: datos.dni||"", nacimiento: datos.nacimiento||"",
      edad: datos.edad||"", sedes: datos.sedes||[],
      fechaAlta: datos.fechaAlta||"", foto: datos.foto||""
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
    await Promise.all(notificaciones.filter(n=>!n.leida).map(n=>updateDoc(doc(db,"notificaciones",n.id),{leida:true})));
    cargarNotificaciones();
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const profesoresFiltrados = profesores.filter(p => {
    const nombre = `${p.nombre||""} ${p.apellido||""}`.toLowerCase();
    const matchBusq = !filtroBusq || nombre.includes(filtroBusq.toLowerCase()) || (p.dni||"").includes(filtroBusq);
    const matchSede = !filtroSede || p.sedes?.includes(filtroSede);
    return matchBusq && matchSede;
  });

  const inputStyle = { width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"11px 14px", color:"white", fontFamily:"'DM Sans',sans-serif", fontSize:14, outline:"none" };
  const labelStyle = { fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:2, textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:7, display:"block" };

  return (
    <div style={{ fontFamily:"'Bebas Neue',sans-serif", minHeight:"100vh", background:"#0a0a0a", color:"white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        input::placeholder{color:rgba(255,255,255,0.2)}
        select option{background:#1a1a1a;color:white}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:0.4}
        .nav-link{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.5);padding:8px 16px;border-radius:8px;cursor:pointer;border:none;background:none;transition:all 0.2s;white-space:nowrap}
        .nav-link:hover{color:white;background:rgba(255,255,255,0.05)}
        .nav-link.active{color:#00b4d8;background:rgba(0,180,216,0.08)}
        .foto-upload{border:2px dashed rgba(255,255,255,0.1);border-radius:12px;padding:20px;text-align:center;cursor:pointer;transition:border-color 0.2s;background:rgba(255,255,255,0.02)}
        .foto-upload:hover{border-color:rgba(0,180,216,0.4)}
        .prof-row:hover{background:rgba(255,255,255,0.025) !important}
      `}</style>

      {/* TOPBAR */}
      <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(10,10,10,0.95)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"0 40px", height:62, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:3, color:"#00b4d8" }}>AnimaApp</span>
        <div style={{ display:"flex", gap:4 }}>
          {[["panel","Panel"],["profesores","Profesores"],["notificaciones",`🔔 Actividad${noLeidas>0?` (${noLeidas})`:""}`]].map(([v,l])=>(
            <button key={v} className={`nav-link ${vista===v?"active":""}`} onClick={()=>setVista(v)}>{l}</button>
          ))}
          <button className="nav-link" onClick={()=>navigate("/admin/alumnos")}>Alumnos</button>
        </div>
        <button onClick={cerrarSesion} style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, background:"none", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", padding:"8px 18px", borderRadius:20, cursor:"pointer" }}>
          Cerrar sesión
        </button>
      </div>

      <div style={{ padding:"90px 40px 60px", maxWidth:1100, margin:"0 auto" }}>

        {/* ── PANEL ── */}
        {vista==="panel" && (
          <>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:4, textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:8 }}>resumen</p>
            <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, letterSpacing:2, marginBottom:32 }}>Panel Admin</h1>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginBottom:40 }}>
              {[
                { label:"Profesores activos", val:profesores.length },
                { label:"Alumnos activos",    val:alumnos.length, accent:true, link:"/admin/alumnos" },
                { label:"Rutinas totales",    val:rutinas.length },
              ].map(s=>(
                <div key={s.label} style={{ background:"#111", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"20px 28px", flex:1, minWidth:160, cursor:s.link?"pointer":"default" }}
                  onClick={()=>s.link&&navigate(s.link)}>
                  <p style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, color:s.accent?"#00b4d8":"white", lineHeight:1, marginBottom:4 }}>{s.val}</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"rgba(255,255,255,0.35)", letterSpacing:1, textTransform:"uppercase" }}>{s.label}</p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:3, textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:14 }}>Profesores</p>
            {profesores.map(p=>(
              <div key={p.id} style={{ background:"#111", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 20px", marginBottom:8, display:"flex", alignItems:"center", gap:14, cursor:"pointer" }}
                onClick={()=>setPerfilModal(p)}>
                <div style={{ width:40, height:40, borderRadius:10, background:"#1a1a1a", border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {p.foto?<img src={p.foto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />:<span style={{fontSize:18}}>👤</span>}
                </div>
                <div style={{flex:1}}>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:500, color:"white" }}>{p.nombre} {p.apellido||""}</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"rgba(255,255,255,0.3)" }}>{p.sedes?.join(" · ")}</p>
                </div>
                <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#00b4d8" }}>Ver perfil →</span>
              </div>
            ))}
            <button onClick={()=>navigate("/admin/alumnos")}
              style={{ marginTop:24, background:"none", border:"1px solid rgba(0,180,216,0.3)", color:"#00b4d8", fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:600, padding:"12px 24px", borderRadius:10, cursor:"pointer" }}>
              Ver todos los alumnos →
            </button>
          </>
        )}

        {/* ── PROFESORES ── */}
        {vista==="profesores" && (
          <>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:4, textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:8 }}>gestión</p>
            <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, letterSpacing:2, marginBottom:32 }}>Profesores</h1>

            {/* FORM NUEVO */}
            <div style={{ background:"#111", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:28, marginBottom:32 }}>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:3, textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:20 }}>Nuevo profesor</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                {[["Nombre *","nombre"],["Apellido","apellido"],["DNI","dni"],["Email *","email","email"],["Contraseña *","pass","text"]].map(([l,k,t])=>(
                  <div key={k}>
                    <label style={labelStyle}>{l}</label>
                    <input type={t||"text"} value={form[k]} onChange={e=>setFormField(k,e.target.value)} placeholder={l.replace(" *","")} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Fecha de Nacimiento</label>
                  <input type="date" value={form.nacimiento} onChange={e=>setFormField("nacimiento",e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Edad (calculada)</label>
                  <input style={{...inputStyle,opacity:0.6}} value={form.edad?`${form.edad} años`:"—"} readOnly />
                </div>
                <div>
                  <label style={labelStyle}>Sedes *</label>
                  <div style={{ display:"flex", gap:12, flexWrap:"wrap", paddingTop:4 }}>
                    {["Edison","Moreno","GSM"].map(sede=>(
                      <label key={sede} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:13, color:form.sedes.includes(sede)?"#00b4d8":"rgba(255,255,255,0.5)" }}>
                        <input type="checkbox" checked={form.sedes.includes(sede)}
                          onChange={e=>setFormField("sedes",e.target.checked?[...form.sedes,sede]:form.sedes.filter(s=>s!==sede))} />
                        {sede==="GSM"?"Gral. San Martín":sede}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:20 }}>
                <label style={labelStyle}>Foto del profesor</label>
                <label className="foto-upload" style={{ display:"block" }}>
                  {form.fotoPreview
                    ? <img src={form.fotoPreview} alt="" style={{ width:80, height:80, borderRadius:10, objectFit:"cover", margin:"0 auto", display:"block" }} />
                    : <><p style={{ fontSize:28, marginBottom:6 }}>📷</p><p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"rgba(255,255,255,0.3)" }}>Click para subir foto</p></>
                  }
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
                    const f=e.target.files[0];
                    if(f) setForm(prev=>({...prev,foto:f,fotoPreview:URL.createObjectURL(f)}));
                  }} />
                </label>
              </div>

              <button onClick={agregarProfesor} disabled={subiendoFoto}
                style={{ background:"#00b4d8", color:"#03045e", border:"none", borderRadius:10, padding:"12px 28px", fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:700, cursor:subiendoFoto?"not-allowed":"pointer", opacity:subiendoFoto?0.6:1 }}>
                {subiendoFoto?"Subiendo...":"+ Agregar profesor"}
              </button>
            </div>

            {/* FILTROS */}
            <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
              <div style={{ flex:2, minWidth:180 }}>
                <label style={labelStyle}>Buscar</label>
                <input style={inputStyle} placeholder="Nombre, apellido o DNI..." value={filtroBusq} onChange={e=>setFiltroBusq(e.target.value)} />
              </div>
              <div style={{ flex:1, minWidth:140 }}>
                <label style={labelStyle}>Sede</label>
                <select style={inputStyle} value={filtroSede} onChange={e=>setFiltroSede(e.target.value)}>
                  <option value="">Todas</option>
                  <option value="Edison">Edison</option>
                  <option value="Moreno">Moreno</option>
                  <option value="GSM">General San Martín</option>
                </select>
              </div>
            </div>

            {/* LISTA PROFESORES */}
            {profesoresFiltrados.length===0 && (
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"rgba(255,255,255,0.25)", textAlign:"center", padding:"32px 0" }}>No se encontraron profesores.</p>
            )}
            {profesoresFiltrados.map(p=>{
              const alumnosDelProfe = alumnos.filter(a=>a.profesorId===p.id);
              const likes    = alumnosDelProfe.filter(a=>a.reaccionProfesor==="like").length;
              const dislikes = alumnosDelProfe.filter(a=>a.reaccionProfesor==="dislike").length;
              const coms     = comentarios.filter(c=>c.profesorId===p.id).length;
              return (
                <div key={p.id} className="prof-row" style={{ background:"#111", border:"1px solid rgba(255,255,255,0.07)", borderRadius:14, padding:"18px 24px", marginBottom:12, transition:"background 0.15s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:16 }}>
                    {/* Info — click abre perfil */}
                    <div style={{ display:"flex", alignItems:"center", gap:14, flex:1, cursor:"pointer" }} onClick={()=>setPerfilModal(p)}>
                      <div style={{ width:52, height:52, borderRadius:12, overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", background:"#1a1a1a", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {p.foto?<img src={p.foto} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />:<span style={{fontSize:22}}>👤</span>}
                      </div>
                      <div>
                        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:500, color:"white", margin:0 }}>{p.nombre} {p.apellido||""}</p>
                        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"rgba(255,255,255,0.35)", margin:"3px 0 0" }}>{p.email}</p>
                        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"#00b4d8", margin:"3px 0 0" }}>{p.sedes?.join(" · ")}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display:"flex", gap:24, marginRight:16 }}>
                      {[
                        { val:alumnosDelProfe.length, label:"Alumnos", color:"white" },
                        { val:`👍 ${likes}`,          label:"Likes",    color:"#22c55e" },
                        { val:`👎 ${dislikes}`,        label:"Dislikes", color:"#ef4444" },
                        { val:coms,                   label:"Coms.",    color:"#00b4d8" },
                      ].map(s=>(
                        <div key={s.label} style={{ textAlign:"center" }}>
                          <p style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:s.color, lineHeight:1 }}>{s.val}</p>
                          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:1, textTransform:"uppercase" }}>{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Acciones */}
                    <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                      <button onClick={()=>setPerfilModal(p)}
                        style={{ background:"none", border:"1px solid rgba(0,180,216,0.3)", color:"#00b4d8", borderRadius:8, padding:"8px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer" }}>
                        Ver perfil
                      </button>
                      <button onClick={()=>eliminarProfesor(p.id)}
                        style={{ background:"none", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", borderRadius:8, padding:"8px 16px", fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer" }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, color:"rgba(255,255,255,0.2)", marginTop:14 }}>
              Mostrando {profesoresFiltrados.length} de {profesores.length} profesores
            </p>
          </>
        )}

        {/* ── NOTIFICACIONES ── */}
        {vista==="notificaciones" && (
          <>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, letterSpacing:4, textTransform:"uppercase", color:"rgba(255,255,255,0.3)", marginBottom:8 }}>centro</p>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32 }}>
              <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, letterSpacing:2 }}>🔔 Actividad</h1>
              {notificaciones.some(n=>!n.leida) && (
                <button onClick={marcarTodasLeidas}
                  style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.5)", borderRadius:8, padding:"10px 18px", fontFamily:"'DM Sans',sans-serif", fontSize:13, cursor:"pointer" }}>
                  Marcar todas como leídas
                </button>
              )}
            </div>
            {notificaciones.length===0
              ? <p style={{ fontFamily:"'DM Sans',sans-serif", color:"rgba(255,255,255,0.3)" }}>No hay actividad registrada.</p>
              : notificaciones.map(n=>(
                <div key={n.id} style={{ background:"#111", border:`1px solid ${n.leida?"rgba(255,255,255,0.06)":"rgba(0,180,216,0.25)"}`, borderRadius:12, padding:"16px 20px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", gap:12 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:n.leida?"transparent":"#00b4d8", border:n.leida?"1px solid rgba(255,255,255,0.2)":"none", marginTop:6, flexShrink:0 }} />
                    <div>
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, color:"white", fontWeight:n.leida?400:600, margin:0 }}>{n.mensaje}</p>
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{n.fecha}</p>
                    </div>
                  </div>
                  {!n.leida && (
                    <button onClick={()=>marcarLeida(n.id)}
                      style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.5)", borderRadius:8, padding:"6px 14px", fontFamily:"'DM Sans',sans-serif", fontSize:12, cursor:"pointer", flexShrink:0 }}>
                      ✓ Leída
                    </button>
                  )}
                </div>
              ))
            }
          </>
        )}
      </div>

      {/* MODAL PERFIL PROFESOR */}
      {perfilModal && (
        <PerfilProfesorModal
          profesor={perfilModal}
          alumnos={alumnos}
          comentarios={comentarios}
          onClose={()=>setPerfilModal(null)}
          onGuardar={guardarEdicionModal}
          onEliminar={eliminarProfesor}
        />
      )}
    </div>
  );
}