import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, rol }) {
  const { usuario, rol: rolUsuario } = useAuth();

  if (!usuario) return <Navigate to="/" />;
  if (rol && rolUsuario !== rol) return <Navigate to="/" />;

  return children;
}