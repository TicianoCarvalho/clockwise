'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { getFaceLandmarks, similarity, initModel } from "@/lib/faceMatcher";
import type { Employee, Afastamento } from "@/lib/data";
import { format as formatDate, parseISO, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Loader2, CameraOff } from "lucide-react";
import { useFirebase } from "@/firebase";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";

export default function KioskePage() {
    const router = useRouter();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState("Inicializando...");
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const { firestore } = useFirebase();

    // Check auth and load data
    useEffect(() => {
        const checkAuthAndLoad = async () => {
            const deviceId = localStorage.getItem('kioskDeviceId');
            const tenantId = localStorage.getItem('kioskTenantId');

            if (typeof window === 'undefined' || !deviceId || tenantId !== '43058506000164') {
                toast({ variant: 'destructive', title: 'Quiosque não autorizado.', description: 'Redirecionando para autenticação.' });
                router.replace('/quiosque/auth');
                return;
            }

            if (!firestore) {
                setStatus("Conectando ao banco de dados...");
                return;
            }

            setIsAuthorized(true);
            setStatus("Carregando modelo de IA...");
            await initModel();
            
            setStatus("Carregando colaboradores...");
            try {
                const employeesRef = collection(firestore, 'tenants', '43058506000164', 'employees');
                const q = query(employeesRef, where("status", "==", "Ativo"));
                const querySnapshot = await getDocs(q);
                const employeesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Employee));
                setAllEmployees(employeesData);
                setStatus("Toque na tela para registrar o ponto");
            } catch (err) {
                console.error(err);
                setStatus("Erro ao carregar colaboradores.");
                toast({ variant: 'destructive', title: 'Erro de Dados', description: 'Não foi possível carregar a lista de colaboradores.' });
            }
        };

        checkAuthAndLoad();
    }, [firestore, router, toast]);

    // Start camera
    useEffect(() => {
        if (!isAuthorized) return;

        let stream: MediaStream;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: 'user' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                setStatus("Câmera não permitida. Habilite nas configurações do navegador.");
                console.error(err);
            }
        };
        startCamera();

        return () => {
            stream?.getTracks().forEach(track => track.stop());
        };
    }, [isAuthorized]);

    // 1:N Face Recognition Logic
    const handleRecognition = useCallback(async () => {
        if (isProcessing || allEmployees.length === 0 || !firestore) return;
        
        setIsProcessing(true);
        setStatus("Analisando...");

        if (!videoRef.current || videoRef.current.videoWidth === 0) {
            setStatus("Câmera não está pronta. Tente novamente.");
            setIsProcessing(false);
            return;
        }

        try {
            const liveEmbedding = await getFaceLandmarks(videoRef.current);
            if (liveEmbedding.length === 0) {
                throw new Error("Nenhum rosto detectado. Aproxime-se da câmera.");
            }

            let bestMatch = { score: 0, employee: null as Employee | null };

            for (const emp of allEmployees) {
                if (emp.faceLandmarks) {
                    try {
                        const storedEmbedding: number[] = JSON.parse(emp.faceLandmarks);
                        if (Array.isArray(storedEmbedding) && storedEmbedding.length > 0) {
                            const score = similarity(liveEmbedding, storedEmbedding);
                            if (score > bestMatch.score) {
                                bestMatch = { score, employee: emp };
                            }
                        }
                    } catch (e) {
                        console.warn(`Could not parse faceLandmarks for employee ${emp.matricula}`);
                    }
                }
            }

            if (bestMatch.score > 0.8 && bestMatch.employee) {
                const matchedEmployee = bestMatch.employee;
                setStatus(`Olá, ${matchedEmployee.name}!`);

                const punchesRef = collection(firestore, 'tenants', '43058506000164', 'punches');
                await addDoc(punchesRef, {
                    employeeId: matchedEmployee.matricula,
                    timestamp: formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                    locationName: 'Kioske',
                });
                
                toast({ title: "Ponto Registrado!", description: `Bem-vindo(a), ${matchedEmployee.name}!` });
            } else {
                throw new Error(`Rosto não reconhecido. Tente novamente.`);
            }
        } catch (error: any) {
            console.error("ERRO KIOSKE:", error);
            setStatus(error.message);
            toast({ variant: "destructive", title: "Falha no Reconhecimento", description: error.message });
        } finally {
            setTimeout(() => {
                setIsProcessing(false);
                setStatus("Toque na tela para registrar o ponto");
            }, 3000);
        }
    }, [isProcessing, allEmployees, firestore, toast]);

    if (!isAuthorized) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white">
                <Loader2 className="animate-spin h-12 w-12 mb-4" />
                <p>Verificando autorização do quiosque...</p>
            </div>
        );
    }
    
    return (
        <div className="h-screen w-screen bg-black relative cursor-pointer" onClick={handleRecognition}>
            <video
                ref={videoRef}
                className="h-full w-full object-cover"
                autoPlay
                muted
                playsInline
            />
             {videoRef.current?.srcObject === null && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/70">
                    <CameraOff className="h-24 w-24 mb-4" />
                    <h2 className="text-2xl font-bold">Câmera Indisponível</h2>
                    <p>{status}</p>
                 </div>
             )}
            <div className="absolute inset-0 flex items-end justify-center pb-12 pointer-events-none">
                <div className="bg-black/50 text-white text-2xl font-semibold p-4 rounded-lg shadow-lg">
                    {isProcessing ? <Loader2 className="animate-spin" /> : status}
                </div>
            </div>
        </div>
    );
}
