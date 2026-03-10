import { useState, useEffect } from "react";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import NavBar from "../../components/NavBar";

export default function AlumnoDashboard() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [miDoc, setMiDoc] = useState(null);
  const [notificaciones, setNotificaciones] = useState([]);
  const [modalNotif, setModalNotif] = useState(false);

  useEffect(() => { if (usuario) cargarDatos(); }, [usuario]);

  const cargarDatos = async () => {
    const snap = await getDocs(query(collection(db, "usuarios"), where("uid", "==", usuario.uid)));
    if (!snap.empty) {
      const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
      setMiDoc(data);
      cargarNotificaciones(data.id);
    }
  };

  const cargarNotificaciones = async (alumnoId) => {
    const snap = await getDocs(query(collection(db, "notificaciones"), where("usuarioId", "==", alumnoId)));
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notifs.sort((a, b) => b.fecha?.localeCompare(a.fecha));
    setNotificaciones(notifs);
  };

  const marcarLeida = async (id) => {
    await updateDoc(doc(db, "notificaciones", id), { leida: true });
    cargarNotificaciones(miDoc.id);
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", minHeight: "100vh", background: "#0a0a0a", color: "white", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .hero { min-height: 100vh; position: relative; display: flex; align-items: center; overflow: hidden; }
        .hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; filter: brightness(0.6); z-index: 0; }
        .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(3,4,94,0.75) 30%, transparent 100%); z-index: 1; }
        .hero-content { position: relative; z-index: 2; padding: 0 80px; max-width: 700px; animation: fadeUp 0.9s ease forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .hero-eyebrow { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 4px; text-transform: uppercase; color: #00b4d8; margin-bottom: 20px; }
        .hero-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(60px, 8vw, 110px); line-height: 0.95; letter-spacing: 2px; color: white; margin-bottom: 28px; }
        .hero-title span { color: #00b4d8; }
        .hero-sub { font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 300; color: rgba(255,255,255,0.7); line-height: 1.7; max-width: 420px; margin-bottom: 44px; }
        .hero-cta { display: inline-flex; align-items: center; gap: 12px; background: #00b4d8; color: #03045e; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 700; padding: 16px 36px; border-radius: 50px; border: none; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 0 40px rgba(0,180,216,0.3); }
        .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 50px rgba(0,180,216,0.5); }
        .hero-cta:hover .arrow { transform: translateX(4px); }
        .arrow { transition: transform 0.2s; font-size: 18px; }
        .scroll-hint { position: absolute; bottom: 40px; left: 80px; z-index: 2; display: flex; align-items: center; gap: 10px; font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.3); animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        .scroll-line { width: 40px; height: 1px; background: rgba(255,255,255,0.3); }

        .footer { background: #000; border-top: 1px solid rgba(255,255,255,0.06); padding: 40px 60px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }
        .footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 3px; color: #00b4d8; margin-bottom: 4px; }
        .footer-copy { font-family: 'DM Sans', sans-serif; font-size: 12px; color: rgba(255,255,255,0.3); }
        .footer-socials { display: flex; gap: 14px; }
        .social-btn { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; cursor: pointer; text-decoration: none; color: rgba(255,255,255,0.5); font-size: 15px; transition: border-color 0.2s, color 0.2s; }
        .social-btn:hover { border-color: #00b4d8; color: #00b4d8; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: flex-start; justify-content: flex-end; padding: 80px 40px 0; }
        .modal-box { background: #0d0d0d; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; width: 360px; max-height: 500px; overflow-y: auto; animation: slideDown 0.2s ease; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        .modal-header { padding: 20px 24px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; justify-content: space-between; align-items: center; }
        .modal-title { font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; color: white; }
        .modal-close { background: none; border: none; color: rgba(255,255,255,0.4); cursor: pointer; font-size: 22px; transition: color 0.2s; }
        .modal-close:hover { color: white; }
        .notif-item { padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; gap: 12px; }
        .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: #00b4d8; margin-top: 6px; flex-shrink: 0; }
        .notif-dot.leida { background: transparent; border: 1px solid rgba(255,255,255,0.2); }
        .notif-msg { font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(255,255,255,0.8); line-height: 1.5; }
        .notif-fecha { font-family: 'DM Sans', sans-serif; font-size: 11px; color: rgba(255,255,255,0.3); margin-top: 4px; }
        .notif-mark { background: none; border: none; color: #00b4d8; font-family: 'DM Sans', sans-serif; font-size: 11px; cursor: pointer; margin-top: 4px; padding: 0; }
        .empty-notif { padding: 40px 24px; text-align: center; font-family: 'DM Sans', sans-serif; font-size: 14px; color: rgba(255,255,255,0.3); }

        @media (max-width: 640px) {
          .hero-content { padding: 0 28px; }
          .scroll-hint { left: 28px; }
          .footer { padding: 32px 24px; }
          .modal-overlay { padding: 80px 16px 0; }
          .modal-box { width: 100%; }
        }
      `}</style>

      <NavBar noLeidas={noLeidas} onNotifClick={() => setModalNotif(true)} activePage="" />

      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: `url(${new URL('../../assets/fondoalumno.jpg', import.meta.url).href})` }} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">Bienvenido, {miDoc?.nombre?.split(" ")[0] || "atleta"}</p>
          <h1 className="hero-title">
            Una app para<br />
            <span>facilitarte</span><br />
            tus rutinas
          </h1>
          <p className="hero-sub">Queremos ofrecerte la mayor comodidad para vos y tus rutinas</p>
          <button className="hero-cta" onClick={() => navigate("/alumno/rutina")}>
            Ir a mis rutinas <span className="arrow">→</span>
          </button>
        </div>
        <div className="scroll-hint"><div className="scroll-line" />scroll</div>
      </section>

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

      {modalNotif && (
        <div className="modal-overlay" onClick={() => setModalNotif(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🔔 Notificaciones</span>
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
                    {!n.leida && <button className="notif-mark" onClick={() => marcarLeida(n.id)}>Marcar como leída</button>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}