import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import NavBar from "../../components/NavBar";
import { crearNotificacion } from "../../utils/notificaciones";

// ── Modal Video ──────────────────────────────────────────────
function VideoModal({ ejercicio, onClose }) {
  const isYoutube = ejercicio.videoUrl?.includes("youtube") || ejercicio.videoUrl?.includes("youtu.be");
  const getEmbedUrl = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="video-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{ejercicio.ejercicio}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="video-container">
          {ejercicio.videoUrl
            ? isYoutube
              ? <iframe src={getEmbedUrl(ejercicio.videoUrl)} title={ejercicio.ejercicio} frameBorder="0" allowFullScreen style={{ width:"100%", height:"100%", borderRadius:"0 0 16px 16px" }} />
              : <video src={ejercicio.videoUrl} controls style={{ width:"100%", height:"100%", borderRadius:"0 0 16px 16px" }} />
            : <div className="video-empty"><span style={{fontSize:40,opacity:0.2}}>🎬</span><p>Video no disponible aún</p></div>
          }
        </div>
      </div>
    </div>
  );
}

// ── Modal Nota ───────────────────────────────────────────────
function NotaModal({ ejercicio, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Nota del Profesor</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,color:"rgba(255,255,255,0.4)",letterSpacing:1,marginBottom:12}}>{ejercicio.ejercicio}</p>
          {ejercicio.observacion
            ? <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:16,color:"white",lineHeight:1.7}}>{ejercicio.observacion}</p>
            : <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>El profesor no dejó ninguna nota para este ejercicio.</p>
          }
        </div>
      </div>
    </div>
  );
}

