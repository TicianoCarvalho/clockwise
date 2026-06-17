"use client";

import { useEffect, useState } from "react";
// Importe suas instâncias seguras
import { firestore } from "@/lib/data";
import { doc, getDoc } from "firebase/firestore";

export default function WhatsappWidget() {
  const [settings, setSettings] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // 1️⃣ GABARITO: Garante que o componente só execute no navegador
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Se não estiver no navegador ou o firestore não existir (como no build), aborte!
    if (!mounted || !firestore) return;

    const fetchSettings = async () => {
      try {
        const docRef = doc(firestore, "settings", "whatsapp");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (error) {
        // Log simples e seguro, sem disparar loops ou estados repetidos
        console.warn("Aguardando inicialização do suporte...");
      }
    };

    fetchSettings();
  }, [mounted]); // Executa apenas após o mount seguro

  // Se não estiver montado no navegador ou não tiver dados, não renderiza nada na tela
  if (!mounted || !settings) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* O design do seu botão de WhatsApp aqui */}
      <a href={`https://wa.me/${settings.number}`} target="_blank" rel="noreferrer">
        {/* Ícone */}
      </a>
    </div>
  );
}