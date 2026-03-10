import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";
import { crearNotificacion } from "../../utils/notificaciones";

export default function PerfilAlumno() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [miDoc, setMiDoc] = useState(null);
  const [profesor, setProfesor] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [modalNotif, setModalNotif] = useState(false);
  const [modalCredenciales, setModalCredenciales] = useState(false);
  const [modalComentario, setModalComentario] = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);
  const [comentario, setComentario] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [reaccion, setReaccion] = useState(null); // 'like' | 'dislike' | null

  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  const cargarDatos = async () => {
    const snap = await getDocs(query(collection(db, "usuarios"), where("uid", "==", usuario.uid)));
    if (snap.empty) return;
    const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
    setMiDoc(data);
    setReaccion(data.reaccionProfesor || null);
    if (data.profesorId) {
      const p = await getDoc(doc(db, "usuarios", data.profesorId));
      if (p.exists()) setProfesor({ id: p.id, ...p.data() });
    }
    const notifSnap = await getDocs(query(collection(db, "notificaciones"), where("usuarioId", "==", snap.docs[0].id)));
    setNotificaciones(notifSnap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const enviarComentario = async () => {
    if (!comentario.trim()) return;
    setEnviando(true);
    await addDoc(collection(db, "comentarios"), {
      mensaje: comentario,
      alumnoId: miDoc.id,
      alumnoNombre: anonimo ? "Anónimo" : miDoc.nombre,
      profesorId: miDoc.profesorId,
      fecha: new Date().toLocaleDateString("es-AR")
    });
    await crearNotificacion({
      usuarioId: miDoc.profesorId,
      mensaje: anonimo ? "Un alumno te dejó un comentario anónimo" : `${miDoc.nombre} te dejó un nuevo comentario`,
      tipo: "nuevo_comentario"
    });
    setComentario(""); setAnonimo(false); setEnviando(false);
    setModalComentario(false);
  };

  const toggleReaccion = async (tipo) => {
    const nueva = reaccion === tipo ? null : tipo;
    setReaccion(nueva);
    await updateDoc(doc(db, "usuarios", miDoc.id), { reaccionProfesor: nueva });
    if (nueva && miDoc.profesorId) {
      await crearNotificacion({
        usuarioId: miDoc.profesorId,
        mensaje: nueva === "like"
          ? (anonimo ? "Un alumno te dio un 👍" : `${miDoc.nombre} te dio un 👍`)
          : (anonimo ? "Un alumno te dio un 👎" : `${miDoc.nombre} te dio un 👎`),
        tipo: "reaccion"
      });
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .page-content { padding: 100px 60px 60px; max-width: 900px; margin: 0 auto; flex: 1; width: 100%; }

        /* ── SECCIÓN PERFIL ── */
        .section-label { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 24px; }

        .perfil-top { display: flex; gap: 40px; align-items: flex-start; margin-bottom: 32px; }

        .foto-box { width: 160px; height: 160px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #111; gap: 8px; }
        .foto-box img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }
        .foto-sin-foto { font-family: 'DM Sans', sans-serif; font-size: 11px; color: rgba(255,255,255,0.25); letter-spacing: 1px; text-align: center; padding: 0 12px; }
        .foto-icon { font-size: 36px; opacity: 0.2; }

        .perfil-info { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .info-row { padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .info-row:nth-child(odd) { padding-right: 24px; }
       .info-val { font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 500; color: white; }
.info-val.empty { color: rgba(255,255,255,0.2); font-style: italic; font-size: 15px; }
.info-key { font-family: 'DM Sans', sans-serif; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 6px; }
        .info-val.accent { color: #00b4d8; }
        

        .cred-btn { margin-top: 28px; display: inline-flex; align-items: center; gap: 10px; background: none; border: 1px solid rgba(0,180,216,0.4); color: #00b4d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; padding: 12px 28px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .cred-btn:hover { background: rgba(0,180,216,0.08); border-color: #00b4d8; }

        .divider { width: 100%; height: 1px; background: rgba(255,255,255,0.06); margin: 40px 0; }

        /* ── SECCIÓN PROFESOR ── */
        .profesor-section { display: flex; flex-direction: column; align-items: center; }
        .prof-foto-box { width: 140px; height: 140px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #111; gap: 8px; margin-bottom: 14px; overflow: hidden; }
        .prof-foto-box img { width: 100%; height: 100%; object-fit: cover; }
        .prof-nombre { font-family: 'Bebas Neue', sans-serif; font-size: 34px; letter-spacing: 2px; color: white; margin-bottom: 24px; }

        .acciones-prof { display: flex; gap: 20px; }
.accion-btn { width: 80px; height: 80px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; gap: 6px; padding: 12px; }
        .accion-btn:hover { border-color: #00b4d8; background: rgba(0,180,216,0.07); }
        .accion-btn.active-like { border-color: #22c55e; background: rgba(34,197,94,0.1); }
        .accion-btn.active-dislike { border-color: #ef4444; background: rgba(239,68,68,0.1); }
        .accion-icon { font-size: 26px; }
.accion-label { font-family: 'DM Sans', sans-serif; font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 1px; text-transform: uppercase; }


        .anonimo-row { display: flex; align-items: center; gap: 10px; margin-top: 16px; cursor: pointer; }
        .anonimo-check { width: 18px; height: 18px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; display: flex; align-items: center; justify-content: center; background: none; transition: all 0.2s; flex-shrink: 0; }
        .anonimo-check.checked { background: #00b4d8; border-color: #00b4d8; }
        .anonimo-label { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(255,255,255,0.4); }

        /* ── FOOTER ── */
        .footer { background: #000; border-top: 1px solid rgba(255,255,255,0.06); padding: 40px 60px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; color: #00b4d8; margin-bottom: 4px; }
        .footer-copy { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(255,255,255,0.3); }
        .footer-socials { display: flex; gap: 14px; }
        .social-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; text-decoration: none; color: rgba(255,255,255,0.5); font-size: 15px; transition: border-color 0.2s, color 0.2s; }
        .social-btn:hover { border-color: #00b4d8; color: #00b4d8; }

        /* ── MODALES ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.15s ease; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .modal-box { background: #111; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; width: 100%; max-width: 440px; overflow: hidden; animation: slideUp 0.2s ease; }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .modal-header { padding: 24px 28px 20px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; justify-content: space-between; align-items: center; }
        .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 2px; color: white; }
        .modal-close { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 24px; line-height: 1; transition: color 0.2s; }
        .modal-close:hover { color: white; }
        .modal-body { padding: 28px; }

        /* credenciales */
        .cred-row { margin-bottom: 20px; }
        .cred-label { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 8px; }
        .cred-value { font-family: 'DM Sans', sans-serif; font-size: 15px; color: white; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
        .reveal-btn { background: none; border: none; color: #00b4d8; font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; letter-spacing: 1px; }

        /* comentario modal */
        .comment-textarea { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; color: white; font-family: 'DM Sans', sans-serif; font-size: 14px; line-height: 1.6; min-height: 120px; resize: none; outline: none; transition: border-color 0.2s; }
        .comment-textarea:focus { border-color: rgba(0,180,216,0.4); }
        .comment-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .modal-anonimo { display: flex; align-items: center; gap: 10px; margin: 16px 0; cursor: pointer; }
        .send-btn { width: 100%; background: #00b4d8; color: #03045e; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; padding: 14px; border-radius: 10px; border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; margin-top: 4px; }
        .send-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,180,216,0.35); }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* notif modal */
        .notif-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: flex-start; justify-content: flex-end; padding: 80px 40px 0; }
        .notif-modal-box { background: #0d0d0d; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 360px; max-height: 500px; overflow-y: auto; }
        .notif-item { padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; gap: 12px; }
        .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: #00b4d8; margin-top: 6px; flex-shrink: 0; }
        .notif-dot.leida { background: transparent; border: 1px solid rgba(255,255,255,0.2); }
        .notif-msg { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.5; }
        .notif-fecha { font-family: 'DM Sans', sans-serif; font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px; }
        .empty-notif { padding: 40px 24px; text-align: center; font-family: 'DM Sans', sans-serif; font-size: 14px; color: rgba(255,255,255,0.3); }

        @media (max-width: 640px) {
          .page-content { padding: 90px 20px 40px; }
          .perfil-top { flex-direction: column; align-items: center; gap: 24px; }
          .foto-box { width: 120px; height: 120px; }
          .perfil-info { grid-template-columns: 1fr; width: 100%; }
          .info-row:nth-child(odd) { padding-right: 0; }
          .footer { padding: 32px 20px; }
          .notif-modal-overlay { padding: 80px 16px 0; }
          .notif-modal-box { width: 100%; }
        }
      `}</style>

      <NavBar noLeidas={noLeidas} onNotifClick={() => setModalNotif(true)} activePage="perfil" />

      <div className="page-content">

        {/* ── PERFIL ── */}
        <p className="section-label">Perfil de Gimnasio</p>

        <div className="perfil-top">
          {/* Foto alumno */}
          <div className="foto-box">
            {miDoc?.foto
              ? <img src={miDoc.foto} alt="foto" />
              : <>
                  <span className="foto-icon">👤</span>
                  <span className="foto-sin-foto">Sin foto cargada</span>
                </>
            }
          </div>

          {/* Datos */}
          <div className="perfil-info">
            <div className="info-row">
              <p className="info-key">Nombre</p>
              <p className={`info-val ${miDoc?.nombre ? "" : "empty"}`}>{miDoc?.nombre || "—"}</p>
            </div>
            <div className="info-row">
              <p className="info-key">Fecha de alta</p>
              <p className={`info-val ${miDoc?.fechaAlta ? "accent" : "empty"}`}>{miDoc?.fechaAlta || "Sin cargar"}</p>
            </div>
            <div className="info-row">
              <p className="info-key">Apellido</p>
              <p className={`info-val ${miDoc?.apellido ? "" : "empty"}`}>{miDoc?.apellido || "Sin cargar"}</p>
            </div>
            <div className="info-row">
              <p className="info-key">Nacimiento</p>
              <p className={`info-val ${miDoc?.nacimiento ? "" : "empty"}`}>{miDoc?.nacimiento || "Sin cargar"}</p>
            </div>
            <div className="info-row">
              <p className="info-key">Sede</p>
              <p className={`info-val ${miDoc?.sede ? "accent" : "empty"}`}>{miDoc?.sede || "Sin cargar"}</p>
            </div>
            <div className="info-row">
              <p className="info-key">Edad</p>
              <p className={`info-val ${miDoc?.edad ? "" : "empty"}`}>{miDoc?.edad || "Sin cargar"}</p>
            </div>
          </div>
        </div>

        <button className="cred-btn" onClick={() => setModalCredenciales(true)}>
          🔐 Ver Credenciales
        </button>

        <div className="divider" />

        {/* ── PROFESOR ── */}
        <p className="section-label">Profesor a cargo</p>

        <div className="profesor-section">
          <div className="prof-foto-box">
            {profesor?.foto
              ? <img src={profesor.foto} alt="foto profesor" />
              : <>
                  <span className="foto-icon" style={{ fontSize: 32, opacity: 0.2 }}>👤</span>
                  <span className="foto-sin-foto">Sin foto cargada</span>
                </>
            }
          </div>

          <p className="prof-nombre">{profesor?.nombre || "Sin asignar"}</p>

          <div className="acciones-prof">
            <button className="accion-btn" onClick={() => setModalComentario(true)}>
              <span className="accion-icon">💬</span>
              <span className="accion-label">Comentar</span>
            </button>
            <button className={`accion-btn ${reaccion === "like" ? "active-like" : ""}`} onClick={() => toggleReaccion("like")}>
              <span className="accion-icon">👍</span>
              <span className="accion-label">Me gusta</span>
            </button>
            <button className={`accion-btn ${reaccion === "dislike" ? "active-dislike" : ""}`} onClick={() => toggleReaccion("dislike")}>
              <span className="accion-icon">👎</span>
              <span className="accion-label">No me gusta</span>
            </button>
          </div>

          <div className="anonimo-row" onClick={() => setAnonimo(!anonimo)}>
            <div className={`anonimo-check ${anonimo ? "checked" : ""}`}>
              {anonimo && <span style={{ color: "#03045e", fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            <span className="anonimo-label">Mantener mi anonimidad</span>
          </div>
        </div>

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

      {/* MODAL CREDENCIALES */}
      {modalCredenciales && (
        <div className="modal-overlay" onClick={() => setModalCredenciales(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Credenciales</span>
              <button className="modal-close" onClick={() => setModalCredenciales(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="cred-row">
                <p className="cred-label">Correo electrónico</p>
                <div className="cred-value">{usuario?.email}</div>
              </div>
              <div className="cred-row">
                <p className="cred-label">Contraseña</p>
                <div className="cred-value">
                  <span>{mostrarPass ? (miDoc?.passVisible || "No disponible") : "••••••••••"}</span>
                  <button className="reveal-btn" onClick={() => setMostrarPass(!mostrarPass)}>
                    {mostrarPass ? "Ocultar" : "Revelar"}
                  </button>
                </div>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.2)", lineHeight: 1.5, marginTop: 8 }}>
                Si necesitás cambiar tu contraseña, contactá al administrador del gimnasio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMENTARIO */}
      {modalComentario && (
        <div className="modal-overlay" onClick={() => setModalComentario(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Comentar al Profesor</span>
              <button className="modal-close" onClick={() => setModalComentario(false)}>×</button>
            </div>
            <div className="modal-body">
              <textarea
                className="comment-textarea"
                placeholder={`Escribile a ${profesor?.nombre || "tu profesor"}...`}
                value={comentario}
                onChange={e => setComentario(e.target.value)}
              />
              <div className="modal-anonimo" onClick={() => setAnonimo(!anonimo)}>
                <div className={`anonimo-check ${anonimo ? "checked" : ""}`}>
                  {anonimo && <span style={{ color: "#03045e", fontSize: 12, fontWeight: 700 }}>✓</span>}
                </div>
                <span className="anonimo-label">Mantener mi anonimidad</span>
              </div>
              <button className="send-btn" onClick={enviarComentario} disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar comentario →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOTIFICACIONES */}
      {modalNotif && (
        <div className="notif-modal-overlay" onClick={() => setModalNotif(false)}>
          <div className="notif-modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: "20px 24px 16px" }}>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 600, color: "white" }}>🔔 Notificaciones</span>
              <button className="modal-close" onClick={() => setModalNotif(false)}>×</button>
            </div>
            {notificaciones.length === 0
              ? <div className="empty-notif">No tenés notificaciones aún</div>
              : notificaciones.map(n => (
                <div key={n.id} className="notif-item">
                  <div className={`notif-dot ${n.leida ? "leida" : ""}`} />
                  <div>
                    <p className="notif-msg">{n.mensaje}</p>
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