// ── Tabla ejercicios ─────────────────────────────────────────
function TablaEjercicios({ ejercicios, onVideo, onNota }) {
  return (
    <div className="tabla-wrapper">
      <table className="tabla">
        <thead className="tabla-head">
          <tr>
            <th className="tabla-th" style={{width:48}}>#</th>
            <th className="tabla-th">Ejercicio</th>
            <th className="tabla-th">Series</th>
            <th className="tabla-th">Reps / Tiempo</th>
            <th className="tabla-th">Observación</th>
            <th className="tabla-th" style={{textAlign:"center"}}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ejercicios.map((ej, i) => (
            <tr key={i} className="tabla-tr">
              <td className="tabla-td num">{String(i+1).padStart(2,"0")}</td>
              <td className="tabla-td nombre">{ej.ejercicio}</td>
              <td className="tabla-td">{ej.series || "—"}</td>
              <td className="tabla-td">{ej.repeticiones || ej.tiempo || "—"}</td>
              <td className="tabla-td obs">{ej.observacion || <span style={{color:"rgba(255,255,255,0.18)"}}>—</span>}</td>
              <td className="tabla-td">
                <div className="acciones-cell">
                  <button className="accion-td-btn video" title="Ver video" onClick={() => onVideo(ej)}>🎬</button>
                  <button className="accion-td-btn swap" title="Cambiar ejercicio">⇄</button>
                  <button className="accion-td-btn msg" title="Nota del profesor" onClick={() => onNota(ej)}>💬</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Principal ────────────────────────────────────────────────
export default function RutinaAlumno() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [miDoc, setMiDoc]           = useState(null);
  const [rutina, setRutina]         = useState(null);
  const [profesor, setProfesor]     = useState(null);
  const [notificaciones, setNotif]  = useState([]);
  const [modalNotif, setModalNotif] = useState(false);
  const [semanaActiva, setSemana]   = useState(0);
  const [diaActivo, setDia]         = useState(0);
  const [videoModal, setVideoModal] = useState(null);
  const [notaModal, setNotaModal]   = useState(null);
  const [tab, setTab]               = useState("rutina");
  const [mensajeChat, setMensajeChat] = useState("");
  const [mensajes, setMensajes]     = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [enviando, setEnviando]     = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab);
    }
  }, [location.state]);

  useEffect(() => {
    if (tab === "chat" && miDoc) {
      const msgsNoLeidos = mensajes.filter(m => m.de === "profesor" && !m.leido);
      if (msgsNoLeidos.length > 0) {
        const t = setTimeout(() => {
          Promise.all(msgsNoLeidos.map(m => updateDoc(doc(db, "chat", m.id), { leido: true })))
            .then(() => cargarDatos());
        }, 800);
        return () => clearTimeout(t);
      }

      // También marcar notificaciones de mensaje como leídas
      const notifsMsg = notificaciones.filter(n => n.tipo === "nuevo_mensaje" && !n.leida);
      if (notifsMsg.length > 0) {
        Promise.all(notifsMsg.map(n => updateDoc(doc(db, "notificaciones", n.id), { leida: true })))
          .then(() => cargarDatos());
      }
    }
  }, [tab, miDoc, mensajes, notificaciones]);

  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  const cargarDatos = async () => {
    const snap = await getDocs(query(collection(db, "usuarios"), where("uid", "==", usuario.uid)));
    if (snap.empty) return;
    const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
    setMiDoc(data);
    if (data.rutinaId) {
      const r = await getDoc(doc(db, "rutinas", data.rutinaId));
      if (r.exists()) setRutina({ id: r.id, ...r.data() });
    }
    if (data.profesorId) {
      const p = await getDoc(doc(db, "usuarios", data.profesorId));
      if (p.exists()) setProfesor({ id: p.id, ...p.data() });
    }
    const comSnap = await getDocs(query(collection(db, "comentarios"), where("alumnoId", "==", snap.docs[0].id)));
    setComentarios(comSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    // mensajes de chat (coleccion separada)
    const chatSnap = await getDocs(query(collection(db, "chat"), where("alumnoId", "==", snap.docs[0].id)));
    const msgs = chatSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    msgs.sort((a,b) => a.fecha?.localeCompare(b.fecha));
    setMensajes(msgs);
    const notifSnap = await getDocs(query(collection(db, "notificaciones"), where("usuarioId", "==", snap.docs[0].id)));
    const actualNotifs = notifSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setNotif(actualNotifs.sort((a,b) => b.fecha.localeCompare(a.fecha)));
  };

  const handleClickNotif = async (n) => {
    await updateDoc(doc(db, "notificaciones", n.id), { leida: true });
    if (n.tipo === "nuevo_mensaje") {
      setTab("chat");
    }
    setModalNotif(false);
    cargarDatos();
  };

  const enviarMensaje = async () => {
    if (!mensajeChat.trim()) return;
    setEnviando(true);
    await addDoc(collection(db, "chat"), {
      mensaje: mensajeChat,
      alumnoId: miDoc.id,
      alumnoNombre: miDoc.nombre,
      profesorId: miDoc.profesorId,
      de: "alumno",
      fecha: new Date().toISOString()
    });
    await crearNotificacion({ 
      usuarioId: miDoc.profesorId, 
      mensaje: `${miDoc.nombre} te ha enviado un mensaje`, 
      tipo: "nuevo_mensaje",
      extraData: { alumnoId: miDoc.id }
    });
    setMensajeChat("");
    setEnviando(false);
    cargarDatos();
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  // Estructura rutina
  const semanas = rutina?.semanas || [];
  const usaNueva = semanas.length > 0;
  const semanaData = semanas[semanaActiva];
  const dias = semanaData?.dias || [];
  const diaData = dias[diaActivo];
  const ejercicios = usaNueva ? (diaData?.ejercicios || []) : (rutina?.ejercicios || []);

  // Para demo: si la rutina NO tiene semanas, simular días a partir de la lista de ejercicios
  // divididos para mostrar los filtros. Esto se eliminará cuando todas las rutinas usen la nueva estructura.
  const DEMO_DIAS = rutina && !usaNueva ? ["Día 1"] : [];

  return (
    <div style={{fontFamily:"'Bebas Neue',sans-serif",minHeight:"100vh",background:"#0a0a0a",color:"white",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}

        /* HERO RESUMEN */
        .hero-resumen{
          padding: 110px 40px 0;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
        }
        .hero-saludo{
          font-family:'DM Sans',sans-serif;
          font-size:13px;
          letter-spacing:3px;
          text-transform:uppercase;
          color:rgba(255,255,255,0.35);
          margin-bottom:6px;
        }
        .hero-titulo{
          font-family:'Bebas Neue',sans-serif;
          font-size:clamp(36px,5vw,56px);
          letter-spacing:2px;
          color:white;
          margin-bottom:32px;
        }
        .hero-titulo span{color:#00b4d8}

        .stats-row{
          display:flex;
          gap:16px;
          margin-bottom:40px;
          flex-wrap:wrap;
        }
        .stat-card{
          background:#111;
          border:1px solid rgba(255,255,255,0.07);
          border-radius:14px;
          padding:20px 28px;
          min-width:160px;
          transition:border-color 0.2s;
        }
        .stat-card:hover{border-color:rgba(0,180,216,0.2)}
        .stat-num{
          font-family:'Bebas Neue',sans-serif;
          font-size:44px;
          color:#00b4d8;
          line-height:1;
          margin-bottom:4px;
        }
        .stat-label{
          font-family:'DM Sans',sans-serif;
          font-size:12px;
          color:rgba(255,255,255,0.35);
          letter-spacing:1px;
          text-transform:uppercase;
        }

        /* TABS */
        .page-content{padding:0 40px 60px;max-width:1100px;margin:0 auto;width:100%}
        .tabs{display:flex;border-bottom:1px solid rgba(255,255,255,0.07);margin-bottom:32px}
        .tab-btn{font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;background:none;border:none;color:rgba(255,255,255,0.4);padding:14px 24px;cursor:pointer;position:relative;transition:color 0.2s;letter-spacing:0.5px}
        .tab-btn.active{color:#00b4d8}
        .tab-btn.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#00b4d8}

        /* FILTROS */
        .filtros-block{margin-bottom:24px}
        .filtros-label{font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.25);margin-bottom:10px}
        .filtros-row{display:flex;gap:8px;flex-wrap:wrap}
        .filtro-btn{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;padding:8px 20px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:none;color:rgba(255,255,255,0.5);cursor:pointer;transition:all 0.2s}
        .filtro-btn:hover{border-color:rgba(0,180,216,0.4);color:rgba(255,255,255,0.8)}
        .filtro-btn.active{background:#00b4d8;border-color:#00b4d8;color:#03045e;font-weight:700}

        /* RUTINA HEADER */
        .rutina-header{margin-bottom:24px}
        .rutina-eyebrow{font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.3);margin-bottom:6px}
        .rutina-nombre{font-family:'Bebas Neue',sans-serif;font-size:48px;color:white;letter-spacing:2px;line-height:1;margin-bottom:6px}
        .rutina-meta{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.35);margin-bottom:28px}
        .rutina-meta span{color:#00b4d8}

        /* TABLA */
        .tabla-wrapper{overflow-x:auto;border-radius:14px;border:1px solid rgba(255,255,255,0.07)}
        .tabla{width:100%;border-collapse:collapse;min-width:660px}
        .tabla-head{background:#0d0d0d}
        .tabla-th{font-family:'DM Sans',sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.3);padding:14px 20px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);white-space:nowrap}
        .tabla-tr{border-bottom:1px solid rgba(255,255,255,0.04);transition:background 0.15s}
        .tabla-tr:last-child{border-bottom:none}
        .tabla-tr:hover{background:rgba(255,255,255,0.02)}
        .tabla-td{font-family:'DM Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.8);padding:16px 20px;vertical-align:middle}
        .tabla-td.nombre{font-weight:500;color:white}
        .tabla-td.num{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#00b4d8}
        .tabla-td.obs{font-size:13px;color:rgba(255,255,255,0.4);font-style:italic;max-width:180px}
        .acciones-cell{display:flex;gap:8px;justify-content:center;align-items:center}
        .accion-td-btn{width:36px;height:36px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:#111;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:all 0.2s;flex-shrink:0}
        .accion-td-btn.video:hover{border-color:#00b4d8;background:rgba(0,180,216,0.08)}
        .accion-td-btn.swap:hover{border-color:#f59e0b;background:rgba(245,158,11,0.08)}
        .accion-td-btn.msg:hover{border-color:#a855f7;background:rgba(168,85,247,0.08)}

        /* EMPTY */
        .empty-state{background:#111;border:1px dashed rgba(255,255,255,0.08);border-radius:16px;padding:60px;text-align:center}
        .empty-icon{font-size:44px;margin-bottom:16px}
        .empty-title{font-family:'Bebas Neue',sans-serif;font-size:26px;color:rgba(255,255,255,0.3);letter-spacing:1px;margin-bottom:8px}
        .empty-sub{font-family:'DM Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.2)}

        /* CHAT */
        .chat-wrapper{display:flex;flex-direction:column;gap:10px;margin-bottom:20px;max-height:400px;overflow-y:auto;padding-right:4px}
        .chat-burbuja{max-width:75%;padding:12px 16px;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:14px;line-height:1.5}
        .chat-burbuja.alumno{background:#00b4d8;color:#03045e;align-self:flex-end;border-bottom-right-radius:4px}
        .chat-burbuja.profe{background:#1a1a1a;color:rgba(255,255,255,0.85);align-self:flex-start;border-bottom-left-radius:4px;border:1px solid rgba(255,255,255,0.07)}
        .chat-fecha{font-size:10px;opacity:0.5;margin-top:4px}
        .chat-input-row{display:flex;gap:10px;align-items:flex-end}
        .chat-input{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px 16px;color:white;font-family:'DM Sans',sans-serif;font-size:14px;resize:none;outline:none;transition:border-color 0.2s;min-height:48px;max-height:120px}
        .chat-input:focus{border-color:rgba(0,180,216,0.4)}
        .chat-input::placeholder{color:rgba(255,255,255,0.2)}
        .chat-send{background:#00b4d8;color:#03045e;border:none;border-radius:12px;width:48px;height:48px;font-size:20px;cursor:pointer;flex-shrink:0;transition:transform 0.15s,box-shadow 0.15s;display:flex;align-items:center;justify-content:center}
        .chat-send:hover{transform:scale(1.05);box-shadow:0 4px 16px rgba(0,180,216,0.3)}
        .chat-send:disabled{opacity:0.4;cursor:not-allowed}
        .chat-empty{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.2);text-align:center;padding:32px 0}

        /* MODALES */
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.15s ease}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .modal-box{background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:100%;max-width:420px;animation:slideUp 0.2s ease}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .video-modal-box{background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:100%;max-width:640px;animation:slideUp 0.2s ease}
        .modal-header{padding:20px 24px 16px;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center}
        .modal-title{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px;color:white}
        .modal-close{background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:24px;line-height:1;transition:color 0.2s}
        .modal-close:hover{color:white}
        .modal-body{padding:24px}
        .video-container{height:320px;background:#000;border-radius:0 0 14px 14px;overflow:hidden;display:flex;align-items:center;justify-content:center}
        .video-empty{display:flex;flex-direction:column;align-items:center;gap:12px}
        .video-empty p{font-family:'DM Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.25)}

        /* NOTIF MODAL */
        .notif-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:flex-start;justify-content:flex-end;padding:80px 40px 0}
        .notif-modal-box{background:#0d0d0d;border:1px solid rgba(255,255,255,0.1);border-radius:16px;width:360px;max-height:500px;overflow-y:auto}
        .notif-item{padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;gap:12px}
        .notif-dot{width:8px;height:8px;border-radius:50%;background:#00b4d8;margin-top:6px;flex-shrink:0}
        .notif-dot.leida{background:transparent;border:1px solid rgba(255,255,255,0.2)}
        .notif-msg{font-family:'DM Sans',sans-serif;font-size:13px;color:rgba(255,255,255,0.8);line-height:1.5}
        .notif-fecha{font-family:'DM Sans',sans-serif;font-size:11px;color:rgba(255,255,255,0.3);margin-top:4px}
        .empty-notif{padding:40px 24px;text-align:center;font-family:'DM Sans',sans-serif;font-size:14px;color:rgba(255,255,255,0.3)}

        /* FOOTER */
        .footer{background:#000;border-top:1px solid rgba(255,255,255,0.06);padding:36px 60px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px}
        .footer-brand{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:3px;color:#00b4d8;margin-bottom:4px}
        .footer-copy{font-family:'DM Sans',sans-serif;font-size:12px;color:rgba(255,255,255,0.3)}
        .footer-socials{display:flex;gap:14px}
        .social-btn{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;text-decoration:none;color:rgba(255,255,255,0.5);font-size:15px;transition:border-color 0.2s,color 0.2s}
        .social-btn:hover{border-color:#00b4d8;color:#00b4d8}

        @media(max-width:768px){
          .hero-resumen{padding:90px 20px 0}
          .page-content{padding:0 20px 40px}
          .stats-row{gap:12px}
          .stat-card{min-width:130px;padding:16px 20px}
          .stat-num{font-size:36px}
          .rutina-nombre{font-size:36px}
          .footer{padding:32px 20px}
          .notif-modal-overlay{padding:80px 16px 0}
          .notif-modal-box{width:100%}
          .video-container{height:220px}
          .chat-burbuja{max-width:90%}
        }
      `}</style>

      <NavBar noLeidas={noLeidas} onNotifClick={() => setModalNotif(true)} activePage="rutina" />

      {/* ── HERO RESUMEN ── */}
      <div className="hero-resumen">
        <p className="hero-saludo">¡Hora de ejercitarse!</p>
        <h1 className="hero-titulo">
          Hola, <span>{miDoc?.nombre?.split(" ")[0] || "atleta"}</span>
        </h1>
        <div className="stats-row">
          <div className="stat-card">
            <p className="stat-num">{rutina ? 1 : 0}</p>
            <p className="stat-label">Rutinas activas</p>
          </div>
          <div className="stat-card">
            <p className="stat-num">{noLeidas}</p>
            <p className="stat-label">Avisos</p>
          </div>
          <div className="stat-card">
            <p className="stat-num">{comentarios.length}</p>
            <p className="stat-label">Comentarios</p>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="page-content">
        <div className="tabs">
          <button className={`tab-btn ${tab === "rutina" ? "active" : ""}`} onClick={() => setTab("rutina")}>Rutina actual</button>
          <button className={`tab-btn ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>Chat con el profe</button>
        </div>

        {/* TAB RUTINA */}
        {tab === "rutina" && (
          !rutina ? (
            <div className="empty-state">
              <div className="empty-icon">🏋️</div>
              <p className="empty-title">Sin rutina asignada</p>
              <p className="empty-sub">Tu profesor aún no te asignó una rutina</p>
            </div>
          ) : (
            <>
              <div className="rutina-header">
                <p className="rutina-eyebrow">tu entrenamiento</p>
                <h2 className="rutina-nombre">{rutina.nombre}</h2>
                <p className="rutina-meta">Asignada por <span>{profesor?.nombre || "tu profesor"}</span></p>
              </div>

              {/* FILTRO SEMANAS - solo si tiene estructura nueva */}
              {usaNueva && semanas.length > 1 && (
                <div className="filtros-block">
                  <p className="filtros-label">Semana</p>
                  <div className="filtros-row">
                    {semanas.map((s, i) => (
                      <button key={i} className={`filtro-btn ${semanaActiva === i ? "active" : ""}`}
                        onClick={() => { setSemana(i); setDia(0); }}>
                        {s.nombre || `Semana ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FILTRO DÍAS */}
              {usaNueva && dias.length > 0 && (
                <div className="filtros-block">
                  <p className="filtros-label">Día</p>
                  <div className="filtros-row">
                    {dias.map((d, i) => (
                      <button key={i} className={`filtro-btn ${diaActivo === i ? "active" : ""}`}
                        onClick={() => setDia(i)}>
                        {d.nombre || `Día ${i + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* FILTRO DÍAS fallback (rutina vieja sin estructura) */}
              {!usaNueva && DEMO_DIAS.length > 0 && (
                <div className="filtros-block">
                  <p className="filtros-label">Día</p>
                  <div className="filtros-row">
                    {DEMO_DIAS.map((d, i) => (
                      <button key={i} className={`filtro-btn ${diaActivo === i ? "active" : ""}`} onClick={() => setDia(i)}>{d}</button>
                    ))}
                  </div>
                </div>
              )}

              {ejercicios.length > 0
                ? <TablaEjercicios ejercicios={ejercicios} onVideo={setVideoModal} onNota={setNotaModal} />
                : <div className="empty-state" style={{marginTop:16}}><p className="empty-sub">No hay ejercicios para este día.</p></div>
              }
            </>
          )
        )}

        {/* TAB CHAT */}
        {tab === "chat" && (
          <>
            {mensajes.length === 0
              ? <p className="chat-empty">Aún no hay mensajes con tu profesor. ¡Empezá la conversación!</p>
              : (
                <div className="chat-wrapper">
                  {mensajes.map(m => (
                    <div key={m.id} style={{display:"flex",flexDirection:"column",alignItems:m.de === "alumno" ? "flex-end" : "flex-start"}}>
                      <div className={`chat-burbuja ${m.de === "alumno" ? "alumno" : "profe"}`}>
                        {m.mensaje}
                        <p className="chat-fecha">{m.fecha ? new Date(m.fecha).toLocaleString("es-AR",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"}) : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
            <div className="chat-input-row">
              <textarea
                className="chat-input"
                placeholder={`Escribile a ${profesor?.nombre || "tu profesor"}...`}
                value={mensajeChat}
                onChange={e => setMensajeChat(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMensaje(); } }}
                rows={1}
              />
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
          <a href="#" className="social-btn" title="Facebook">f</a>
          <a href="#" className="social-btn" title="Instagram">📷</a>
          <a href="#" className="social-btn" title="WhatsApp">💬</a>
        </div>
      </footer>

      {videoModal && <VideoModal ejercicio={videoModal} onClose={() => setVideoModal(null)} />}
      {notaModal  && <NotaModal  ejercicio={notaModal}  onClose={() => setNotaModal(null)} />}

      {modalNotif && (
        <div className="notif-modal-overlay" onClick={() => setModalNotif(false)}>
          <div className="notif-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{padding:"20px 24px 16px"}}>
              <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:600,color:"white"}}>🔔 Notificaciones</span>
              <button className="modal-close" onClick={() => setModalNotif(false)}>×</button>
            </div>
            {notificaciones.length === 0
              ? <div className="empty-notif">No tenés notificaciones aún</div>
              : notificaciones.map(n => (
                <div key={n.id} className="notif-item" 
                  onClick={() => handleClickNotif(n)}
                  style={{ cursor: "pointer", background: n.leida ? "transparent" : "rgba(0,180,216,0.05)" }}>
                  <div className={`notif-dot ${n.leida ? "leida" : ""}`} />
                  <div>
                    <p className="notif-msg" style={{ fontWeight: n.leida ? 400 : 600 }}>{n.mensaje}</p>
                    <p className="notif-fecha">{n.fecha}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}