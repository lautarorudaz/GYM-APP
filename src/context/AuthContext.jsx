import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "usuarios"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setRol(snap.docs[0].data().rol);
        }
        setUsuario(user);
      } else {
        setUsuario(null);
        setRol(null);
      }
      setCargando(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, rol, cargando }}>
      {!cargando && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}