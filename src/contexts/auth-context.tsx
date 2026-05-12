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

import {
  auth,
  firestore,
} from '@/firebase';

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
  createContext<AuthContextType | undefined>(
    undefined
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {

  const [user, setUser] =
    useState<User | null>(null);

  const [userData, setUserData] =
    useState<UserData | null>(null);

  const [userRole, setUserRole] =
    useState<string | null>(null);

  const [tenantId, setTenantId] =
    useState<string | null>(null);

  const [employeeData, setEmployeeData] =
    useState<any | null>(null);

  const [isAuthLoading, setIsAuthLoading] =
    useState(true);

  useEffect(() => {

    // SSR SAFE
    if (typeof window === 'undefined') {
      setIsAuthLoading(false);
      return;
    }

    // FIREBASE SAFE
    if (!auth || !firestore) {

      console.error(
        '[AUTH] Firebase não inicializado'
      );

      setIsAuthLoading(false);

      return;
    }

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {

          setIsAuthLoading(true);

          try {

            // =====================================
            // LOGOUT
            // =====================================

            if (!firebaseUser) {

              setUser(null);

              setUserData(null);

              setUserRole(null);

              setTenantId(null);

              setEmployeeData(null);

              setIsAuthLoading(false);

              return;
            }

            // =====================================
            // LOGIN
            // =====================================

            setUser(firebaseUser);

            // =====================================
            // GLOBAL USER
            // =====================================

            const userRef = doc(
              firestore,
              'users',
              firebaseUser.uid
            );

            const userSnap =
              await getDoc(userRef);

            if (!userSnap.exists()) {

              throw new Error(
                'Usuário não encontrado no Firestore'
              );
            }

            const globalUserData =
              userSnap.data() as UserData;

            setUserData(globalUserData);

            const currentTenantId =
              globalUserData?.tenantId || null;

            setTenantId(currentTenantId);

            // =====================================
            // MASTER
            // =====================================

            if (
              globalUserData?.role === 'master'
            ) {

              setUserRole('master');

              setEmployeeData(null);

              setIsAuthLoading(false);

              return;
            }

            // =====================================
            // VALIDATE TENANT
            // =====================================

            if (!currentTenantId) {

              throw new Error(
                'Usuário sem tenantId'
              );
            }

            // =====================================
            // EMPLOYEE ROOT COLLECTION
            // =====================================

            const employeeRef = doc(
              firestore,
              'employees',
              firebaseUser.uid
            );

            const employeeSnap =
              await getDoc(employeeRef);

            // =====================================
            // EMPLOYEE FOUND
            // =====================================

            if (employeeSnap.exists()) {

              const empData =
                employeeSnap.data();

              setEmployeeData(empData);

              setUserRole(
                empData?.accessLevel ||
                globalUserData?.role ||
                'funcionario'
              );

            } else {

              // =====================================
              // FALLBACK ADMIN
              // =====================================

              setEmployeeData(null);

              setUserRole(
                globalUserData?.role ||
                'admin'
              );
            }

          } catch (error) {

            console.error(
              '[AUTH CONTEXT ERROR]',
              error
            );

            // RESET SAFE
            setUser(null);

            setUserData(null);

            setTenantId(null);

            setUserRole(null);

            setEmployeeData(null);

          } finally {

            setIsAuthLoading(false);
          }
        }
      );

    return () => unsubscribe();

  }, []);

  return (

    <AuthContext.Provider
      value={{
        user,
        userData,
        userRole,
        tenantId,
        employeeData,
        isAuthLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {

  const context =
    useContext(AuthContext);

  if (!context) {

    throw new Error(
      'useAuthContext deve ser usado dentro do AuthProvider'
    );
  }

  return context;
}