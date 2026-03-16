import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProfesorDashboard from "./pages/profesor/ProfesorDashboard";
import AlumnoDashboard from "./pages/alumno/AlumnoDashboard";
import PerfilAlumno from "./pages/alumno/PerfilAlumno";
import RutinaAlumno from "./pages/alumno/RutinaAlumno";
import AlumnosAdmin from "./pages/admin/AlumnosAdmin";
import EjerciciosAdmin from "./pages/admin/EjerciciosAdmin";
import RutinasAdmin from "./pages/admin/RutinasAdmin";
import DescargaRutina from "./pages/DescargaRutina";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/rutina/:rutinaId" element={<DescargaRutina />} />
          <Route path="/admin" element={<ProtectedRoute rol="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/profesor" element={<ProtectedRoute rol="profesor"><ProfesorDashboard /></ProtectedRoute>} />
          <Route path="/alumno" element={<ProtectedRoute rol="alumno"><AlumnoDashboard /></ProtectedRoute>} />
          <Route path="/alumno/perfil" element={<ProtectedRoute rol="alumno"><PerfilAlumno /></ProtectedRoute>} />
          <Route path="/alumno/rutina" element={<ProtectedRoute rol="alumno"><RutinaAlumno /></ProtectedRoute>} />
          <Route path="/admin/alumnos" element={<ProtectedRoute rol="admin"><AlumnosAdmin /></ProtectedRoute>} />
          <Route path="/admin/ejercicios" element={<ProtectedRoute rol="admin"><EjerciciosAdmin /></ProtectedRoute>} />
          <Route path="/admin/rutinas" element={<ProtectedRoute rol="admin"><RutinasAdmin /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;