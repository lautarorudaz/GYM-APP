import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBTkzhobqVqIjxLSWdl45JqeHeEuh7eMbI",
  authDomain: "gym-app-636cb.firebaseapp.com",
  projectId: "gym-app-636cb",
  storageBucket: "gym-app-636cb.firebasestorage.app",
  messagingSenderId: "697391339586",
  appId: "1:697391339586:web:a40c037a91535c8508b5db"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

const appSecundaria = initializeApp(firebaseConfig, "secundaria");
export const authSecundaria = getAuth(appSecundaria);