
'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { getFaceLandmarks, similarity } from "@/lib/faceMatcher";
import type { Employee, Afastamento } from "@/lib/data";
import { format as formatDate, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Loader2, Camera, UserCheck, AlertTriangle, ArrowLeft, LogOut } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useFirebase } from "@/firebase";
import { signOut } from 'firebase/auth';

// Main component
export default function QuiosquePage() {
  const router = useRouter();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const locationRef = useRef<{ latitude: number, longitude: number} | null>(null);
  
  const [kioskActive, setKioskActive] = useState(false);
  const [kioskUntil, setKioskUntil] = useState<Date | null>(null);
  const [tenantName, setTenantName] = useState("");
  const { auth } = useFirebase();

  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Posicione o rosto e clique para registrar.");
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [matchResult, setMatchResult] = useState<{ score: number, employee: Employee | null } | null>(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const srcObject = videoRef.current.srcObject;
      if (srcObject instanceof MediaStream) {
          srcObject.getTracks().forEach(track => track.stop());
      }
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  const handleLogout = () => {
    stopCamera();
    if (auth) {
      signOut(auth);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('kioskSession');
    }
    router.push('/quiosque/auth');
    toast({
      title: 'Sessão do Quiosque Encerrada',
      description: 'Você precisa autorizar o dispositivo novamente.',
    });
  };

  // Check Kiosk Session on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sessionData = sessionStorage.getItem('kioskSession');
    if (!sessionData) {
        router.replace('/quiosque/auth');
        return;
    }

    try {
        const { authorized, expires, companyName } = JSON.parse(sessionData);
        const expiryDate = new Date(expires);

        if (!authorized || new Date() > expiryDate) {
            sessionStorage.removeItem('kioskSession');
            router.replace('/quiosque/auth');
            return;
        }
        
        setKioskActive(true);
        setKioskUntil(expiryDate);
        setTenantName(companyName);

    } catch (e) {
        sessionStorage.removeItem('kioskSession');
        router.replace('/quiosque/auth');
    }
  }, [router]);
  
  // Initialize Camera
  const startCamera = useCallback(async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                facingMode: 'user' 
            } 
        });
        setHasCameraPermission(true);
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setIsCameraReady(true);
            };
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        setStatusMessage("Câmera não permitida. Habilite nas configurações.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    }
  }, [startCamera, stopCamera]);
  
  useEffect(() => {
      if (isCameraReady) {
          setStatusMessage("Obtendo localização...");
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  locationRef.current = {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude
                  };
                  setStatusMessage("Posicione o rosto e clique para registrar.");
              },
              (error) => {
                  setStatusMessage("Não foi possível obter a localização.");
                  toast({
                      variant: "destructive",
                      title: "Falha na Localização",
                      description: "Não foi possível obter sua localização. O ponto será registrado sem geolocalização."
                  });
              },
              { enableHighAccuracy: true }
          );
      }
  }, [isCameraReady, toast]);

  // Main 1:N face matching logic
  const scanAndMatch = async () => {
    setIsScanning(true);
    setStatusMessage("🔍 Escaneando rosto...");
    setMatchResult(null);

    const video = videoRef.current;
    if (!video || !isCameraReady || video.videoWidth === 0) {
      setStatusMessage("Falha ao capturar. Câmera não pronta.");
      setIsScanning(false);
      return;
    }

    try {
      // 1. Capture live face embedding
      const liveEmbedding = await getFaceLandmarks(video);
      if (liveEmbedding.length === 0) {
        throw new Error("Nenhum rosto nítido detectado. Aproxime-se.");
      }

      // 2. Fetch all employees from the API
      const employeesRes = await fetch('/api/v1/employees');
      if (!employeesRes.ok) {
        throw new Error("Falha ao buscar a lista de colaboradores.");
      }
      const allEmployees: Employee[] = await employeesRes.json();
      
      if (allEmployees.length === 0) {
        throw new Error("Nenhum funcionário cadastrado para esta empresa.");
      }

      // 3. 1:N Match
      let bestMatch = { score: 0, employee: null as Employee | null };

      for (const emp of allEmployees) {
        const landmarksString = emp.faceLandmarks;
        if (landmarksString) {
          try {
            const storedEmbedding: number[] = JSON.parse(landmarksString);
            if (Array.isArray(storedEmbedding) && storedEmbedding.length > 0) {
               const score = similarity(liveEmbedding, storedEmbedding);
               if (score > bestMatch.score) {
                 bestMatch = { score, employee: emp };
               }
            }
          } catch(e) {
            console.warn(`Could not parse faceLandmarks for employee ${emp.matricula}`);
          }
        }
      }
      
      setMatchResult({ score: bestMatch.score, employee: bestMatch.employee });

      // 4. Check match and save punch
      if (bestMatch.score > 0.8 && bestMatch.employee) {
        const matchedEmployee = bestMatch.employee;
        setStatusMessage(`✅ ${matchedEmployee.name} | Confiança: ${(bestMatch.score*100).toFixed(0)}%`);

        // Check for active leave (afastamento)
        const afastamentosRes = await fetch('/api/v1/occurrences');
        if (afastamentosRes.ok) {
            const allAfastamentos: Afastamento[] = await afastamentosRes.json();
            const activeLeave = allAfastamentos.find(l => l.employeeId === matchedEmployee.matricula && l.status === 'Ativo' && isWithinInterval(new Date(), { start: startOfDay(parseISO(l.startDate)), end: endOfDay(parseISO(l.endDate)) }));
            if (activeLeave) {
                throw new Error(`${matchedEmployee.name}, você está em afastamento: ${activeLeave.tipo}`);
            }
        }

        // Post to punches API
        const res = await fetch('/api/v1/punches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employeeId: matchedEmployee.matricula,
                timestamp: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                latitude: locationRef.current?.latitude,
                longitude: locationRef.current?.longitude,
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Falha ao registrar ponto.');
        }
        
        const result = await res.json();
        
        toast({ title: "Ponto Registrado!", description: `✅ ${result.punchType} para ${matchedEmployee.name} | Confiança: ${(bestMatch.score*100).toFixed(0)}%` });
        setStatusMessage(`✅ ${result.punchType} - ${matchedEmployee.name}!`);

      } else if (bestMatch.employee) {
        throw new Error(`❌ Rosto não reconhecido. (Melhor match: ${bestMatch.employee.name} com ${Math.round(bestMatch.score * 100)}%)`);
      } else {
        throw new Error(`❌ Nenhum rosto correspondente encontrado.`);
      }
    } catch (error: any) {
      console.error("ERRO DETALHADO:", error);
      setStatusMessage(error.message || "Operação falhou.");
      toast({ variant: "destructive", title: "Falha na Operação", description: error.message });
    } finally {
        setTimeout(() => {
            setIsScanning(false);
            setMatchResult(null);
            setStatusMessage("Posicione o rosto e clique para registrar.");
        }, 4000); 
    }
  };

  if (!kioskActive || !kioskUntil) {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-100">
             <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-16 w-16 animate-spin text-muted-foreground" />
                <p className="mt-4">Verificando autorização do quiosque...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-purple-600 text-white p-4 sm:p-8 relative">
       <div className="absolute top-4 left-4 flex gap-2">
        <Button asChild variant="secondary" size="icon" title="Voltar para Home">
          <Link href="/">
            <ArrowLeft />
          </Link>
        </Button>
         <Button onClick={handleLogout} variant="secondary" size="icon" title="Encerrar Sessão do Quiosque">
          <LogOut />
        </Button>
      </div>

       <div className="absolute top-4 right-4 text-right">
          <h1 className="text-xl md:text-2xl font-bold text-white/90">{tenantName}</h1>
          <p className="text-sm md:text-base text-white/80">Quiosque expira às {kioskUntil.toLocaleTimeString('pt-BR')}</p>
        </div>
      
      <div className="text-4xl md:text-6xl mb-4 md:mb-8 font-bold flex items-center gap-4">🕐 ClockWise</div>

        {isScanning ? (
            <div className="text-xl md:text-3xl mb-4 md:mb-8 animate-pulse text-center min-h-[5rem] flex items-center justify-center">{statusMessage}</div>
        ) : (
            <div className="text-lg md:text-2xl mb-4 md:mb-8 text-center min-h-[5rem] flex items-center justify-center">
                {statusMessage}
            </div>
        )}
        
        <div className="relative w-full max-w-sm md:max-w-md aspect-square">
          <video 
            ref={videoRef} 
            className="w-full h-full rounded-full object-cover"
            autoPlay
            muted
            playsInline
          />
           <canvas ref={canvasRef} className="hidden"></canvas>
          {!isCameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/50 rounded-full">
              <Loader2 className="h-10 w-10 animate-spin" />
              <p className="mt-2 font-medium">Iniciando câmera...</p>
            </div>
          )}
        </div>
        
        <button
          onClick={scanAndMatch}
          disabled={isScanning || !isCameraReady}
          className="mt-8 bg-white text-purple-600 px-10 py-5 md:px-16 md:py-6 rounded-2xl text-2xl md:text-3xl font-bold shadow-2xl hover:scale-105 transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isScanning ? <Loader2 className="h-10 w-10 animate-spin mx-auto"/> : '📸 REGISTRAR PONTO'}
        </button>
        
        {matchResult && !isScanning && (
          <div className="mt-8 text-lg md:text-xl opacity-90">
            Último Match: {Math.round(matchResult.score*100)}% {matchResult.employee ? `(${matchResult.employee.name})` : ''}
          </div>
        )}
    </div>
  );
}
