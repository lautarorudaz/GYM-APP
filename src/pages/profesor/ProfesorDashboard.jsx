import { useState, useEffect } from "react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProfesorDashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alumnos, setAlumnos] = useState([]);
  const [rutinas, setRutinas] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [chat, setChat] = useState([]);
  const [sedeActiva, setSedeActiva] = useState("todas");

  const sedes = usuario?.sedes || [];
  const multisede = sedes.length > 1;

  useEffect(() => { if (usuario?.id) cargarDatos(); }, [usuario]);

  const cargarDatos = async () => {
    const snap = await getDocs(query(collection(db, "usuarios"), where("profesorId", "==", usuario.id)));
    setAlumnos(snap.docs.map(d => ({ id: d.id, ...d.data() })));

    const rutSnap = await getDocs(query(collection(db, "rutinas"), where("profesorId", "==", usuario.id)));
    setRutinas(rutSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const comSnap = await getDocs(query(collection(db, "comentarios"), where("profesorId", "==", usuario.id)));
    setComentarios(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    const chatSnap = await getDocs(query(collection(db, "chat"), where("profesorId", "==", usuario.id)));
    setChat(chatSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const cerrarSesion = async () => { await signOut(auth); navigate("/"); };

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

  const nombreProfe = usuario?.nombre || "Profe";

  const navLinks = [
    { label: "Panel", page: "panel" },
    { label: "Alumnos", page: "alumnos" },
    { label: "Ejercicios", page: "ejercicios" },
    { label: "Rutinas", page: "rutinas" },
    { label: "Chat", page: "chat" },
  ];

  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        .pnav-link{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.5);padding:8px 14px;border-radius:8px;cursor:pointer;border:none;background:none;transition:all 0.2s;white-space:nowrap}
        .pnav-link:hover{color:white;background:rgba(255,255,255,0.06)}
        .pnav-link.active{color:#00b4d8;background:rgba(0,180,216,0.1)}
        .pnav-ham{display:none;background:none;border:none;cursor:pointer;padding:6px;flex-direction:column;gap:5px}
        .pnav-ham span{display:block;width:20px;height:2px;background:rgba(255,255,255,0.7);border-radius:2px;transition:all 0.25s}
        .pnav-desktop{display:flex;gap:2px}
        .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:32px}
        .action-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .action-card{background:#111;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:28px 24px;cursor:pointer;transition:all 0.2s;display:flex;flex-direction:column;gap:12px}
        .action-card:hover{border-color:rgba(0,180,216,0.4);background:rgba(0,180,216,0.04);transform:translateY(-2px)}
        @media(max-width:700px){
          .pnav-desktop{display:none!important}
          .pnav-ham{display:flex!important}
          .stat-grid{grid-template-columns:1fr 1fr!important}
          .action-grid{grid-template-columns:1fr!important}
        }
        @keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "rgba(10,10,10,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 20px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 3, color: "#00b4d8", cursor: "pointer", flexShrink: 0 }}>AnimaApp</span>

        {/* Desktop nav */}
        <div className="pnav-desktop">
          {navLinks.map(({ label, page }) => (
            <button key={page} className="pnav-link active" style={{ color: "#00b4d8", background: "rgba(0,180,216,0.1)" }}
              onClick={() => { }}>
              {label}
            </button>
          ))}
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Filtro de sede (solo si multisede) */}
          {multisede && (
            <select value={sedeActiva} onChange={e => setSedeActiva(e.target.value)}
              style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", padding: "6px 12px", borderRadius: 8, cursor: "pointer", outline: "none" }}>
              <option value="todas" style={{ background: "#111" }}>Todas las sedes</option>
              {sedes.map(s => <option key={s} value={s} style={{ background: "#111" }}>{s === "GSM" ? "Gral. San Martín" : s}</option>)}
            </select>
          )}
          {!multisede && sedes.length === 1 && (
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "#00b4d8", padding: "6px 12px", borderRadius: 8, background: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.15)" }}>
              {sedes[0] === "GSM" ? "Gral. San Martín" : sedes[0]}
            </span>
          )}
          <button onClick={cerrarSesion} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "7px 14px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap" }}>
            Cerrar sesión
          </button>
          <button className="pnav-ham" onClick={() => setMenuOpen(o => !o)}>
            <span style={{ transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
            <span style={{ opacity: menuOpen ? 0 : 1 }} />
            <span style={{ transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: "fixed", top: 62, left: 0, right: 0, zIndex: 199, background: "rgba(10,10,10,0.98)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 4, animation: "fadeDown 0.2s ease" }}>
          <div style={{ textAlign: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 4, color: "#00b4d8" }}>AnimaApp</span>
          </div>
          {navLinks.map(({ label, page }) => (
            <button key={page} onClick={() => setMenuOpen(false)}
              style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.7)", background: "none", border: "none", borderRadius: 10, padding: "13px 16px", cursor: "pointer", textAlign: "left" }}>
              {label}
            </button>
          ))}
          {multisede && (
            <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8, paddingLeft: 16 }}>Sede activa</p>
              {["todas", ...sedes].map(s => (
                <button key={s} onClick={() => { setSedeActiva(s); setMenuOpen(false); }}
                  style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: sedeActiva === s ? "#00b4d8" : "rgba(255,255,255,0.6)", background: sedeActiva === s ? "rgba(0,180,216,0.08)" : "none", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", textAlign: "left", width: "100%" }}>
                  {s === "todas" ? "Todas las sedes" : s === "GSM" ? "Gral. San Martín" : s}
                </button>
              ))}
            </div>
          )}
          <button onClick={cerrarSesion} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: "#ef4444", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "13px 16px", cursor: "pointer", textAlign: "left", marginTop: 8 }}>
            Cerrar sesión
          </button>
        </div>
      )}

      {/* ── CONTENIDO ── */}
      <div style={{ padding: "80px 20px 60px", maxWidth: 1100, margin: "0 auto" }}>

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
            { label: "Alumnos activos", val: alumnosFiltrados.length, icon: "🏃", color: "#00b4d8", accent: true },
            { label: "Mensajes no leídos", val: mensajesNoLeidos, icon: "💬", color: mensajesNoLeidos > 0 ? "#f59e0b" : "white" },
            { label: `Me gusta / No me gusta`, val: `${likes} / ${dislikes}`, icon: "👍", color: "#22c55e" },
          ].map(s => (
            <div key={s.label} style={{ background: "#111", border: `1px solid ${s.accent ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 16, padding: "20px 22px" }}>
              <p style={{ fontSize: 28, marginBottom: 8, lineHeight: 1 }}>{s.icon}</p>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.val}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase", lineHeight: 1.3 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── ACCESOS RÁPIDOS ── */}
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 16 }}>¿Qué hacemos hoy?</p>
        <div className="action-grid">
          {[
            {
              icon: "🏃",
              titulo: "Ver Alumnos",
              desc: `${alumnosFiltrados.length} alumnos${sedeActiva !== "todas" ? ` en ${sedeActiva}` : ""}`,
              badge: comsNoLeidas > 0 ? `${comsNoLeidas} comentarios nuevos` : null,
              badgeColor: "#f59e0b",
              action: () => { },
            },
            {
              icon: "💪",
              titulo: "Ver Ejercicios",
              desc: "Biblioteca de ejercicios",
              badge: null,
              action: () => { },
            },
            {
              icon: "📋",
              titulo: "Ver Rutinas",
              desc: `${rutinasFiltradas.length} rutinas activas`,
              badge: rutinasFiltradas.length === 0 ? "Sin rutinas creadas" : null,
              badgeColor: "rgba(255,255,255,0.3)",
              action: () => { },
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
            onClick={() => { }}>
            <div>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, color: "#f59e0b", margin: 0 }}>💬 Tenés {mensajesNoLeidos} mensaje{mensajesNoLeidos > 1 ? "s" : ""} sin leer</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Tus alumnos te escribieron</p>
            </div>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#f59e0b", fontWeight: 500 }}>Ver chat →</span>
          </div>
        )}
      </div>
    </div>
  );
}