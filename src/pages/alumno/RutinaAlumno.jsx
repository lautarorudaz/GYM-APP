import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import { crearNotificacion } from "../../utils/notificaciones";

const ETAPAS = [
  { id: "movilidad", label: "Movilidad", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  { id: "activacion", label: "Activación", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { id: "general", label: "General", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
];

const getYtId = (url) => url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];

/* ═══ MODAL DE VIDEO ════════════════════════════════════════ */
function VideoModal({ ej, onClose }) {
  const ytId = getYtId(ej.videoLink);
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 800 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "white", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 12 }}>{ej.nombre}</p>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13, flexShrink: 0 }}>✕ Cerrar</button>
        </div>
        <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", background: "#000", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
          {ytId
            ? <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`} title={ej.nombre} frameBorder="0" allow="autoplay; encrypted-media; fullscreen" allowFullScreen style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
            : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}><span style={{ fontSize: 40, opacity: 0.2 }}>🎬</span><p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.25)" }}>Video no disponible</p></div>
          }
        </div>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 12 }}>Tocá fuera o presioná ESC para cerrar</p>
      </div>
    </div>
  );
}

/* ═══ CARD DE EJERCICIO ═════════════════════════════════════ */
function CardEjercicio({ ej, num, onVerVideo }) {
  const ytId = getYtId(ej.videoLink);
  const tieneObs = ej.obs?.trim();
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", transition: "border-color 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}>
      <div style={{ display: "flex", gap: 0 }}>
        {/* Thumbnail */}
        <div onClick={ytId ? () => onVerVideo(ej) : undefined}
          style={{ width: 110, minWidth: 110, background: "#111", position: "relative", cursor: ytId ? "pointer" : "default", flexShrink: 0 }}>
          {ytId ? (
            <>
              <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={ej.nombre}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", minHeight: 90 }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.1)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.35)"}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,180,216,0.9)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,180,216,0.4)" }}>
                  <span style={{ fontSize: 14, marginLeft: 2 }}>▶</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ width: "100%", minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.2 }}>
              <span style={{ fontSize: 28 }}>🎬</span>
            </div>
          )}
          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.75)", borderRadius: 6, padding: "2px 8px" }}>
            <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{num}</span>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: "14px 16px", minWidth: 0 }}>
          <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1, color: "white", margin: "0 0 10px", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {ej.nombre}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: tieneObs ? 10 : 0 }}>
            {[{ label: "Series", val: ej.series, color: "#00b4d8" }, { label: "Reps", val: ej.reps, color: "white" }, { label: "Desc.", val: ej.descanso, color: "rgba(255,255,255,0.5)" }]
              .filter(s => s.val).map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 10px", textAlign: "center", minWidth: 50 }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 2px" }}>{s.label}</p>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: s.color, margin: 0, lineHeight: 1 }}>{s.val}</p>
                </div>
              ))}
          </div>
          {tieneObs && (
            <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>📝</span>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(251,191,36,0.9)", margin: 0, lineHeight: 1.5 }}>{ej.obs}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ PÁGINA PRINCIPAL ══════════════════════════════════════ */
export default function RutinaAlumno() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [miDoc, setMiDoc] = useState(null);
  const [rutina, setRutina] = useState(null); // doc de rutinas_asignadas
  const [profesor, setProfesor] = useState(null);
  const [notificaciones, setNotif] = useState([]);
  const [modalNotif, setModalNotif] = useState(false);
  const [semanaIdx, setSemanaIdx] = useState(0);
  const [diaIdx, setDiaIdx] = useState(0);
  const [videoModal, setVideoModal] = useState(null);
  const [tab, setTab] = useState("rutina");
  const [mensajeChat, setMensajeChat] = useState("");
  const [mensajes, setMensajes] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { if (location.state?.tab) setTab(location.state.tab); }, [location.state]);

  // Marcar mensajes como leídos al abrir el chat
  useEffect(() => {
    if (tab === "chat" && miDoc) {
      const noLeidos = mensajes.filter(m => m.de === "profesor" && !m.leido);
      if (noLeidos.length > 0) {
        setTimeout(() => {
          Promise.all(noLeidos.map(m => updateDoc(doc(db, "chat", m.id), { leido: true }))).then(() => cargarDatos());
        }, 800);
      }
      const notifsMsg = notificaciones.filter(n => n.tipo === "nuevo_mensaje" && !n.leida);
      if (notifsMsg.length > 0) {
        Promise.all(notifsMsg.map(n => updateDoc(doc(db, "notificaciones", n.id), { leida: true }))).then(() => cargarDatos());
      }
    }
  }, [tab, miDoc]);

  // Reset día al cambiar semana
  useEffect(() => { setDiaIdx(0); }, [semanaIdx]);

  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // 1. Cargar doc del alumno
      const snap = await getDocs(query(collection(db, "usuarios"), where("uid", "==", usuario.uid)));
      if (snap.empty) return;
      const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setMiDoc(data);

      // 2. Cargar rutina desde rutinas_asignadas (la más reciente si tiene tieneRutina)
      if (data.tieneRutina) {
        const rutSnap = await getDocs(
          query(collection(db, "rutinas_asignadas"), where("alumnoId", "==", data.id))
        );
        if (!rutSnap.empty) {
          const todas = rutSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          // La más reciente
          todas.sort((a, b) => (b.asignadoEn?.toMillis?.() ?? 0) - (a.asignadoEn?.toMillis?.() ?? 0));
          setRutina(todas[0]);

          // Cargar datos del profesor
          if (todas[0].profesorId) {
            try {
              const pSnap = await getDoc(doc(db, "usuarios", todas[0].profesorId));
              if (pSnap.exists()) setProfesor({ id: pSnap.id, ...pSnap.data() });
            } catch { }
          }
        }
      } else {
        setRutina(null);
      }

      // 3. Comentarios
      const comSnap = await getDocs(query(collection(db, "comentarios"), where("alumnoId", "==", data.id)));
      setComentarios(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // 4. Chat
      const chatSnap = await getDocs(query(collection(db, "chat"), where("alumnoId", "==", data.id)));
      const msgs = chatSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => a.fecha?.localeCompare(b.fecha));
      setMensajes(msgs);

      // 5. Notificaciones
      const notifSnap = await getDocs(query(collection(db, "notificaciones"), where("usuarioId", "==", data.id)));
      const notifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      notifs.sort((a, b) => {
        const da = new Date(a.fecha || 0), db_ = new Date(b.fecha || 0);
        return db_ - da;
      });
      setNotif(notifs);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  const handleClickNotif = async (n) => {
    await updateDoc(doc(db, "notificaciones", n.id), { leida: true });
    if (n.tipo === "nuevo_mensaje") setTab("chat");
    setModalNotif(false);
    cargarDatos();
  };

  const enviarMensaje = async () => {
    if (!mensajeChat.trim()) return;
    setEnviando(true);
    await addDoc(collection(db, "chat"), {
      mensaje: mensajeChat, alumnoId: miDoc.id, alumnoNombre: miDoc.nombre,
      profesorId: miDoc.profesorId, de: "alumno", fecha: new Date().toISOString()
    });
    await crearNotificacion({
      usuarioId: miDoc.profesorId,
      mensaje: `${miDoc.nombre} te ha enviado un mensaje`,
      tipo: "nuevo_mensaje", extraData: { alumnoId: miDoc.id }
    });
    setMensajeChat(""); setEnviando(false); cargarDatos();
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;
  const semanas = rutina?.semanas || [];
  const dias = semanas[semanaIdx]?.dias || [];
  const diaActual = dias[diaIdx];

  const totalEj = semanas.reduce((a, s) => a + (s.dias || []).reduce((b, d) => b + ETAPAS.reduce((c, et) => c + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0), 0), 0);

  return (
    <div style={{ fontFamily: "'Bebas Neue',sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{display:block!important;place-items:unset!important}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#333;border-radius:4px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .dia-anim{animation:fadeIn 0.25s ease}
        @keyframes spin{to{transform:rotate(360deg)}}
        .tab-dia-btn:hover{background:rgba(255,255,255,0.07)!important}

        .footer{background:#000;border-top:1px solid rgba(255,255,255,0.06);padding:36px 60px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px}
        .footer-brand{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:#00b4d8;margin-bottom:4px}
        .footer-copy{font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(255,255,255,0.3)}
        .footer-socials{display:flex;gap:14px}
        .social-btn{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;text-decoration:none;color:rgba(255,255,255,0.5);font-size:15px;transition:border-color 0.2s,color 0.2s}
        .social-btn:hover{border-color:#00b4d8;color:#00b4d8}
        .chat-wrapper{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;max-height:400px;overflow-y:auto;padding-right:4px}
        .chat-burbuja{max-width:75%;padding:12px 16px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.5}
        .chat-burbuja.alumno{background:#00b4d8;color:#03045e;align-self:flex-end;border-bottom-right-radius:4px}
        .chat-burbuja.profe{background:#1a1a1a;color:rgba(255,255,255,0.85);align-self:flex-start;border-bottom-left-radius:4px;border:1px solid rgba(255,255,255,0.07)}
        .chat-fecha{font-size:10px;opacity:0.5;margin-top:4px}
        .chat-input-row{display:flex;gap:10px;align-items:flex-end}
        .chat-input{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 16px;color:white;font-family:'DM Sans',sans-serif;font-size:14px;resize:none;outline:none;transition:border-color 0.2s;min-height:48px;max-height:120px}
        .chat-input:focus{border-color:rgba(0,180,216,0.4)}
        .chat-input::placeholder{color:rgba(255,255,255,0.2)}
        .chat-send{background:#00b4d8;color:#03045e;border:none;border-radius:12px;width:48px;height:48px;font-size:20px;cursor:pointer;flex-shrink:0;transition:transform 0.15s;display:flex;align-items:center;justify-content:center}
        .chat-send:hover{transform:scale(1.05)}
        .chat-send:disabled{opacity:0.4;cursor:not-allowed}
        .notif-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:flex-start;justify-content:flex-end;padding:80px 40px 0}
        .notif-modal-box{background:#0d0d0d;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:360px;max-height:500px;overflow-y:auto}
        .notif-item{padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;gap:12px;cursor:pointer}
        .notif-dot{width:8px;height:8px;border-radius:50%;background:#00b4d8;margin-top:6px;flex-shrink:0}
        .notif-dot.leida{background:transparent;border:1px solid rgba(255,255,255,0.2)}
        .notif-msg{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.8);line-height:1.5}
        .notif-fecha{font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px}
        .empty-notif{padding:40px 24px;text-align:center;font-family:'DM Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.3)}
        @media(max-width:768px){
          .footer{padding:32px 20px}
          .notif-modal-overlay{padding:80px 16px 0}
          .notif-modal-box{width:100%}
          .chat-burbuja{max-width:90%}
        }
      `}</style>

      <NavBar noLeidas={noLeidas} onNotifClick={() => setModalNotif(true)} activePage="rutina" />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", padding: "110px 40px 0" }}>
        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>¡Hora de ejercitarse!</p>
        <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(36px,5vw,56px)", letterSpacing: 2, color: "white", marginBottom: 32 }}>
          Hola, <span style={{ color: "#00b4d8" }}>{miDoc?.nombre?.split(" ")[0] || "atleta"}</span>
        </h1>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
          {[
            { num: rutina ? semanas.length : 0, label: "Semanas" },
            { num: rutina ? (semanas.reduce((a, s) => a + (s.dias?.length || 0), 0)) : 0, label: "Días" },
            { num: rutina ? totalEj : 0, label: "Ejercicios" },
            { num: noLeidas, label: "Avisos" },
          ].map(s => (
            <div key={s.label} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 28px", minWidth: 130, transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,180,216,0.2)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"}>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 44, color: "#00b4d8", lineHeight: 1, marginBottom: 4 }}>{s.num}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: 1, textTransform: "uppercase" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENIDO ────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 40px 60px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 32 }}>
          {[["rutina", "Rutina actual"], ["chat", "Chat con el profe"]].map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 500, background: "none", border: "none", color: tab === v ? "#00b4d8" : "rgba(255,255,255,0.4)", padding: "14px 24px", cursor: "pointer", position: "relative", transition: "color 0.2s", borderBottom: tab === v ? "2px solid #00b4d8" : "2px solid transparent" }}>
              {l}
            </button>
          ))}
        </div>

        {/* ── TAB RUTINA ── */}
        {tab === "rutina" && (
          cargando ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 40, height: 40, border: "3px solid rgba(0,180,216,0.15)", borderTopColor: "#00b4d8", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>Cargando tu rutina...</p>
            </div>
          ) : !rutina ? (
            <div style={{ background: "#111", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: 60, textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🏋️</div>
              <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 8 }}>Sin rutina asignada</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.2)" }}>Tu profesor aún no te asignó una rutina</p>
            </div>
          ) : (
            <>
              {/* Header rutina */}
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>tu entrenamiento</p>
                <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: "white", letterSpacing: 2, lineHeight: 1, marginBottom: 6 }}>{rutina.nombre}</h2>
                {rutina.descripcion && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 6, lineHeight: 1.5 }}>{rutina.descripcion}</p>}
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
                  Asignada por <span style={{ color: "#00b4d8" }}>{profesor?.nombre || "tu profesor"}</span>
                </p>
              </div>

              {/* Selector semanas */}
              {semanas.length > 1 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>Semana</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {semanas.map((s, i) => (
                      <button key={i} onClick={() => setSemanaIdx(i)} style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, padding: "7px 18px", borderRadius: 20, border: "none", cursor: "pointer", transition: "all 0.2s", background: semanaIdx === i ? "rgba(0,180,216,0.15)" : "rgba(255,255,255,0.04)", color: semanaIdx === i ? "#00b4d8" : "rgba(255,255,255,0.45)", outline: semanaIdx === i ? "1px solid rgba(0,180,216,0.35)" : "none" }}>
                        Semana {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabs días */}
              <div style={{ display: "flex", gap: 6, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
                {dias.map((d, i) => {
                  const ejCount = ETAPAS.reduce((a, et) => a + (d.etapas?.[et.id]?.ejercicios?.length || 0), 0);
                  return (
                    <button key={i} className="tab-dia-btn" onClick={() => setDiaIdx(i)}
                      style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, padding: "9px 18px", borderRadius: 12, border: `1px solid ${diaIdx === i ? "rgba(0,180,216,0.4)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", transition: "all 0.2s", background: diaIdx === i ? "rgba(0,180,216,0.1)" : "rgba(255,255,255,0.03)", color: diaIdx === i ? "#00b4d8" : "rgba(255,255,255,0.5)", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 64 }}>
                      <span>Día {i + 1}</span>
                      <span style={{ fontSize: 10, color: diaIdx === i ? "rgba(0,180,216,0.7)" : "rgba(255,255,255,0.25)" }}>{ejCount} ej.</span>
                    </button>
                  );
                })}
              </div>

              {/* Contenido del día */}
              {diaActual ? (
                <div key={`${semanaIdx}-${diaIdx}`} className="dia-anim">
                  {/* Info del día */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
                    <div>
                      <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 2, color: "white", margin: 0 }}>Semana {semanaIdx + 1} — Día {diaIdx + 1}</p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
                        {ETAPAS.reduce((a, et) => a + (diaActual.etapas?.[et.id]?.ejercicios?.length || 0), 0)} ejercicios en total
                      </p>
                    </div>
                  </div>

                  {/* Etapas */}
                  {ETAPAS.map(et => {
                    const ejs = diaActual.etapas?.[et.id]?.ejercicios || [];
                    if (!ejs.length) return null;
                    return (
                      <div key={et.id} style={{ marginBottom: 28 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: et.color, flexShrink: 0, boxShadow: `0 0 8px ${et.color}` }} />
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: et.color }}>{et.label}</span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{ejs.length} ejercicio{ejs.length !== 1 ? "s" : ""}</span>
                          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${et.color}44,transparent)` }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {ejs.map((ej, ei) => (
                            <CardEjercicio key={ei} ej={ej} num={ei + 1} onVerVideo={setVideoModal} />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Navegación entre días */}
                  <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
                    {diaIdx > 0 && (
                      <button onClick={() => setDiaIdx(d => d - 1)} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", padding: "13px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                        ← Día {diaIdx}
                      </button>
                    )}
                    {diaIdx < dias.length - 1 ? (
                      <button onClick={() => setDiaIdx(d => d + 1)} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,180,216,0.2)" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                        Día {diaIdx + 2} →
                      </button>
                    ) : semanaIdx < semanas.length - 1 ? (
                      <button onClick={() => setSemanaIdx(s => s + 1)} style={{ flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#00b4d8,#0077b6)", border: "none", color: "white", padding: "13px", borderRadius: 12, cursor: "pointer" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
                        Siguiente semana →
                      </button>
                    ) : (
                      <div style={{ flex: 1, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "13px", textAlign: "center" }}>
                        <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#22c55e", margin: 0 }}>✅ ¡Completaste toda la rutina!</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ background: "#111", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, padding: 40, textAlign: "center" }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: "rgba(255,255,255,0.2)" }}>No hay ejercicios para este día.</p>
                </div>
              )}
            </>
          )
        )}

        {/* ── TAB CHAT ── */}
        {tab === "chat" && (
          <>
            {mensajes.length === 0
              ? <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "32px 0" }}>
                Aún no hay mensajes con tu profesor. ¡Empezá la conversación!
              </p>
              : (
                <div className="chat-wrapper">
                  {mensajes.map(m => (
                    <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.de === "alumno" ? "flex-end" : "flex-start" }}>
                      <div className={`chat-burbuja ${m.de === "alumno" ? "alumno" : "profe"}`}>
                        {m.mensaje}
                        <p className="chat-fecha">{m.fecha ? new Date(m.fecha).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
            <div className="chat-input-row">
              <textarea className="chat-input"
                placeholder={`Escribile a ${profesor?.nombre || "tu profesor"}...`}
                value={mensajeChat} onChange={e => setMensajeChat(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }}
                rows={1} />
              <button className="chat-send" onClick={enviarMensaje} disabled={enviando}>➤</button>
            </div>
          </>
        )}
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div>
          <p className="footer-brand">AnimaApp</p>
          <p className="footer-copy">© {new Date().getFullYear()} Gimnasio Anima · Derechos reservados por el autor</p>
        </div>
        <div className="footer-socials">
          <a href="#" className="social-btn">f</a>
          <a href="#" className="social-btn">📷</a>
          <a href="#" className="social-btn">💬</a>
        </div>
      </footer>

      {/* Modales */}
      {videoModal && <VideoModal ej={videoModal} onClose={() => setVideoModal(null)} />}

      {modalNotif && (
        <div className="notif-modal-overlay" onClick={() => setModalNotif(false)}>
          <div className="notif-modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 600, color: "white" }}>🔔 Notificaciones</span>
              <button onClick={() => setModalNotif(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            {notificaciones.length === 0
              ? <div className="empty-notif">No tenés notificaciones aún</div>
              : notificaciones.map(n => (
                <div key={n.id} className="notif-item" onClick={() => handleClickNotif(n)}
                  style={{ background: n.leida ? "transparent" : "rgba(0,180,216,0.05)" }}>
                  <div className={`notif-dot ${n.leida ? "leida" : ""}`} />
                  <div>
                    <p className="notif-msg" style={{ fontWeight: n.leida ? 400 : 600 }}>{n.mensaje}</p>
                    <p className="notif-fecha">{n.fecha}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}