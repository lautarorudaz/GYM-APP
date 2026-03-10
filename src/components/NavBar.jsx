import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function NavBar({ noLeidas = 0, onNotifClick, activePage = "" }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const cerrarSesion = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        .nav-blur {
          position: fixed;
          top: 12px; left: 20px; right: 20px;
          z-index: 100;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          padding: 0 32px;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 3px;
          color: #00b4d8;
          cursor: pointer;
          z-index: 2;
        }

        /* DESKTOP */
        .nav-desktop {
          display: flex;
          align-items: center;
          gap: 36px;
        }

        .nav-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          letter-spacing: 0.5px;
          transition: color 0.2s;
          background: none;
          border: none;
        }
        .nav-link:hover, .nav-link.active { color: #00b4d8; }

        .notif-btn {
          position: relative;
          background: none;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 50%;
          width: 38px; height: 38px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: white; font-size: 16px;
          transition: border-color 0.2s;
        }
        .notif-btn:hover { border-color: #00b4d8; }

        .notif-badge {
          position: absolute;
          top: -4px; right: -4px;
          background: #00b4d8;
          color: #03045e;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; font-weight: 700;
          border-radius: 50%;
          width: 17px; height: 17px;
          display: flex; align-items: center; justify-content: center;
        }

        .logout-btn {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500;
          background: none;
          border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.7);
          padding: 8px 18px;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn:hover { border-color: #ef4444; color: #ef4444; }

        /* HAMBURGER */
        .hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 4px;
          z-index: 2;
        }
        .hamburger span {
          display: block;
          width: 24px; height: 2px;
          background: white;
          border-radius: 2px;
          transition: all 0.3s ease;
        }
        .hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* MOBILE MENU */
        .mobile-menu {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(3, 4, 30, 0.97);
          backdrop-filter: blur(20px);
          z-index: 99;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          animation: menuFadeIn 0.25s ease;
        }

        @keyframes menuFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        .mobile-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          letter-spacing: 4px;
          color: #00b4d8;
          margin-bottom: 40px;
        }

        .mobile-link {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 48px;
          letter-spacing: 3px;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: color 0.2s, transform 0.2s;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .mobile-link:hover, .mobile-link.active {
          color: white;
          transform: translateX(6px);
        }
        .mobile-link.active { color: #00b4d8; }

        .mobile-divider {
          width: 40px; height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 16px 0;
        }

        .mobile-logout {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 500;
          color: rgba(255,255,255,0.4);
          background: none;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 12px 32px;
          border-radius: 30px;
          cursor: pointer;
          margin-top: 20px;
          transition: all 0.2s;
        }
        .mobile-logout:hover { border-color: #ef4444; color: #ef4444; }

        .mobile-notif-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mobile-notif-badge {
          background: #00b4d8;
          color: #03045e;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 700;
          border-radius: 50%;
          width: 24px; height: 24px;
          display: flex; align-items: center; justify-content: center;
        }

        /* RESPONSIVE */
        @media (max-width: 640px) {
          .nav-desktop { display: none; }
          .hamburger { display: flex; }
          .nav-blur { justify-content: space-between; }
          /* Logo centrado en mobile */
          .nav-logo {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className="nav-blur">
        <div className="nav-logo" onClick={() => navigate("/alumno")}>AnimaApp</div>

        {/* DESKTOP */}
        <div className="nav-desktop">
          <span className={`nav-link ${activePage === "perfil" ? "active" : ""}`} onClick={() => navigate("/alumno/perfil")}>Perfil</span>
          <span className={`nav-link ${activePage === "rutina" ? "active" : ""}`} onClick={() => navigate("/alumno/rutina")}>Rutinas</span>
          <button className="notif-btn" onClick={onNotifClick}>
            🔔{noLeidas > 0 && <span className="notif-badge">{noLeidas}</span>}
          </button>
          <button className="logout-btn" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>

        {/* HAMBURGER */}
        <button className={`hamburger ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </nav>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="mobile-menu">
          <p className="mobile-logo">AnimaApp</p>

          <button className={`mobile-link ${activePage === "perfil" ? "active" : ""}`} onClick={() => { navigate("/alumno/perfil"); setMenuOpen(false); }}>
            Perfil
          </button>

          <button className={`mobile-link ${activePage === "rutina" ? "active" : ""}`} onClick={() => { navigate("/alumno/rutina"); setMenuOpen(false); }}>
            Rutinas
          </button>

          <button className="mobile-link" onClick={() => { onNotifClick(); setMenuOpen(false); }}>
            <span className="mobile-notif-row">
              Notificaciones
              {noLeidas > 0 && <span className="mobile-notif-badge">{noLeidas}</span>}
            </span>
          </button>

          <div className="mobile-divider" />

          <button className="mobile-logout" onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      )}
    </>
  );
}