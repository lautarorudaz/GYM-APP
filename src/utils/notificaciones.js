import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export const crearNotificacion = async ({ usuarioId, mensaje, tipo }) => {
  await addDoc(collection(db, "notificaciones"), {
    usuarioId,
    mensaje,
    tipo,
    leida: false,
    fecha: new Date().toLocaleDateString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })
  });
};