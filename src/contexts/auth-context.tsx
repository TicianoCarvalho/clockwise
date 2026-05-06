'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/firebase';

export interface AuthContextType {
  user: User | null;
  userRole: string | null;
  tenantId: string | null;
  isAuthLoading: boolean;
  employeeData: any | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // Escuta a mudança de estado de autenticação (Login/Logout)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthLoading(true);
      
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // 1. Busca o perfil global para saber a qual empresa (tenant) ele pertence
          const userDocRef = doc(firestore, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const tId = userData.tenantId;
            setTenantId(tId || null);

            // 2. Busca o nível de acesso real dentro da subcoleção de funcionários
            if (tId) {
              const empDocRef = doc(firestore, "tenants", tId, "employees", firebaseUser.uid);
              const empDoc = await getDoc(empDocRef);

              if (empDoc.exists()) {
                const empData = empDoc.data();
                setEmployeeData(empData);
                // Define o papel do usuário no sistema com base no nível de acesso da empresa
                setUserRole(empData.accessLevel || 'user');
              } else {
                // Caso o usuário tenha tenantId mas não tenha registro de funcionário (erro de consistência)
                setUserRole(userData.role || 'user');
                setEmployeeData(null);
              }
            } else if (userData.role === 'master') {
              // Caso especial para administradores do próprio SaaS (ClockWise Master)
              setUserRole('master');
              setEmployeeData(null);
            }
          }
        } else {
          // Reset completo ao deslogar
          setUser(null);
          setUserRole(null);
          setTenantId(null);
          setEmployeeData(null);
        }
      } catch (error) {
        console.error("Erro ao carregar contexto de autenticação:", error);
        // Em caso de erro, garantimos que o sistema não trave em "carregando"
        setUserRole(null);
      } finally {
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userRole, 
        tenantId, 
        isAuthLoading, 
        employeeData 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
  }
  return context;
}