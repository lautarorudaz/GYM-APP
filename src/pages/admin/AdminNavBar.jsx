import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminNavBar({ notificaciones = [], onMarcarLeida, onMarcarTodas, vistaActual }) {
    const navigate = useNavigate();

    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    const cerrarSesion = async () => { await signOut(auth); navigate("/"); };

    const noLeidas = notificaciones.filter(n => !n.leida).length;

    const enAlumnos = location.pathname === "/admin/alumnos";
    const enPanel = location.pathname === "/admin" && (vistaActual === "panel" || !vistaActual);
    const enProf = location.pathname === "/admin" && vistaActual === "profesores";

    const irAProfesores = () => { navigate("/admin", { state: { vista: "profesores" } }); setMenuOpen(false); };
    const irAPanel = () => { navigate("/admin", { state: { vista: "panel" } }); setMenuOpen(false); };
    const irAAlumnos = () => { navigate("/admin/alumnos"); setMenuOpen(false); };

    const links = [
        { label: "Panel", action: irAPanel, active: enPanel },
        { label: "Profesores", action: irAProfesores, active: enProf },
        { label: "Alumnos", action: irAAlumnos, active: enAlumnos },
    ];

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        .anav-link{font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.5);padding:8px 16px;border-radius:8px;cursor:pointer;border:none;background:none;transition:all 0.2s;white-space:nowrap}
        .anav-link:hover{color:white;background:rgba(255,255,255,0.06)}
        .anav-link.active{color:#00b4d8;background:rgba(0,180,216,0.1)}
        .anav-desktop{display:flex;gap:4px}
        .anav-ham{display:none;background:none;border:none;cursor:pointer;padding:6px;flex-direction:column;gap:5px}
        .anav-ham span{display:block;width:20px;height:2px;background:rgba(255,255,255,0.7);border-radius:2px;transition:all 0.25s}
        @media(max-width:680px){
          .anav-desktop{display:none!important}
          .anav-ham{display:flex!important}
        }
      `}</style>

            {/* ── TOPBAR ── */}
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, background: "rgba(10,10,10,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 20px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                     <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 3, color: "#00b4d8", cursor: "pointer", flexShrink: 0 }} onClick={irAPanel}>
                        AnimaApp
                    </span>
                </div>

                {/* Desktop nav - centro */}
                <div className="anav-desktop">
                    {links.map(({ label, action, active }) => (
                        <button key={label} className={`anav-link ${active ? "active" : ""}`} onClick={action}>{label}</button>
                    ))}
                </div>

                {/* Derecha: campana + cerrar sesión + hamburguesa */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {/* Campana */}
                    <button onClick={() => setNotifOpen(o => !o)}
                        style={{ position: "relative", background: notifOpen ? "rgba(0,180,216,0.1)" : "none", border: "none", cursor: "pointer", fontSize: 18, padding: "7px 10px", borderRadius: 8, transition: "background 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                        onMouseLeave={e => e.currentTarget.style.background = notifOpen ? "rgba(0,180,216,0.1)" : "none"}>
                        🔔
                        {noLeidas > 0 && (
                            <span style={{ position: "absolute", top: 2, right: 2, background: "#ef4444", color: "white", borderRadius: "50%", width: 16, height: 16, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
                                {noLeidas > 9 ? "9+" : noLeidas}
                            </span>
                        )}
                    </button>

                    {/* Cerrar sesión - solo desktop */}
                    <button onClick={cerrarSesion}
                        style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "7px 14px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap" }}
                        className="anav-desktop">
                        Cerrar sesión
                    </button>

                    {/* Hamburguesa */}
                    <button className="anav-ham" onClick={() => { setMenuOpen(o => !o); setNotifOpen(false); }}>
                        <span style={{ transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
                        <span style={{ opacity: menuOpen ? 0 : 1 }} />
                        <span style={{ transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
                    </button>
                </div>
            </div>

            {/* ── MENÚ MOBILE ── */}
            {menuOpen && (
                <div style={{ position: "fixed", top: 62, left: 0, right: 0, zIndex: 199, background: "rgba(10,10,10,0.98)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 4, animation: "fadeDown 0.2s ease" }}>
                    <style>{`@keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

                    {/* Logo centrado en mobile */}
                    <div style={{ textAlign: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 4, color: "#00b4d8" }}>AnimaApp</span>
                    </div>

                    {links.map(({ label, action, active }) => (
                        <button key={label} onClick={action}
                            style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: active ? "#00b4d8" : "rgba(255,255,255,0.7)", background: active ? "rgba(0,180,216,0.08)" : "none", border: "none", borderRadius: 10, padding: "13px 16px", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                            {label}
                        </button>
                    ))}

                    {/* Notificaciones en mobile */}
                    <button onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); }}
                        style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.7)", background: "none", border: "none", borderRadius: 10, padding: "13px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}>
                        🔔 Notificaciones {noLeidas > 0 && <span style={{ background: "#ef4444", color: "white", borderRadius: "50%", width: 18, height: 18, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{noLeidas}</span>}
                    </button>

                    {/* Cerrar sesión en mobile */}
                    <button onClick={cerrarSesion}
                        style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 500, color: "#ef4444", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "13px 16px", cursor: "pointer", textAlign: "left", marginTop: 8 }}>
                        Cerrar sesión
                    </button>
                </div>
            )}

            {/* ── MODAL NOTIFICACIONES ── */}
            {notifOpen && (
                <>
                    {/* Backdrop */}
                    <div style={{ position: "fixed", inset: 0, zIndex: 198, background: "transparent" }} onClick={() => setNotifOpen(false)} />

                    {/* Panel */}
                    <div style={{ position: "fixed", top: 68, right: 16, zIndex: 199, background: "#161616", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: 360, maxWidth: "calc(100vw - 32px)", maxHeight: 480, display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.6)", animation: "fadeDown 0.2s ease" }}>

                        {/* Header */}
                        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2, color: "white" }}>🔔 Actividad</span>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {noLeidas > 0 && (
                                    <button onClick={onMarcarTodas}
                                        style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, background: "none", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>
                                        Marcar todas leídas
                                    </button>
                                )}
                                <button onClick={() => setNotifOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
                            </div>
                        </div>

                        {/* Lista */}
                        <div style={{ overflowY: "auto", flex: 1, padding: "10px 12px" }}>
                            {notificaciones.length === 0
                                ? <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "28px 0" }}>No hay actividad aún.</p>
                                : notificaciones.map(n => (
                                    <div key={n.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 10px", borderRadius: 10, marginBottom: 4, background: n.leida ? "transparent" : "rgba(0,180,216,0.04)", border: n.leida ? "1px solid transparent" : "1px solid rgba(0,180,216,0.12)", transition: "background 0.2s" }}>
                                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: n.leida ? "rgba(255,255,255,0.15)" : "#00b4d8", flexShrink: 0, marginTop: 5 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "white", fontWeight: n.leida ? 400 : 500, margin: 0, lineHeight: 1.4 }}>{n.mensaje}</p>
                                            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{n.fecha}</p>
                                        </div>
                                        {!n.leida && (
                                            <button onClick={() => onMarcarLeida(n.id)}
                                                style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)", borderRadius: 6, padding: "3px 8px", fontFamily: "'DM Sans',sans-serif", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>
                                                ✓
                                            </button>
                                        )}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </>
            )}
        </>
    );
}