import { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../firebase";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; import ProfesorNavBar from "./ProfesorNavBar";

export default function ProfesorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const [vista, setVista] = useState(location.state?.vista || "panel");
  const [miDoc, setMiDoc] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [chat, setChat] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [sedeActiva, setSedeActiva] = useState("todas");

  // Filtros vista alumnos
  const [filtroBusq, setFiltroBusq] = useState("");
  const [filtroEdad, setFiltroEdad] = useState("");
  const [filtroRutina, setFiltroRutina] = useState("");

  useEffect(() => {
    if (location.state?.vista) setVista(location.state.vista);
  }, [location.state]);

  const sedes = miDoc?.sedes || [];
  const multisede = sedes.length > 1;

  useEffect(() => {
    const cargarMiDoc = async () => {
      const snap = await getDocs(query(collection(db, "usuarios"), where("uid", "==", usuario.uid)));
      if (!snap.empty) setMiDoc({ id: snap.docs[0].id, ...snap.docs[0].data() });
    };
    if (usuario) cargarMiDoc();
  }, [usuario]);

  useEffect(() => { if (miDoc?.id) cargarDatos(); }, [miDoc]);

  const cargarDatos = async () => {
    if (!miDoc) return;
    const snap = await getDocs(query(collection(db, "usuarios"), where("profesorId", "==", miDoc.id)));
    setAlumnos(snap.docs.map(d => ({ id: d.id, ...d.data() })));

    const rutSnap = await getDocs(query(collection(db, "rutinas"), where("profesorId", "==", miDoc.id)));
    setRutinas(rutSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const comSnap = await getDocs(query(collection(db, "comentarios"), where("profesorId", "==", miDoc.id)));
    setComentarios(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const chatSnap = await getDocs(query(collection(db, "chat"), where("profesorId", "==", miDoc.id)));
    setChat(chatSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const notifSnap = await getDocs(query(collection(db, "notificaciones"), where("usuarioId", "==", miDoc.id)));
    const notifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    notifs.sort((a, b) => b.fecha.localeCompare(a.fecha));
    setNotificaciones(notifs);
  };

  const marcarLeida = async (id) => {
    await updateDoc(doc(db, "notificaciones", id), { leida: true });
    cargarDatos();
  };

  const marcarTodasLeidas = async () => {
    const noLeidas = notificaciones.filter(n => !n.leida);
    await Promise.all(noLeidas.map(n => updateDoc(doc(db, "notificaciones", n.id), { leida: true })));
    cargarDatos();
  };

  // Filtrar por sede activa
  const alumnosFiltrados = sedeActiva === "todas"
    ? alumnos
    : alumnos.filter(a => a.sede === sedeActiva);

  const rutinasFiltradas = sedeActiva === "todas"
    ? rutinas
    : rutinas.filter(r => alumnosFiltrados.some(a => a.rutinaId === r.id));

  const mensajesNoLeidos = chat.filter(m => m.de === "alumno" && !m.leido &&
    (sedeActiva === "todas" || alumnosFiltrados.some(a => a.id === m.alumnoId))
  ).length;

  const likes = alumnosFiltrados.filter(a => a.reaccionProfesor === "like").length;
  const dislikes = alumnosFiltrados.filter(a => a.reaccionProfesor === "dislike").length;
  const comsNoLeidas = comentarios.filter(c =>
    !c.leido && (sedeActiva === "todas" || alumnosFiltrados.some(a => a.id === c.alumnoId))
  ).length;

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
    if (filtroRutina === "con") matchRutina = a.rutinaId;
    else if (filtroRutina === "sin") matchRutina = !a.rutinaId;

    return matchBusq && matchEdad && matchRutina;
  });

  const nombreProfe = miDoc?.nombre ? miDoc.nombre.toUpperCase() : "PROFE";

  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        .stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:48px}
        .action-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .action-card{background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px 24px;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;gap:12px}
        .action-card:hover{border-color:rgba(0,180,216,0.4);background:rgba(0,180,216,0.04);transform:translateY(-2px)}
        .footer { background: #000; border-top: 1px solid rgba(255,255,255,0.06); padding: 40px 60px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; color: #00b4d8; margin-bottom: 4px; }
        .footer-copy { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(255,255,255,0.3); }
        .footer-socials { display: flex; gap: 14px; }
        .social-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; color: rgba(255,255,255,0.5); font-size: 15px; transition: border-color 0.2s, color 0.2s; }
        .social-btn:hover { border-color: #00b4d8; color: #00b4d8; }
        .alumnos-filtro-inp { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 11px 14px; color: white; font-family: 'DM Sans',sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; }
        .alumnos-filtro-inp:focus { border-color: rgba(0,180,216,0.4); }
        .alumnos-filtro-inp::placeholder { color: rgba(255,255,255,0.2); }
        select.alumnos-filtro-inp option { background: #1a1a1a; color: white; }
        .alumnos-btn-action { background: none; border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); border-radius: 8px; padding: 8px 14px; font-family: 'DM Sans',sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .alumnos-btn-action:hover { background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.3); }
        .alumnos-btn-action.accent { border-color: rgba(0,180,216,0.3); color: #00b4d8; }
        .alumnos-btn-action.accent:hover { background: rgba(0,180,216,0.1); border-color: #00b4d8; }
        .alumnos-btn-action.danger { border-color: rgba(239,68,68,0.3); color: #ef4444; }
        .alumnos-btn-action.danger:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; }
        @media(max-width:700px){
          .stat-grid{grid-template-columns:1fr 1fr!important}
          .action-grid{grid-template-columns:1fr!important}
          .footer { padding: 32px 24px; }
          .alumnos-filtros { flex-direction: column; }
          .alumnos-row { flex-direction: column; align-items: stretch!important; gap: 16px; }
          .alumnos-actions { flex-wrap: wrap; justify-content: flex-start; }
        }
      `}</style>

      {/* ── TOPBAR ── */}
      <ProfesorNavBar
        usuario={miDoc}
        notificaciones={notificaciones}
        onMarcarLeida={marcarLeida}
        onMarcarTodas={marcarTodasLeidas}
        vistaActual={vista}
        sedeActiva={sedeActiva}
        setSedeActiva={setSedeActiva}
      />

      {/* ── CONTENIDO ── */}
      <div style={{ padding: "80px 20px 60px", maxWidth: 1100, margin: "0 auto", flex: 1, width: "100%" }}>

        {vista === "panel" && (
          <>
            {/* Saludo */}
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
                  : `Trabajando en sede ${sedeActiva === "GSM" ? "Gral. San Martín" : sedeActiva}`
                }
              </p>
            </div>

            {/* ── STATS ── */}
            <div className="stat-grid">
              {[
                { label: "Rutinas activas", val: rutinasFiltradas.length, icon: "📋", color: "white" },
                { label: "Alumnos activos", val: alumnosFiltrados.length, icon: "🏃", color: "#00b4d8", accent: true, action: () => setVista("alumnos"), style: { cursor: "pointer" } },
                { label: "Mensajes no leídos", val: mensajesNoLeidos, icon: "💬", color: mensajesNoLeidos > 0 ? "#f59e0b" : "white", action: () => setVista("chat"), style: { cursor: mensajesNoLeidos > 0 ? "pointer" : "default" } },
                { label: `Me gusta / No me gusta`, val: `${likes} / ${dislikes}`, icon: "👍", color: "#22c55e" },
              ].map(s => (
                <div key={s.label} onClick={s.action} style={{ background: "#111", border: `1px solid ${s.accent ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "20px 22px", ...(s.style || {}) }}>
                  <p style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{s.icon}</p>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.val}</p>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", lineHeight: 1.3 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── ACCESOS RÁPIDOS ── */}
            <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, letterSpacing: 2, color: "white", marginBottom: 32, textAlign: "center", marginTop: 48 }}>
              ¿Qué hacemos hoy?
            </p>
            <div className="action-grid">
              {[
                {
                  icon: "🏃",
                  titulo: "Ver Alumnos",
                  desc: `${alumnosFiltrados.length} alumnos${sedeActiva !== "todas" ? ` en ${sedeActiva}` : ""}`,
                  badge: comsNoLeidas > 0 ? `${comsNoLeidas} comentarios nuevos` : null,
                  badgeColor: "#f59e0b",
                  action: () => setVista("alumnos"),
                },
                {
                  icon: "💪",
                  titulo: "Ver Ejercicios",
                  desc: "Biblioteca de ejercicios",
                  badge: null,
                  action: () => setVista("ejercicios"),
                },
                {
                  icon: "📋",
                  titulo: "Ver Rutinas",
                  desc: `${rutinasFiltradas.length} rutinas activas`,
                  badge: rutinasFiltradas.length === 0 ? "Sin rutinas creadas" : null,
                  badgeColor: "rgba(255,255,255,0.3)",
                  action: () => setVista("rutinas"),
                },
              ].map(card => (
                <div key={card.titulo} className="action-card" onClick={card.action}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 32, lineHeight: 1 }}>{card.icon}</span>
                    {card.badge && (
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 600, color: card.badgeColor, background: `${card.badgeColor}18`, padding: "3px 10px", borderRadius: 20, border: `1px solid ${card.badgeColor}40` }}>
                        {card.badge}
                      </span>
                    )}
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

            {/* Chat si hay mensajes no leídos */}
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

        {/* ── ALUMNOS ── */}
        {vista === "alumnos" && (
          <>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8, marginTop: 12 }}>GESTIÓN DE ALUMNOS</p>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, letterSpacing: 2, marginBottom: 28, lineHeight: 1 }}>Administra tus alumnos</h1>
            
            {/* Stats Alumnos (solo la sede actual) */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ background: "#111", border: "1px solid rgba(0,180,216,0.2)", borderRadius: 14, padding: "18px 24px", flex: 1, minWidth: 150 }}>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: "#00b4d8", lineHeight: 1, marginBottom: 4 }}>{alumnosFiltrados.length}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Total Alumnos ({sedeActiva === "todas" ? "Todas las sedes" : sedeActiva})</p>
              </div>
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 24px", flex: 1, minWidth: 150 }}>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: "white", lineHeight: 1, marginBottom: 4 }}>{alumnosFiltrados.filter(a => a.rutinaId).length}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Con rutina asignada</p>
              </div>
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 24px", flex: 1, minWidth: 150 }}>
                <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: "white", lineHeight: 1, marginBottom: 4 }}>{alumnosFiltrados.filter(a => !a.rutinaId).length}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Sin rutina</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="alumnos-filtros" style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 2 }}>
                <input className="alumnos-filtro-inp" placeholder="Buscar por nombre o apellido..." value={filtroBusq} onChange={e => setFiltroBusq(e.target.value)} />
              </div>
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

            {/* Lista Alumnos */}
            {alumnosVistaFiltrados.length === 0 ? (
               <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "40px 0", background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.05)" }}>
                 No se encontraron alumnos con los filtros seleccionados.
               </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {alumnosVistaFiltrados.map(a => (
                  <div key={a.id} className="alumnos-row" style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, transition: "background 0.2s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, overflow: "hidden", flexShrink: 0 }}>
                        {a.foto ? <img src={a.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.nombre} {a.apellido || ""}
                        </p>
                        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{a.edad ? `${a.edad} años` : "Edad N/A"}</span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8" }}>{a.sede || "Sede N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="alumnos-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {a.rutinaId ? (
                         <button className="alumnos-btn-action">Ver Rutina</button>
                      ) : (
                         <button className="alumnos-btn-action accent">+ Asignar Rutina</button>
                      )}
                      <button className="alumnos-btn-action">Editar</button>
                      <button className="alumnos-btn-action danger">Eliminar</button>
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
      </div>

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