import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export const crearNotificacion = async ({ usuarioId, mensaje, tipo, extraData = {} }) => {
  await addDoc(collection(db, "notificaciones"), {
    usuarioId,
    mensaje,
    tipo,
    leida: false,
    extraData,
    fecha: new Date().toISOString()
  });
};