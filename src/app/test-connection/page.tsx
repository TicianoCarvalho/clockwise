'use client'
import { useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';

export default function TestPage() {
  const [status, setStatus] = useState("Verificando...");

  useEffect(() => {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      // ... adicione as outras variáveis aqui
    };

    try {
      if (!getApps().length) {
        initializeApp(firebaseConfig);
      }
      setStatus("✅ Firebase Client inicializado com sucesso!");
    } catch (error) {
      setStatus(`❌ Erro na inicialização: ${error.message}`);
    }
  }, []);

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">Validação ClockWise Web</h1>
      <p className="mt-4">{status}</p>
      <p className="text-sm text-gray-500 mt-2">
        Projeto ID: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "Não encontrado"}
      </p>
    </div>
  );
}