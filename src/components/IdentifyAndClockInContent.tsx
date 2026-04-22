'use client';

import { Camera, Loader2, UserCheck, AlertTriangle, MapPinOff, UserX } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// Configurações do Firebase
import { db } from "@/firebase/config"; 
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "@/components/Clock";
import type { Employee } from "@/lib/data";

enum RegistrationState {
  IDLE, INITIALIZING_CAMERA, READY_TO_CAPTURE,
  CAPTURING, SUCCESS, ERROR
}

interface IdentifyAndClockInContentProps {
  initialEmployee: Employee; // Removido o '?' pois o pai garante o envio
  isPontoMode?: boolean;
}

export function IdentifyAndClockInContent({ initialEmployee, isPontoMode = false }: IdentifyAndClockInContentProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [registrationState, setRegistrationState] = useState<RegistrationState>(RegistrationState.IDLE);
  const [status, setStatus] = useState("Inicializando câmera...");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  // --- CORREÇÃO 1: INICIALIZAÇÃO DA CÂMERA ---
  useEffect(() => {
    async function startCamera() {
      setRegistrationState(RegistrationState.INITIALIZING_CAMERA);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setRegistrationState(RegistrationState.READY_TO_CAPTURE);
          setStatus("Câmera pronta. Posicione seu rosto.");
        }
      } catch (err) {
        console.error("Erro ao acessar câmera:", err);
        setStatus("Erro: Câmera não permitida ou não encontrada.");
        setRegistrationState(RegistrationState.ERROR);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraReady(false);
  }, []);

  // --- CORREÇÃO 2: CAMINHO DO FIRESTORE (MULTI-TENANT) ---
  const handleClockIn = useCallback(async () => {
    if (!initialEmployee || !initialEmployee.tenantId) {
      setStatus("Erro: Empresa não identificada.");
      return;
    }

    setIsProcessing(true);
    setRegistrationState(RegistrationState.CAPTURING);
    setStatus("Registrando ponto...");

    try {
      // O caminho deve ser: tenants/{id}/punches
      const punchesRef = collection(db, "tenants", initialEmployee.tenantId, "punches");

      // Busca o último ponto para alternar entre Entrada e Saída
      const qLastPunch = query(
        punchesRef, 
        where("employeeId", "==", initialEmployee.id), // Usando o ID interno
        orderBy("timestamp", "desc"),
        limit(1)
      );
      
      const lastPunchSnap = await getDocs(qLastPunch);
      const punchType = lastPunchSnap.empty || lastPunchSnap.docs[0].data().type === "Saída" ? "Entrada" : "Saída";

      // Gravação no banco
      await addDoc(punchesRef, {
        employeeId: initialEmployee.id,
        employeeName: initialEmployee.name,
        timestamp: new Date().toISOString(),
        type: punchType,
        device: "Mobile/Web"
      });

      setRegistrationState(RegistrationState.SUCCESS);
      setStatus(`Ponto de ${punchType} confirmado!`);

      setTimeout(() => {
        stopCamera();
        router.push("/ponto/login"); 
      }, 3000);

    } catch (error: any) {
      console.error("Erro Firestore:", error);
      setStatus("Erro de permissão no banco de dados.");
      setRegistrationState(RegistrationState.ERROR);
    } finally {
      setIsProcessing(false);
    }
  }, [initialEmployee, stopCamera, router]);

  return (
    <div className="w-full max-w-[380px] flex flex-col items-center gap-6">
      <Clock />
      <div className="w-full space-y-4">
        <div className="relative w-full aspect-video overflow-hidden rounded-lg border bg-black flex items-center justify-center">
          {/* O videoRef DEVE ser atribuído aqui */}
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            onCanPlay={() => setIsCameraReady(true)}
            className={`h-full w-full object-cover scale-x-[-1] ${isCameraReady ? 'opacity-100' : 'opacity-0 transition-opacity'}`} 
          />
          {!isCameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-xs">Iniciando vídeo...</span>
            </div>
          )}
        </div>

        <div className={`text-center font-medium p-3 rounded-md min-h-[60px] flex items-center justify-center text-sm ${
          registrationState === RegistrationState.SUCCESS ? 'bg-green-100 text-green-800' : 
          registrationState === RegistrationState.ERROR ? 'bg-red-100 text-red-800' : 'bg-secondary'
        }`}>
            {status}
        </div>

        <Button 
          onClick={handleClockIn} 
          disabled={isProcessing || !isCameraReady || registrationState === RegistrationState.SUCCESS} 
          size="lg" 
          className="w-full h-14 text-xl"
        >
          {isProcessing ? <Loader2 className="animate-spin mr-2"/> : <Camera className="mr-2" />}
          Registrar Ponto
        </Button>
      </div>
    </div>
  );
}