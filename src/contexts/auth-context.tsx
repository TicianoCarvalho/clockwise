'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import {
  doc,
  getDoc,
} from 'firebase/firestore';

import { auth, firestore } from '@/firebase';

interface UserData {
  uid?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  accessLevel?: string;
}

export interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  userRole: string | null;
  tenantId: string | null;
  employeeData: any | null;
  isAuthLoading: boolean;
}

export const AuthContext =
  createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {

  const [state, setState] = useState({
    user: null as User | null,
    userData: null as UserData | null,
    userRole: null as string | null,
    tenantId: null as string | null,
    employeeData: null as any,
    isAuthLoading: true,
  });

  useEffect(() => {

    if (typeof window === 'undefined') {
      setState((prev) => ({ ...prev, isAuthLoading: false }));
      return;
    }

    if (!auth || !firestore) {
      console.error('[AUTH] Firebase não inicializado');

      setState((prev) => ({
        ...prev,
        isAuthLoading: false,
      }));

      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {

      try {
        setState((prev) => ({ ...prev, isAuthLoading: true }));

        // =====================================
        // LOGOUT
        // =====================================
        if (!firebaseUser) {
          setState({
            user: null,
            userData: null,
            userRole: null,
            tenantId: null,
            employeeData: null,
            isAuthLoading: false,
          });
          return;
        }

        // =====================================
        // GLOBAL USER
        // =====================================
        const userRef = doc(firestore, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          throw new Error('Usuário não encontrado no Firestore');
        }

        const globalUserData = userSnap.data() as UserData;
        const tenantId = globalUserData?.tenantId ?? null;

        // MASTER EARLY RETURN
        if (globalUserData?.role === 'master') {
          setState({
            user: firebaseUser,
            userData: globalUserData,
            userRole: 'master',
            tenantId,
            employeeData: null,
            isAuthLoading: false,
          });
          return;
        }

        if (!tenantId) {
          throw new Error('Usuário sem tenantId');
        }

        // =====================================
        // EMPLOYEE
        // =====================================
        const employeeRef = doc(firestore, 'employees', firebaseUser.uid);
        const employeeSnap = await getDoc(employeeRef);

        let userRole: string;

        let employeeData = null;

        if (employeeSnap.exists()) {
          employeeData = employeeSnap.data();

          userRole =
            employeeData?.accessLevel ||
            globalUserData?.role ||
            'funcionario';

        } else {
          userRole = globalUserData?.role || 'admin';
        }

        setState({
          user: firebaseUser,
          userData: globalUserData,
          userRole,
          tenantId,
          employeeData,
          isAuthLoading: false,
        });

      } catch (error) {
        console.error('[AUTH CONTEXT ERROR]', error);

        setState({
          user: null,
          userData: null,
          userRole: null,
          tenantId: null,
          employeeData: null,
          isAuthLoading: false,
        });
      }
    });

    return () => unsubscribe();

  }, []);

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext deve ser usado dentro do AuthProvider');
  }

  return context;
}