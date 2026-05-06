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
    if (typeof window === 'undefined' || !auth) {
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthLoading(true);

      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // 🔐 1. Buscar usuário global (para pegar tenantId)
          const userDocRef = doc(firestore, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            throw new Error("Usuário sem registro no Firestore");
          }

          const userData = userDoc.data();
          const tId = userData.tenantId;

          if (!tId) {
            throw new Error("Usuário sem tenantId definido");
          }

          setTenantId(tId);

          // 🔥 2. Buscar employee DENTRO DO TENANT (CORRETO)
          const empDocRef = doc(
            firestore,
            "tenants",
            tId,
            "employees",
            firebaseUser.uid
          );

          const empDoc = await getDoc(empDocRef);

          if (empDoc.exists()) {
            const empData = empDoc.data();
            setEmployeeData(empData);
            setUserRole(empData.accessLevel || 'user');
          } else {
            // fallback para admin
            setUserRole(userData.role || 'admin');
          }

        } else {
          // logout
          setUser(null);
          setUserRole(null);
          setTenantId(null);
          setEmployeeData(null);
        }

      } catch (error) {
        console.error("Erro no auth-context:", error);

        // 🔴 IMPORTANTE: resetar estado para evitar app quebrado
        setUser(null);
        setTenantId(null);
        setUserRole(null);
        setEmployeeData(null);

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
  if (!context) {
    throw new Error('useAuthContext deve ser usado dentro de um AuthProvider');
  }
  return context;
}