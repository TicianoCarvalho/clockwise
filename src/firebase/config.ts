import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  projectId: "studio-7509623301-a3df4",
  appId: "1:770216868327:web:d4c6d31d124c9a8e00a542",
  apiKey: "AIzaSyDMQkhxwcwRA99NaX4DGcKqQ-HyuLhkztg",
  authDomain: "studio-7509623301-a3df4.firebaseapp.com",
  storageBucket: "studio-7509623301-a3df4.appspot.com",
  messagingSenderId: "770216868327"
};

// Inicializa o Firebase (evita duplicidade)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Exporta o banco de dados Firestore com o nome 'db'
export const db = getFirestore(app);