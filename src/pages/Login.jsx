import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import gymBg from "../assets/bg-gym.jpeg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { rol } = useAuth();

  useEffect(() => {
    if (rol === "admin") navigate("/admin");
    if (rol === "profesor") navigate("/profesor");
    if (rol === "alumno") navigate("/alumno");
  }, [rol, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Credenciales incorrectas. Verificá tu email y contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }

        /* ── FONDO FOTO ── */
        .login-bg {
          position: fixed; inset: 0; z-index: 0;
          background-image: url(${gymBg});
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
        }

        /*
          Oscurecimiento radial:
          - Centro muy oscuro (donde está el modal)
          - Se va aclarando hacia los bordes
          - Los costados quedan con la foto casi sin filtro
        */
        .login-bg::after {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(
            ellipse 50% 65% at 50% 50%,
            rgba(0, 0, 0, 0.85) 0%,
            rgba(0, 0, 0, 0.65) 30%,
            rgba(0, 0, 0, 0.25) 60%,
            rgba(0, 0, 0, 0.08) 100%
          );
        }

        /* ── LAYOUT ── */
        .login-wrapper {
          position: relative; z-index: 1;
          width: 100%; min-height: 100vh;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }

        /* ── CARD ── */
        .login-card {
          width: 100%; max-width: 420px;
          background: rgba(6, 6, 6, 0.68);
          backdrop-filter: blur(24px) saturate(1.2);
          -webkit-backdrop-filter: blur(24px) saturate(1.2);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          padding: 48px 40px;
          animation: fadeUp 0.5s ease forwards;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,180,216,0.05);
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── LOGO ── */
        .login-logo {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px; letter-spacing: 5px;
          color: #00b4d8; text-align: center; margin-bottom: 4px;
        }
        .login-tagline {
          font-size: 12px; color: rgba(255,255,255,0.3);
          text-align: center; letter-spacing: 2px;
          text-transform: uppercase; margin-bottom: 36px;
        }
        .login-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px; letter-spacing: 2px;
          color: white; margin-bottom: 6px;
        }
        .login-sub {
          font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 28px;
        }

        /* ── INPUTS ── */
        .input-group { margin-bottom: 16px; position: relative; }
        .input-label {
          font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
          color: rgba(255,255,255,0.35); margin-bottom: 8px; display: block;
        }
        .login-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 14px 16px;
          color: white; font-family: 'DM Sans', sans-serif;
          font-size: 15px; outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .login-input:focus {
          border-color: #00b4d8;
          background: rgba(0,180,216,0.04);
        }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }

        .pass-wrapper { position: relative; }
        .pass-wrapper .login-input { padding-right: 48px; }
        .reveal-pass {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.3); font-size: 18px;
          transition: color 0.2s; line-height: 1;
        }
        .reveal-pass:hover { color: #00b4d8; }

        /* ── ERROR ── */
        .login-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 10px; padding: 12px 16px;
          font-size: 13px; color: #fca5a5;
          margin-bottom: 20px; text-align: center;
        }

        /* ── BOTÓN ── */
        .login-btn {
          width: 100%; background: #00b4d8; color: #03045e;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 700;
          padding: 15px; border-radius: 12px; border: none;
          cursor: pointer; margin-top: 8px;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          letter-spacing: 0.5px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,180,216,0.4);
        }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(3,4,94,0.3);
          border-top-color: #03045e;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          text-align: center; margin-top: 28px;
          font-size: 11px; color: rgba(255,255,255,0.2); letter-spacing: 1px;
        }

        /* En móvil: overlay parejo para legibilidad */
        @media (max-width: 480px) {
          .login-card { padding: 36px 24px; }
          .login-bg::after {
            background: rgba(0, 0, 0, 0.55);
          }
        }
      `}</style>

      <div className="login-bg" />

      <div className="login-wrapper">
        <div className="login-card">

          <p className="login-logo">AnimaApp</p>
          <p className="login-tagline">Gimnasio Anima</p>

          <h2 className="login-title">Iniciar Sesión</h2>
          <p className="login-sub">Ingresá tus credenciales para continuar</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">Correo electrónico</label>
              <input
                className="login-input"
                placeholder="tucorreo@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label">Contraseña</label>
              <div className="pass-wrapper">
                <input
                  className="login-input"
                  placeholder="••••••••"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="reveal-pass" onClick={() => setShowPass(!showPass)}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <><div className="spinner" /> Ingresando...</> : "Entrar →"}
            </button>
          </form>

          <p className="login-footer">
            ¿Problemas para ingresar? Contactá a tu gimnasio.
          </p>
        </div>
      </div>
    </div>
  );
}