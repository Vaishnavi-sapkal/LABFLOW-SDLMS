import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearStoredSession,
  getCurrentUser,
  login as authenticate,
  type AuthenticatedUser,
} from '../api/auth';

import type { Role } from '../types/labflow';

const roleLanding: Record<Role, string> = {
  Admin: '/dashboard',
  Doctor: '/results/verification',
  Receptionist: '/patients/register',
  'Lab Technician': '/samples',
  Patient: '/portal',
};

interface AuthContextValue {
  role: Role;
  setRole: (role: Role) => void;
  user: AuthenticatedUser | null;
  login: (email: string, password: string) => Promise<Role>;
  logout: () => void;
  updateUser: (partial: Partial<AuthenticatedUser>) => void;
  landingPath: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('Admin');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('labflow_token')) return;

    let active = true;

    const restoreSession = async () => {
      try {
        const authenticatedUser = await getCurrentUser();

        if (!active) return;

        setRole(toRole(authenticatedUser.role));
        setUser(authenticatedUser);
      } catch {
        clearStoredSession();

        if (active) {
          setUser(null);
          setRole('Admin');
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authenticate(email, password);
    const authenticatedRole = toRole(response.user.role);

    setRole(authenticatedRole);
    setUser(response.user);

    return authenticatedRole;
  };

  const logout = () => {
    clearStoredSession();
    setUser(null);
    setRole('Admin');
  };

  const updateUser = (partial: Partial<AuthenticatedUser>) => {
    setUser((current) => {
      if (!current) return current;

      const next = { ...current, ...partial };
      localStorage.setItem('labflow_user', JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      user,
      login,
      logout,
      updateUser,
      landingPath: roleLanding[role],
    }),
    [role, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

export { roleLanding };

function toRole(role: string): Role {
  const roles: Record<string, Role> = {
    admin: 'Admin',
    doctor: 'Doctor',
    receptionist: 'Receptionist',
    technician: 'Lab Technician',
    lab_technician: 'Lab Technician',
    patient: 'Patient',
  };

  const normalizedRole = roles[role.toLowerCase()];

  if (!normalizedRole) {
    throw new Error('Your account has an unsupported role.');
  }

  return normalizedRole;
}
