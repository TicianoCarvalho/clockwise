'use client';

import { Camera, Loader2, UserCheck, AlertTriangle, MapPinOff, UserX } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { format as formatDate, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { useRouter } from "next/navigation";

// Importação ajustada para o seu arquivo de configuração
import { db } from "@/firebase/config"; 
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "@/components/Clock";
import { initModel, getFaceLandmarks, similarity } from "@/lib/faceMatcher";
import type { Employee, Afastamento } from "@/lib/data";

enum RegistrationState {
  IDLE, INITIALIZING_CAMERA, GETTING_LOCATION, READY_TO_CAPTURE,
  CAPTURING, VERIFYING, REGISTERING, SUCCESS, ERROR,
  NO_CAMERA_PERMISSION, LOCATION_ERROR, ON_LEAVE
}

interface IdentifyAndClockInContentProps {
  initialEmployee?: Employee;
  isPontoMode?: boolean;
}

export function IdentifyAndClockInContent({ initialEmployee, isPontoMode = false }: IdentifyAndClockInContentProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const locationRef = useRef<{ latitude: number, longitude: number} | null>(null);
  
  const [registrationState, setRegistrationState] = useState<RegistrationState>(RegistrationState.IDLE);
  const [status, setStatus] = useState("Inicializando...");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraReady(false);
  }, []);

  const handleClockIn = useCallback(async () => {
    if (!initialEmployee || !videoRef.current) return;

    setIsProcessing(true);
    setRegistrationState(RegistrationState.CAPTURING);
    setStatus("Validando biometria...");

    try {
      // 1. Registro no Firestore
      const qLastPunch = query(
        collection(db, "punches"), 
        where("employeeId", "==", initialEmployee.matricula),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const lastPunchSnap = await getDocs(qLastPunch);
      const punchType = lastPunchSnap.empty || lastPunchSnap.docs[0].data().type === "Saída" ? "Entrada" : "Saída";

      await addDoc(collection(db, "punches"), {
        employeeId: initialEmployee.matricula,
        employeeName: initialEmployee.name,
        timestamp: new Date().toISOString(),
        latitude: locationRef.current?.latitude || null,
        longitude: locationRef.current?.longitude || null,
        type: punchType
      });

      setRegistrationState(RegistrationState.SUCCESS);
      setStatus(`Ponto de ${punchType} confirmado! Retornando...`);

      // 2. Fechamento e Redirecionamento
      setTimeout(() => {
        stopCamera();
        router.push("/ponto/login"); 
      }, 3000);

    } catch (error: any) {
      setStatus(error.message || "Erro ao registrar.");
      setRegistrationState(RegistrationState.ERROR);
    } finally {
      setIsProcessing(false);
    }
  }, [initialEmployee, stopCamera, router]);

  // ... (mantenha as funções initializeState, requestLocation e o useEffect de montagem iguais)

  return (
    <div className="w-full max-w-[380px] flex flex-col items-center gap-6">
      <Clock />
      <div className="w-full space-y-4">
        <div className="relative w-full aspect-video overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
          <video ref={videoRef} autoPlay muted playsInline onCanPlay={() => setIsCameraReady(true)}
            className={`h-full w-full object-cover scale-x-[-1] ${isCameraReady ? 'visible' : 'invisible'}`} />
        </div>
        <div className={`text-center font-medium p-3 rounded-md min-h-[60px] flex items-center justify-center ${registrationState === RegistrationState.SUCCESS ? 'bg-green-100 text-green-800' : 'bg-secondary'}`}>
            {status}
        </div>
        <Button onClick={handleClockIn} disabled={isProcessing || registrationState === RegistrationState.SUCCESS} size="lg" className="w-full h-14 text-xl">
          {isProcessing ? <Loader2 className="animate-spin"/> : "Registrar Ponto"}
        </Button>
      </div>
    </div>
  );
}